const express = require('express')
const router = express.Router()
const Users = require('../models/user')
const LoginActivity = require('../models/loginActivity')
const xid = require('xid-js')
const useragent = require('express-useragent')
const jwt = require('jsonwebtoken')
const config = require('config')
// const UserIntellisense = require('../models/userIntellisense')
var getIP = require('ipware')().get_ip
const { validationResult } = require('express-validator')
const passport = require('passport')
// const socialLoginValidator = require('../validators/socialLogins')
const FacebookTokenStrategy = require('passport-facebook-token')
var GoogleTokenStrategy = require('passport-token-google2').Strategy

passport.use(
  'facebook',
  new FacebookTokenStrategy(
    {
      clientID: config.client_ID,
      clientSecret: config.client_Secret,
    },
    function (accessToken, refreshToken, profile, done) {
      return done(null, profile)
    }
  )
)

passport.use(
  'google-token',
  new GoogleTokenStrategy(
    {
      clientID: config.client_ID,
   
      clientSecret: config.client_Secret,
    },
    function (accessToken, refreshToken, profile, done) {
      done(null, profile)
    }
  )
)
passport.serializeUser(function (user, done) {
  done(null, user.uid)
})
passport.deserializeUser(function (uid, done) {
  Users.findOne({ uid: uid }, function (err, user) {
    done(err, user)
  })
})
function getNonExpiringToken(email, role, suspended) {
 
  const payload = {
    user: email,
    role: role,
    suspended: suspended,
  }
  var token = jwt.sign(payload, config.secret, {})
  return token
}
function facebookLogin(req, res, next) {
  const errors = validationResult(req)
  if (errors.errors.length !== 0) {
    return res.send({ message: 5001, errors: errors.errors })
  }
  
  var source = req.headers['user-agent']
  var ua = useragent.parse(source)
  var obj = JSON.parse(JSON.stringify(ua))
  var ipInfo = getIP(req)
  // var User = new Users()
  passport.authenticate('facebook', function (err, profile, info) {
    if (err) return res.send({ message: 5007, err })
    // if (profile.emails.value === '') return res.send({ message: 5062 })
    var emails = []
    // profile.emails.forEach((item) => {
    //   emails.push(item.value)
    // })
    Users.findOneAndUpdate(
      { email: emails, role: 1 },
      { $set: { facebookId: profile.id } },
      { new: true },
      (err, user) => {
        if (err) return res.send({ message: 5063 })
        if (!user) {
          // ('User is saved in FacebookAndGoogleLogin')
          // there should be on field about social login whether registration process is complete or incomplete
          // var tempToken = getNonExpiringToken(profile.emails.value, 1, null)
          var detailsForLoginActivity = {
            name: profile.displayName,
            // email: profile.emails[0].value,
            role: 1,
            // firstName: profile.displayName,
            // token: tempToken,
            // image: profile.photos[0].value,
            deviceId: obj.source,
            suspended: false,
            loginType: profile.provider,
            // notificationStatus: req.body.notificationStatus,
            // notificationKey: req.body.notificationKey,
            facebookId: profile.id,
            ipAddress: ipInfo.clientIp,
            isRegistered: false,
            createdAt: new Date().getTime(),
            updatedAt: new Date().getTime(),
          }
          var userDetails = {
            // email: profile.emails[0].value,
            role: 1,
            name: profile.displayName,
            displayName: profile.displayName,
            // token: tempToken,
            loginType: profile.provider,
            // image: profile.photos[0].value,
            deviceId: obj.source,
            facebookId: profile.id,
            ipAddress: ipInfo.clientIp,
            session: req.session.sessionId,
            phone: new Date().getTime().toString() + profile.displayName,
          }
          saveSocialUser(userDetails, (err, data) => {
            if (err) return res.send(err)
            return res.send({ message: 5005, token: data })
          })
        } else {
          var token = getNonExpiringToken(
            user.email,
            1,
            user.suspended,
            user.subRole,
            user.merchantId
          )
          user.token = token
          var userDetailsForLoginActivity = {
            name: user.name,
            email: user.email,
            mobile: user.phone,
            image: user.image,
            role: user.role,
            token: user.token,
            facebookId: profile.id,
            deviceId: req.session.sessionId,
            suspended: user.suspended,
            loginType: profile.provider,
            notificationStatus: req.body.notificationStatus,
            notificationKey: req.body.notificationKey,
            ipAddress: ipInfo.clientIp,
            createdAt: new Date().getTime(),
            updatedAt: new Date().getTime(),
            session: req.session.sessionId,
          }
          saveLoginActivity(userDetailsForLoginActivity, (err, data) => {
            console.log(err)
            if (err) return res.send(err)
            console.log({ message: 5005, token: user.token })
            return res.send({ message: 5005, token: user.token })
          })
        }
      }
    )
  })(req, res, next)
}

//google login
function googleLogin(req, res, next) {
  const errors = validationResult(req)
  if (errors.errors.length !== 0) {
    return res.send({ message: 5001, errors: errors.errors })
  }
  var source = req.headers['user-agent']
  var ua = useragent.parse(source)
  var obj = JSON.parse(JSON.stringify(ua))
  var ipInfo = getIP(req)
  passport.authenticate('google-token', function (err, profile, info) {
    if (err) return res.send({ message: '5007',err })
    if (profile.emails[0].value === '') return res.send({ message: '5062' })
     var emails = []
    profile.emails.forEach((item) => {
      emails.push(item.value)
    })
    Users.findOneAndUpdate(
      { email: emails, role: 1 },
      { $set: { googleId: profile.id } },
      { new: true },
      (err, user) => {
        if (err) return res.send({ message: 5063 })
        if (!user) {
          var tempToken = getNonExpiringToken(profile.emails[0].value, 1, null)
          var DetailsForLoginActivity = {
            name: profile.name.givenName,
            email: profile.emails[0].value,
            role: 1,
            firstName: profile.name.displayName,
            token: tempToken,
            image: profile._json.picture,
            suspended: false,
            deviceId: obj.source,
            googleId: profile.id,
            loginType: profile.provider,
            notificationStatus: req.body.notificationStatus,
            notificationKey: req.body.notificationKey,
            ipAddress: ipInfo.clientIp,
            isRegistered: false,
            createdAt: new Date().getTime(),
            updatedAt: new Date().getTime(),
            isAffiliated: req.body.isAffiliated,
            userId: req.body.userId,
            merchantId: req.body.merchantId,
            path: req.body.path,
          }
          var userDetails = {
            email: profile.emails[0].value,
            role: 1,
            name: profile.name.givenName + ' ' + profile.name.familyName,
            phone: new Date().getTime().toString() + profile.name.givenName,
            displayName: profile.displayName,
            googleId: profile.id,
            loginType: 'google',
            image: profile._json.picture,
            deviceId: obj.source,
            token: tempToken,
            ipAddress: ipInfo.clientIp,
            session: req.session.sessionId,
            isAffiliated: req.body.isAffiliated,
            userId: req.body.userId,
            merchantId: req.body.merchantId,
            path: req.body.path,
            //paisa:(user.count+1)*jorkhiha
          }
          saveSocialUser(userDetails, (err, data) => {
            if (err) return res.send(err)
            // saveLoginActivity(DetailsForLoginActivity, (err, data) => {
            //   if (err) return res.send(err)
            //   return res.send({ message: 5005, token: userDetails.token })
            // })
            return res.send(data )
          })
        } else {
          console.log('User found', user)
          var token = getNonExpiringToken(
            user.email,
            1,
            user.suspended,
            user.subRole,
            user.merchantId
            )
          user.token = token
          var userDetailsForLoginActivity = {
            name: user.name,
            email: user.email,
            mobile: user.phone,
            role: user.role,
            image: user.image,
            token: token,
            deviceId: req.session.sessionId,
            suspended: user.suspended,
            googleId: profile.id,
            loginType: 'google',
            notificationStatus: req.body.notificationStatus,
            notificationKey: req.body.notificationKey,
            ipAddress: ipInfo.clientIp,
            createdAt: new Date().getTime(),
            updatedAt: new Date().getTime(),
            session: req.session.sessionId,
            isAffiliated: user.isAffiliated,
            userId: user.userId,
            merchantId: user.merchantId,
            path: user.path,
          }
          saveLoginActivity(userDetailsForLoginActivity, (err, data) => {
            if (err) return res.send(err)
            return res.send({ message: '5005', token: user.token })
          })
        }
      }
    )
  })(req, res, next)
}
function saveSocialUser(userData, _callback) {
  var user = new Users()
  // var userIntellisense = new UserIntellisense(userData)
  user.name = userData.name
  user.loginType = userData.loginType
  user.email = userData.email
  user.image = userData.image
  if (userData.facebookId) {
    user.facebookId = userData.facebookId
  } else {
    user.googleId = userData.googleId
  }
  user.active = true
  user.role = userData.role
  user.token = userData.token
  user.deviceId = userData.deviceId
  user.phone = userData.phone
  var password = xid.next()
  user.password = password
  userData.password = password
  var ipInfo = userData.ipAddress
  user.isAffiliated = userData.isAffiliated
  user.userId = userData.userId
  user.merchantId = userData.merchantId
  user.path = userData.path
  user.save((err, user) => {
    if (err) {
      return _callback({ message: 5002, err: err })
    } else {
      Users.findOne(
        { email: userData.email },
        {
          email: 1,
          role: 1,
          name: 1,
          image: 1,
          password: 1,
          subRole: 1,
          phone: 1,
          merchantId: 1,
        },
        (err, user) => {
          if (err) return _callback({ message: 5002, err })
          if (!user) return _callback({ message: 6114, err })
          var token = getNonExpiringToken(
            user.email,
            user.role,
            user.suspended,
            user.subRole,
            user.merchantId
          )
          var userJson = user.toJSON()
          delete userJson._id
          var login = new LoginActivity(userJson)
          login.ipAddress = ipInfo.clientIp
          login.deviceId = userData.session
          login.token = token
          login.save((err, login) => {
            if (err) return _callback({ message: 5002, err })
            return _callback(null, {
              message: 5005,
              token: token,
              email: user.email,
            })
          })
        }
      )
    }
  })
}

function saveLoginActivity(detailsForLoginActivity, _callback) {
  LoginActivity.findOneAndUpdate(
    {
      email: detailsForLoginActivity.email,
      deviceId: detailsForLoginActivity.deviceId,
    },
    detailsForLoginActivity,
    { upsert: true },
    (err, user) => {
      if (err) return _callback({ message: 5063 })
      return _callback({
        message: 5005,
        token: detailsForLoginActivity.token,
      })
      // var newBody = {
      //   email: detailsForLoginActivity.email,
      //   token: detailsForLoginActivity.token,
      //   deviceId: detailsForLoginActivity.deviceId,
      //   ipAddress: detailsForLoginActivity.ipAddress,
      // }
      // request(
      //   {
      //     url: config.loginUrl,
      //     method: config.method,
      //     headers: config.headers,
      //     body: newBody,
      //     json: true,
      //   },
      //   (error, resp, body) => {
      //   console.log('errrr', body)
      //   console.log('errrr', resp)
      //     if (error) return _callback({ message: 5002, error })
      //     console.log(body.message)
      //     if (resp.statusCode !== 200) return _callback(null, true)
      //     // TODO: before deployment reverse the comment lines
      //     if (body.message !== 5060) return _callback(body)
      //     return _callback(null, true)
      //   }
      // )
    }
  )
}
router.post(
  '/facebookLogin',
  // socialLoginValidator.validate('socialLogin'),
  facebookLogin
)
router.post(
  '/googleLogin',
  // socialLoginValidator.validate('socialLogin'),
  googleLogin
)
module.exports = { router }





// const express = require('express')
// const router = express.Router()
// const Users = require('../models/user')
// const xid = require('xid-js')
// const jwt = require('jsonwebtoken')
// const { validationResult } = require('express-validator')
// const passport = require('passport')
// let config = require ('config') 
// const FacebookTokenStrategy = require('passport-facebook-token')

// var GoogleTokenStrategy = require('passport-token-google2').Strategy

// passport.use(
//   'facebook',
//   new FacebookTokenStrategy(
//     {
//       clientID: config.client_ID,
//       clientSecret: config.client_Secret,
//     },
//     function (accessToken, refreshToken, profile, done) {
//         // let user = {
//         //     'email': profile.emails[0].value,
//         //     'name': profile.name.Name ,
//         //     'id': profile.id,
//         //     'token': accessToken
//         //   };
//         Users.findOrCreate({ facebookId: profile.id }, function (err, user) {
//             return done(null, profile.user)
//           });
//     }
//   )
// )

// passport.use(
//   'google-token',
//   new GoogleTokenStrategy(
//     {
//       clientID: config.client_ID,
//       clientSecret: config.client_Secret,
//     },
//     function (accessToken, refreshToken, profile, done) {
//       done(null, profile)
//     }
//   )
// )
// passport.serializeUser(function (user, done) {
//   done(null, user.uid)
// })
// passport.deserializeUser(function (uid, done) {
//   Users.findOne({ uid: uid }, function (err, user) {
//     done(err, user)
//   })
// })


// function getNonExpiringToken(email, role, suspended) {
//   console.log('getNonExpiringToken')
//   console.log(role)
//   const payload = {
//     user: email,
//     role: role,
//     suspended: suspended,
//   }
//   var token = jwt.sign(payload, config.secret, {})
//   return token
// }
// function facebookLogin(req, res, next) {
//   console.log(req.body)
//   var source = req.headers['user-agent']
//   var ua = useragent.parse(source)
//   var obj = JSON.parse(JSON.stringify(ua))
//   var User = new Users()
// passport.authenticate('facebook', {session: false}, function (err, user, info) {

//     console.log('insde endpoint', user);
//     //console.log('error', err, 'user', user, 'info', info);
//     if (err) {
//       if (err.oauthError) {
//         var oauthError = JSON.parse(err.oauthError.data);
//         res.status(401).send(oauthError.error.message);
//       } else {
//         res.send(err);
//       }
//     } else {
//       // do the logic of actual end point here.
//       res.send(user);

//     }
//   })(req, res,next);
// }
// //google login
// function googleLogin(req, res, next) {
//   const errors = validationResult(req)
//   if (errors.errors.length !== 0) {
//     return res.send({ message: 5001, errors: errors.errors })
//   }
// //   var source = req.headers['user-agent']
// //   var ua = useragent.parse(source)
// //   var obj = JSON.parse(JSON.stringify(ua))
// //   var ipInfo = getIP(req)
//   passport.authenticate('google-token', function (err, profile, info) {
//     if (err) return res.send({ message: '5007',err })
//     if (profile.emails[0].value === '') return res.send({ message: '5062' })
//      var emails = []
//     profile.emails.forEach((item) => {
//       emails.push(item.value)
//     })
//     Users.findOneAndUpdate(
//       { email: emails, role: 1 },
//       { $set: { googleId: profile.id } },
//       { new: true },
//       (err, user) => {
//         if (err) return res.send({ message: 5063 })
//         if (!user) {
//           var tempToken = getNonExpiringToken(profile.emails[0].value, 1, null)
//           var DetailsForLoginActivity = {
//             name: profile.name.givenName,
//             email: profile.emails[0].value,
//             role: 1,
//             firstName: profile.name.displayName,
//             token: tempToken,
//             image: profile._json.picture,
//             suspended: false,
//             deviceId: obj.source,
//             googleId: profile.id,
//             loginType: profile.provider,
//             notificationStatus: req.body.notificationStatus,
//             notificationKey: req.body.notificationKey,
//             ipAddress: ipInfo.clientIp,
//             isRegistered: false,
//             createdAt: new Date().getTime(),
//             updatedAt: new Date().getTime(),
//             isAffiliated: req.body.isAffiliated,
//             userId: req.body.userId,
//             merchantId: req.body.merchantId,
//             path: req.body.path,
//           }
//           var userDetails = {
//             email: profile.emails[0].value,
//             role: 1,
//             name: profile.name.givenName + ' ' + profile.name.familyName,
//             phone: new Date().getTime().toString() + profile.name.givenName,
//             displayName: profile.displayName,
//             googleId: profile.id,
//             loginType: 'google',
//             image: profile._json.picture,
//             deviceId: obj.source,
//             token: tempToken,
//             ipAddress: ipInfo.clientIp,
//             session: req.session.sessionId,
//             isAffiliated: req.body.isAffiliated,
//             userId: req.body.userId,
//             merchantId: req.body.merchantId,
//             path: req.body.path,
//             //paisa:(user.count+1)*jorkhiha
//           }
//           saveSocialUser(userDetails, (err, data) => {
//             if (err) return res.send(err)
//             // saveLoginActivity(DetailsForLoginActivity, (err, data) => {
//             //   if (err) return res.send(err)
//             //   return res.send({ message: 5005, token: userDetails.token })
//             // })
//             return res.send(data )
//           })
//         } else {
//           console.log('User found', user)
//           var token = getNonExpiringToken(
//             user.email,
//             1,
//             user.suspended,
//             user.subRole,
//             user.merchantId
//             )
//           user.token = token
//           var userDetailsForLoginActivity = {
//             name: user.name,
//             email: user.email,
//             mobile: user.phone,
//             role: user.role,
//             image: user.image,
//             token: token,
//             deviceId: req.session.sessionId,
//             suspended: user.suspended,
//             googleId: profile.id,
//             loginType: 'google',
//             notificationStatus: req.body.notificationStatus,
//             notificationKey: req.body.notificationKey,
//             ipAddress: ipInfo.clientIp,
//             createdAt: new Date().getTime(),
//             updatedAt: new Date().getTime(),
//             session: req.session.sessionId,
//             isAffiliated: user.isAffiliated,
//             userId: user.userId,
//             merchantId: user.merchantId,
//             path: user.path,
//           }
//           saveLoginActivity(userDetailsForLoginActivity, (err, data) => {
//             if (err) return res.send(err)
//             return res.send({ message: '5005', token: user.token })
//           })
//         }
//       }
//     )
//   })(req, res, next)
// }
// router.post(
//   '/facebookLogin',
// //   socialLoginValidator.validate('socialLogin'),
//   facebookLogin
// )
// router.post(
//   '/googleLogin',
// //   socialLoginValidator.validate('socialLogin'),
//   googleLogin
// )
// module.exports = { router }


