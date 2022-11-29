const express = require('express')
const router = express.Router()
const socialLoginValidator = require('../validators/socialLogins')
const useragent = require('express-useragent')
const config = require('config') // we load the db location from the JSON files
const UserModule = require('../models/user')
const Users = UserModule.user
const messages = require('../messages/messages')
const { validationResult } = require('express-validator')
let passport = require('passport')
let FacebookTokenStrategy = require('passport-facebook-token')
let Xid = require('xid-js')
const TwitterTokenStrategy = require('passport-twitter-token')
// const AppleStrategy = require('passport-apple-token')
var GoogleTokenStrategy = require('passport-token-google2').Strategy
let referralCodeGenerator = require('referral-code-generator')
const AppleStrategy = require('passport-apple-token');
const { generateLoginHash } = require('./user')
const { generateRandom } = require('./otp')
var fs = require('fs')
var path = require('path')

passport.use(
  'facebook',
  new FacebookTokenStrategy(
    {
      clientID: config.clientIDFacebook,
      clientSecret: config.clientSecretFacebook,
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
      clientID: [
        config.clientID_1,
        config.clientID_2,
        config.clientID_3,
        // config.clientID_4,
      ],
      clientSecret: config.clientSecretGoogle,
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

function facebookLogin(req, res, next) {
  const errors = validationResult(req)
  if (errors.errors.length !== 0) {
    return res.send({ message: 5001, errors: errors.errors })
  }
  passport.authenticate('facebook', function (err, profile, info) {
    console.log('facebookErr = ', err)
    console.log('Facebook profile = ', profile)
    if (err || !profile) return res.send({ message: messages.ACCESS_TOKEN_EXPIRED })
    console.log('profile.emails[0].value = ', profile.emails[0].value)
    if (profile.emails[0].value === '') return res.send({ message: messages.EMAIL_NEEDED_FOR_FB_GOOGLE })

    Users.findOne({ email: profile.emails[0].value }, (err, user) => {
      console.log( 'err',err)
      if (err) return res.send({ message: messages.ERROR_USERS_DB })
      if (!user) {
        console.log('newUser')
        var refCode = referralCodeGenerator.alphaNumeric('lowercase', 2, 2)
        var userDetails = {
          email: profile.emails[0].value,
          loginType: profile.provider,
          userId: Xid.next(),
          MSISDN: '60' + new Date().getTime().toString(),
          password: 'tempPassword',
          referralCode: refCode,
          isXoxUser: false,
          isSuspended: false,
          status: 2, // MSISDN Unverified
          resetPassword: true,
          profileId: '',
          facebookId: profile.id,
          emailVerified: 0,
          middlewareId : generateRandom(),
          role: 1,
          lEmail: profile.emails[0].value.toLowerCase(),
          randomMsisdn: true,
        }
        saveSocialUser(userDetails, (err, user) => {
          console.log('userErr', err)
          if (err) return res.send(err)
          req.loginType = 'facebook'
          generateLoginHash(user, req, (err, loginSuccess) => {
            console.log('loginSuccessErr', err)
            if (err) return res.send(err)
            return res.send(loginSuccess)
          })
        })
      } else {
        req.loginType = 'facebook'
        generateLoginHash(user, req, (err, loginSuccess) => {
          if (err) return res.send(err)
          console.log('loginSuccessErr =', err)
          return res.send(loginSuccess)
        })
      }
    })
  })(req, res, next)
}

function googleLogin(req, res, next) {
  const errors = validationResult(req)
  if (errors.errors.length !== 0) {
    return res.send({ message: 5001, errors: errors.errors })
  }
  passport.authenticate('google-token', function (err, profile, info) {
    console.log('googleErr = ', err)
    console.log('Google Login Profile = > ', profile)
    if (err || !profile) return res.send({ message: messages.ACCESS_TOKEN_EXPIRED })
    if (profile.emails[0].value === '') return res.send({ message: messages.EMAIL_NEEDED_FOR_FB_GOOGLE })

    Users.findOne({ email: profile.emails[0].value }, (err, user) => {
      if (err) return res.send({ message: messages.ERROR_USERS_DB })
      if (!user) {
        var refCode = referralCodeGenerator.alphaNumeric('lowercase', 2, 2)
        var userDetails = {
          email: profile.emails[0].value,
          loginType: profile.provider,
          userId: Xid.next(),
          MSISDN: '60' + new Date().getTime().toString(),
          password: 'tempPassword',
          referralCode: refCode,
          isXoxUser: false,
          isSuspended: false,
          status: 2, // MSISDN Unverified
          resetPassword: true,
          profileId: '',
          googleId: profile.id,
          emailVerified: 0,
          middlewareId: generateRandom(),
          role: 1,
          lEmail: profile.emails[0].value.toLowerCase(),
          randomMsisdn: true,
        }
        saveSocialUser(userDetails, (err, user) => {
          console.log('userErr', err)
          if (err) return res.send(err)
          req.loginType = 'google'
          generateLoginHash(user, req, (err, loginSuccess) => {
            console.log('loginSuccessErr =', err)
            if (err) return res.send(err)
            return res.send(loginSuccess)
          })
        })
      } else {
        req.loginType = 'google'
        generateLoginHash(user, req, (err, loginSuccess) => {
          console.log('loginSuccessErr', err)
          if (err) return res.send(err)
          return res.send(loginSuccess)
        })
      }
    })
  })(req, res, next)
}

function saveSocialUser(userData, _callback) {
  var user = new Users()
  user.loginType = userData.loginType
  user.email = userData.email
  if (userData.facebookId) {
    user.facebookId = userData.facebookId
  } else {
    user.googleId = userData.googleId
  }
  user.isActive = true
  user.password = userData.password
  user.MSISDN = userData.MSISDN
  user.userId = userData.userId
  user.referralCode = userData.referralCode
  user.status = userData.status
  user.isSuspended = userData.isSuspended
  user.isXoxUser = userData.isXoxUser
  user.resetPassword = userData.resetPassword
  user.profileId = userData.profileId
  user.emailVerified = userData.emailVerified
  user.middlewareId = userData.middlewareId
  user.role = userData.role
  user.lEmail = userData.lEmail
  user.randomMsisdn = userData.randomMsisdn
  user.save((err, user) => {
    console.log('err', err)
    if (err) {
      return _callback({ message: messages.DB_ERROR, err })
    }
    else {
    return _callback(null, {
      message: messages.AUTH_SUCCESS_NEW_USER_FROM_SOCIAL_LOGIN,
      userId: user.userId,
      email: user.email,
      MSISDN: user.MSISDN,
      isXoxUser: user.isXoxUser,
      status: user.status,
      loginType: user.loginType,
      referralCode: user.referralCode,
      emailVerified: user.emailVerified,
      resetPassword: user.resetPassword,
      isSuspended: user.isSuspended,
      profileId: user.profileId,
      middlewareId: user.middlewareId,
      role: user.role
    })
    }
  })
}

// Apple Strategy
passport.use(new AppleStrategy(
  {
    clientID: config.appleClientId,
    teamID: config.appleTeamID,
    callbackURL: config.ssoBaseUrl + "appleLoginCallBackUrl",
    keyID: config.appleKeyID,
    key: fs.readFileSync(path.join(__dirname, '../', 'AuthKey_7RF9Q3278M.p8')),
    scope: ['name', 'email']
  }, function (accessToken, refreshToken, profile, cb) {
    console.log("Profile = ", profile)
    console.log("accessToken = ", accessToken)
    return cb(null, profile);
  })
);

// Apple Login
function appleLogin(req, res, next) {
  const errors = validationResult(req)
  if (errors.errors.length !== 0) {
    return res.send({ message: 5001, errors: errors.errors })
  }
  passport.authenticate('apple', function (err, profile, info) {
    console.log('AppleErr = ', err)
    console.log('Apple Profile = > ', profile)
    if (err || !profile) return res.send({ message: messages.ACCESS_TOKEN_EXPIRED })
    if (profile.email === '') return res.send({ message: messages.EMAIL_NEEDED_FOR_FB_GOOGLE })
    Users.findOne({ email: profile.email }, (err, user) => {
      if (err) return res.send({ message: messages.ERROR_USERS_DB })
      if (!user) {
        var refCode = referralCodeGenerator.alphaNumeric('lowercase', 2, 2)
        var userDetails = {
          email: profile.email,
          loginType: 'apple',
          userId: Xid.next(),
          MSISDN: '60' + new Date().getTime().toString(),
          password: 'tempPassword',
          referralCode: refCode,
          isXoxUser: false,
          isSuspended: false,
          status: 2, // MSISDN Unverified
          resetPassword: true,
          profileId: '',
          appleId: profile.id,
          emailVerified: 0,
          middlewareId: generateRandom(),
          role: 1,
          lEmail: profile.email.toLowerCase(),
          randomMsisdn: true,
        }
        saveSocialUser(userDetails, (err, user) => {
          console.log('userErr', err)
          if (err) return res.send(err)
          req.loginType = 'apple'
          generateLoginHash(user, req, (err, loginSuccess) => {
            console.log('loginSuccessErr =', err)
            if (err) return res.send(err)
            return res.send(loginSuccess)
          })
        })
      } else {
        req.loginType = 'apple'
        generateLoginHash(user, req, (err, loginSuccess) => {
          console.log('loginSuccessErr', err)
          if (err) return res.send(err)
          return res.send(loginSuccess)
        })
      }
    })
  })(req, res, next)
}

function appleLoginCallBackUrl (req, res) {
  console.log("Request Details from Apple Login = ", req.body)
}

passport.use(new TwitterTokenStrategy({
  consumerKey: config.TWITTER_CONSUMER_KEY,
  consumerSecret: config.TWITTER_CONSUMER_SECRET
},
function(token, tokenSecret, profile, done) {
    return done(null, profile);
  }
))

function twitterLogin(req, res, next) {
  const errors = validationResult(req)
  if (errors.errors.length !== 0) {
    return res.send({ message: 5001, errors: errors.errors })
  }

  passport.authenticate('twitter-token', function (err, profile, info) {
    console.log('twitterErr = ', err)
    console.log('twitter Profile = > ', profile)
    if (err || !profile) return res.send({ message: messages.ACCESS_TOKEN_EXPIRED })
    if (profile.email === '') return res.send({ message: messages.EMAIL_NEEDED_FOR_FB_GOOGLE })
    Users.findOne({ email: profile.email }, (err, user) => {
      if (err) return res.send({ message: messages.ERROR_USERS_DB })
      if (!user) {
        var refCode = referralCodeGenerator.alphaNumeric('lowercase', 2, 2)
        var userDetails = {
          email: profile.email,
          loginType: 'twitter',
          userId: Xid.next(),
          MSISDN: '60' + new Date().getTime().toString(),
          password: 'tempPassword',
          referralCode: refCode,
          isXoxUser: false,
          isSuspended: false,
          status: 2, // MSISDN Unverified
          resetPassword: true,
          profileId: '',
          appleId: profile.id,
          twitterId :profile.id,
          emailVerified: 0,
          middlewareId: generateRandom(),
          role: 1,
          lEmail: profile.email.toLowerCase(),
          randomMsisdn: true,
        }
        saveSocialUser(userDetails, (err, user) => {
          console.log('userErr', err)
          if (err) return res.send(err)
          req.loginType = 'apple'
          generateLoginHash(user, req, (err, loginSuccess) => {
            console.log('loginSuccessErr =', err)
            if (err) return res.send(err)
            return res.send(loginSuccess)
          })
        })
      } else {
        req.loginType = 'twitter'
        generateLoginHash(user, req, (err, loginSuccess) => {
          console.log('loginSuccessErr', err)
          if (err) return res.send(err)
          return res.send(loginSuccess)
        })
      }
    })
  })(req, res, next)
}

router.post(
  '/facebookLogin',
  socialLoginValidator.validate('facebookLogin'),
  facebookLogin
)

router.post(
  '/googleLogin',
  socialLoginValidator.validate('googleLogin'),
  googleLogin
)

router.post(
  '/appleLogin',
  socialLoginValidator.validate('appleSocialLogin'),
  appleLogin
)

router.post(
  '/appleLoginCallBackUrl',
  appleLoginCallBackUrl
)

module.exports = { router }
