var config = require('config')
var OTP = require('../models/otp')
var jwt = require('jsonwebtoken')
const Users = require('../models/user')
const { router } = require('./user')

function generateRandom() {
	var minm = parseInt(config.minOtp)
	var maxm = parseInt(config.maxOtp)
	console.log(minm)
	console.log(maxm)
	return Math.floor(Math.random() * (maxm - minm + 1)) + minm
}

function verifyOtp(hash, otpNumber, _callback) {
	OTP.findOne({ otpHash: hash }, (err, otp) => {
		if (err) return _callback({ message: 6111 })
		if (!otp) return _callback({ message: 6112 })
		jwt.verify(otp.otpHash, config.secret, function (err, decoded) {
			if (err) return _callback({ message: 6113 })
			console.log(decoded.otp)
			console.log(otpNumber)
			if (decoded.otp.toString() !== otpNumber.toString())
				return _callback({ message: 6112 })
			Users.findOne({ phone: otp.phoneNumber }, (err, user) => {
				if (err) return _callback({ message: 6114 })
				user.active = true
				user.save((err, user) => {
					if (err) return _callback({ message: 6111 })
					return _callback(null, { message: 6115 })
				})
			})
		})
	})
}

function resendOtp(hash, _callback) {
	OTP.findOne({ otpHash: hash }, (err, otp) => {
		if (err) return _callback({ message: 6111 })
		if (!otp) return _callback({ message: 6112 })
		sendOtp(otp.phoneNumber, otp.email, (err, message, hash, randOtp) => {
			if (err) return _callback(err)
			return _callback(null, message, hash, randOtp, otp.email)
		})
	})
}

const sendOtp = (phone, email, _callback) => {
	var otp = generateRandom()
	var randOtp = otp
	console.log(otp)
	var payload = { phone: phone, otp: otp }
	var token = jwt.sign(payload, config.secret, {
		expiresIn: 60, // expires in 60 seconds
	})
	var message = 'OTP ' + otp + ' ' + config.otpMessage
	var params = {
		Message: message,
		PhoneNumber: phone,
	}

	OTP.findOne({ phoneNumber: phone }, (err, otp) => {
		if (err) return _callback({ message: 6103 })
		if (otp) {
			console.log(otp)
			var now = new Date().getTime()
			if (otp.otpCount >= config.maxOtps) {
				if (now - otp.lastSentOtp > config.otpsTimeSpan) {
					otp.otpCount = 0
					otp.lastSentOtp = now
				} else {
					return _callback({ message: 6107 })
				}
			}
			otp.otpHash = token
			otp.otpCount++
			otp.save((err, saved) => {
				console.log(saved)
				if (err) return _callback({ message: 6103 })
				else {
					publishTextPromise
						.then(function (data) {
							console.log(data)
							console.log(params)
							return _callback(null, { message: 6104 }, token, randOtp)
						})
						.catch(function (err) {
							console.log(err)
							return _callback(null, { message: 6106 })
						})
				}
			})
		} else {
			var jsonOtp = {
				phoneNumber: phone,
				email: email,
				lastSentOtp: new Date().getTime(),
				otpHash: token,
			}
			var newotp = new OTP(jsonOtp)
			newotp.save((err, saved) => {
				console.log(saved)
				if (err) return _callback({ message: 6103 })
				else {
					publishTextPromise
						.then(function (data) {
							console.log(data)
							console.log(params)
							return _callback(null, { message: 6104 }, token, randOtp)
						})
						.catch(function (err) {
							console.log(err)
							return _callback(null, { message: 6106 })
						})
				}
			})
		}
	})
}
module.exports = {  sendOtp, verifyOtp, resendOtp }