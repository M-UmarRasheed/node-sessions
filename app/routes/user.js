const express = require('express')
const userValidator = require('../validators/user')
const { validationResult } = require('express-validator')
const nodemailer = require('nodemailer')
const hbs = require('nodemailer-handlebars')
const User = require('../models/user')
const path = require('path')
const config = require('config')
const dotenv = require('dotenv').config()
var jwt = require('jsonwebtoken')
const userAgent = require('express-useragent')
const bcrypt = require('bcrypt')
const util = require('util')
const loginActivity = require('../models/loginActivity')
let LoginHistories = require('../models/loginHistories')
var getIP = require('ipware')().get_ip
const authy = require('authy')(config.authyKey)

let router = express.Router()
let loginRouter = express.Router()

var mailTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  service: 'gmail',
  auth: {
    user: config.EMAIL,
    pass: config.PASSWORD,
  },
})

const emailOptions = {
  viewEngine: {
    extName: '.hbs',
    partialsDir: path.resolve('./views'),
    defaultLayout: false,
  },
  viewPath: path.resolve('./views'),
  extName: '.hbs',
}
mailTransporter.use('compile', hbs(emailOptions))

function mailSend(name, lastName,to, subject, message, type) {
  const emailOption = {
    from: 'Node Alert' + '<' + config.EMAIL + '>', // sender address
    subject: 'Node Alert', // Subject line
    template: type,
    context: {
      firstName: name,
      lastName: lastName,
      email: to,
      subject,
      message,
    },
  }
  console.log('mailoptions',emailOption)
  mailTransporter.sendMail(emailOption, function (err, info) {
    if (err) console.log('THIS IS ERR', err)
    else console.log('info is', info)
  })
}

function register(req, doSendEmail, isAdminRequest, _callback) {
  delete req.body.suspended
  delete req.body.hash
  delete req.body.forgotHash
  delete req.body.token
  var newUser = new User(req.body)
  newUser.hash = getToken(newUser.email)
  var link = ''
  if (isAdminRequest) {
    link = util.format(config.adminRegistrationlink, newUser.hash)
  } else {
    link = util.format(config.link, newUser.hash)
  }
  newUser.markModified('password')
  newUser.save((err, user) => {
    if (err && err.code === 11000) {
      if (err.keyPattern.email === 1) return _callback({ message: 6176, err })
    }
    if (err) return _callback({ message: 5002, err })
    return _callback(user)
  })
}

function login(req, isPhone, _callback) {
  const errors = validationResult(req)
  var source = req.headers['user-agent']
  var ua = userAgent.parse(source)
  var obj = JSON.parse(JSON.stringify(ua))
  var ipInfo = getIP(req)
  if (errors.errors.length !== 0) {
    return _callback({ message: 5001, errors: errors.errors })
  }
  var query = {}
  query.suspended = false
  query.active = true
  if (isPhone) {
    query.phone = req.body.phone
  } else {
    query.email = req.body.email
  }
  User.findOne(
    query,
    {
      email: 1,
      role: 1,
      firstName: 1,
      lastName: 1,
      phone: 1,
      password: 1,
    },
    (err, user) => {
      if (err) return _callback({ message: 5002, err })
      if (!user) return _callback({ message: "no user 6114", err })
      user.comparePassword(req.body.password, (err, isMatch) => {
        if (err) return _callback({ message: 5004, err })
        if (!isMatch) return _callback({ message: 6181, err })
        console.log('User While Login', user)
        var token = getNonExpiringToken(  
          user.email,
          user.role,
          user.suspended       
        )
        var userJson = user.toJSON()

        delete userJson._id
        var login = new loginActivity(userJson)
        login.ipAddress = ipInfo.clientIp
        // login.deviceId = req.session.sessionId
        login.token = token
        login.save((err, login) => {
          if (err) return _callback({ message: 5002, err })
          return _callback(null, {
            message: 5005,
            token: token,
            email: user.email,
          })
        })
      })
    }
  )
}

function registerUser(req, res) {
  req.body.role = 1
  delete req.body.active
  register(req, true, false, (err, message) => {
    if (err) {
      return res.send(err)
    } else {
      return res.send(message)
    }
  })
}

function registerAdmin(req, res) {
  req.body.role = 2
  delete req.body.active
  delete req.body.hash
  register(req, true, false, (err, message) => {
    if (err) {
      return res.send(err)
    } else {
      return res.send(message)
    }
  })
}

function addUser(req, res) {
  const errors = validationResult(req)
  if (errors.errors.length !== 0) {
    return res.send({ errors: errors.errors })
  }
  delete req.body.hash
  mailSend(
    req.body.firstName,
    req.body.lastName,
    req.body.email,
    req.body.subject,
    req.body.message,
    'welcome'
  )

  let user = new User(req.body)
  user.hash = getToken(user.email)
  user.save((err, result) => {
    if (err) return res.send({ message: 6576, err })
    return res.send({ message: 6577, result })
  })
}

function getUser(req, res) {
  User.find({}, (err, result) => {
    if (err) return res.send({ message: 'no user found' })
    if (!result) return res.send({ message: 'no user found' })
    else return res.send({ message: 6577, result })
  })
}

function deleteUser(req, res) {
  User.findByIdAndDelete({ _id: req.body._id }, (err, user) => {
    if (err) return res.send(err)
    else return res.send(user)
  })
}

function deleteAllUser(req, res) {
  User.deleteMany({}, (err, user) => {
    if (err) return res.send(err)
    else return res.send(user)
  })
}

function getNonExpiringToken(email, role, suspended) {
  const payload = {
    user: email,
    role: role,
    suspended: suspended,
  }
  var token = jwt.sign(payload, config.secret, {})
  return token
}

function getToken(email) {
  var payload = {
    user: email,
    expiresIn: 43200,
  }
  var token = jwt.sign(payload, config.secret, {})
  return token
}

function forgotPassword(req, res) {
  User.findOne({ email: req.body.email }, (err, user) => {
    if (err) return res.send({ message: 5001 })
    if (!user) return res.send({ message: 'user not found' })
    var token = getToken(req.body.email)
    var link = util.format(config.linkForgot, token)
    console.log("linl",link)
    mailSend(
      user.firstName,
      link,
      req.body.email,
      config.linkForgot,
      user.subject,
      'forgotPassword'
    )
    console.log("mailesend",mailSend)
    user.forgotHash = token
    user.save((err, result) => {
      if (err) return res.send({ message: 3001 })
      else return res.send({ message: 53302, result })
    })
  })
}

function emailLogin(req, res) {
  login(req, false, (err, message) => {
    console.log('err',err)
    if (err) {
      return res.send(err)
    } else {
      return res.send(message)
    }
  })
}

function registerMobile (req, res) {
  var newBuyer = new User(req.body) // new Buyer(req.body)
  console.log("newBuyer")
  if (newBuyer.role) {
    if (newBuyer.role === 2) {
      return res.send({message: '1103'})
    }
  } else {
    newBuyer.role = 1
  }
  console.log("fjhhgh")
  newBuyer.password = 'none'
  authy.register_user(newBuyer.email, newBuyer.phone, newBuyer.countryCode,
    function (err, response) {
      console.log("err",err)
      if (err || !response.user) return res.send({message: '1001'})
      newBuyer.authyId = response.user.id
      newBuyer.save(function (err, doc) {
        if (err || !doc) return res.send({message: '1001'})
     
          sendToken(newBuyer, res)
          newBuyer.save((err, buyer) => {
            if (err) console.log(err)
          })
          // return res.send(doc)
        // })
      })
    })
}

function checkMobileLogin (req, res) {
  User.findOne({phone: req.body.phone}, (err, user) => {
    if (err || !user) { // First time login with this phone number
      // console.log(err);
      // if(!user) return res.send({message:"no user"})
      registerMobile(req, res)
    } else {
      if (user === null) registerMobile(req, res)
      else if (user.authyId === '') registerMobile(req, res)
      else sendToken(user, res)
    }
  })
}

function sendToken (buyer, res) {
  authy.request_sms(buyer.authyId, true, function (err, response) {
    if (err) {
      console.log(err)
      return res.send({message: '1016'})
    } else return res.send({message: '1017',response})
  })
}
function registerData(req,res) {
  console.log('reeee1',req.body)
  let user = new User(req.body)
  user.email = req.body.email
  user.firstName = req. body.firstName
  user.password = req.body.password
  user.save((err, user) => {
    if(err) return res.send({message:'user not saved',err})
    return res.send({message:'User Registered', user})
  })
}

function getNonExpiringToken(email, isSuspended) {
	const payload = {
		user: email,
		suspended: isSuspended,
	}
	var token = jwt.sign(payload, app.get('secret'), {})
	return token
}

function generateLoginHash(user, req, _callback) {
	var source = req.headers['user-agent']
	var ua = userAgent.parse(source)
	var obj = JSON.parse(JSON.stringify(ua))
	var ipInfo = getIP(req)
	var token = getNonExpiringToken(user.userId, user.isSuspended)
	user.token = token

	// let lineAccouts = null
	// let favAccount = null

	var UserDetailsForLoginActivity = {
		userId: user.userId,
		profileId: user.profileId,
		deviceType: obj.source,
		ipAddress: ipInfo.clientIp,
		loginType: req.loginType,
		isSuspended: user.isSuspended,
		loginEmail: user.email,
		loginMSISDN: user.MSISDN,
		middlewareId: user.middlewareId,
		OSType: req.body.OSType,
		isXoxUser: user.isXoxUser,
		//userDetail: { lineAccouts, favAccount, middlewareId: user.middlewareId },
		//token: user.token,
		deviceId: obj.source,
		role: user.role,
	}

	var loginHistories = new LoginHistories(UserDetailsForLoginActivity)
	// loginHistories.loginType = user.loginType

	loginHistories.save(async function (err, doc) {
		if (err) {
			return _callback({
				message: messages.DB_ERROR_SAVING_USERS_IN_LOGIN_HISTORY,
			})
		}
		await redisClient
			.connectClient()
			.HSET(user.userId, 'login', JSON.stringify(UserDetailsForLoginActivity))
		await redisClient.connectClient().SADD(user.userId + ':tokens', user.token)
		return _callback(null, {
			message: messages.LOGIN_SUCCESS,
			resetPassword: user.resetPassword,
			token: user.resetPassword ? token : token, // if user needs to reset password.
			user: {
				userId: user.userId,
				email: user.email,
				msisdn: user.MSISDN,
				isXoxUser: user.isXoxUser,
				status: user.status,
				loginType: req.loginType,
				referralCode: user.referralCode,
				emailVerified: user.emailVerified,
			},
		})
	})
	// LoginActivity.findOneAndUpdate(
	// 	{
	// 		loginMSISDN: user.MSISDN,
	// 		deviceId: obj.source,
	// 	},
	// 	UserDetailsForLoginActivity,
	// 	{ upsert: true },
	// 	(err, saveActivity) => {
	// 		if (err)
	// 			return _callback({ message: messages.ERROR_IN_UPDATING_LOGIN_ACTIVITY })
	// 		loginHistories.save(function (err, doc) {
	// 			if (err) {
	// 				return _callback({
	// 					message: messages.DB_ERROR_SAVING_USERS_IN_LOGIN_HISTORY,
	// 				})
	// 			}

	// 			if (user.isXoxUser && user.resetPassword) {
	// 				getUserLineAccounts(user, req, (lineErr, lineSuccess) => {
	// 					// get userLineAccounts list from xox API(v3/sso/query_selfcare)
	// 					if (lineSuccess) lineAccouts = lineSuccess
	// 					getUserFvrtAccounts(user, req, (favErr, favSuccess) => {
	// 						// get userFavAccounts list from xox API(v3/black_app/subline/get_sublines)
	// 						if (favSuccess) favAccount = favSuccess
	// 						LoginActivity.updateMany(
	// 							{
	// 								token: user.token,
	// 							},
	// 							{
	// 								userDetail: {
	// 									lineAccouts,
	// 									favAccount,
	// 									middlewareId: user.middlewareId,
	// 								},
	// 							},
	// 							{ upsert: false },
	// 							(err, updateActivity) => {
	// 								if (err) {
	// 									return _callback({
	// 										message: messages.ERROR_IN_UPDATING_LOGIN_ACTIVITY,
	// 									})
	// 								}
	// 								return _callback(null, {
	// 									message: messages.LOGIN_SUCCESS,
	// 									resetPassword: user.resetPassword,
	// 									token: user.resetPassword ? token : '-', // if user needs to reset password.
	// 									user: {
	// 										userId: user.userId,
	// 										email: user.email,
	// 										msisdn: user.MSISDN,
	// 										isXoxUser: user.isXoxUser,
	// 										status: user.status,
	// 										loginType: req.loginType,
	// 										referralCode: user.referralCode,
	// 										emailVerified: user.emailVerified,
	// 									},
	// 								})
	// 							}
	// 						)
	// 					})
	// 				})
	// 			} else {
	// 				return _callback(null, {
	// 					message: messages.LOGIN_SUCCESS,
	// 					resetPassword: user.resetPassword,
	// 					token: user.resetPassword ? token : '-', // if user needs to reset password.
	// 					user: {
	// 						userId: user.userId,
	// 						email: user.email,
	// 						msisdn: user.MSISDN,
	// 						isXoxUser: user.isXoxUser,
	// 						status: user.status,
	// 						loginType: req.loginType,
	// 						referralCode: user.referralCode,
	// 						emailVerified: user.emailVerified,
	// 					},
	// 				})
	// 			}
	// 		})
	// 	}
	// )
}

router.post('/addUser', userValidator.validate('addUser'), addUser)
router.post('/getUser', getUser)
loginRouter.post('/forgetPassword', forgotPassword)
router.post('/deleteUser', deleteUser)
router.post('/deleteAllUser', deleteAllUser)
loginRouter.post('/register', registerUser)
router.post('/registerAdmin', registerAdmin)
router.post('/login', emailLogin)
router.post('/checkMobileLogin',checkMobileLogin)
router.post('/registerMobile',registerMobile)
router.post('/registerData',registerData)
module.exports = { router, loginRouter ,generateLoginHash}
