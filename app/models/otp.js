/* eslint no-unused-vars: "off" */
let mongoose = require('mongoose')
let Schema = mongoose.Schema
mongoose.set('debug', true)

let OtpSchema = new Schema({
	phoneNumber: { type: String, required: false, index: true },
	email: { type: String, required: false },
	lastSentOtp: { type: String, required: true },
	otpCount: { type: Number, required: false, default: 1 },
	otpHash: { type: String, required: false, index: true },
	updatedAt: { type: Number, index: true },
	createdAt: { type: Number, index: true },
})

OtpSchema.pre('save', function (next) {
	var now = new Date().getTime() / 1000
	if (!this.createdAt) {
		this.createdAt = now
		this.updatedAt = now
	} else {
		this.updatedAt = now
	}
	next()
})

const OTP = mongoose.model('OTP', OtpSchema)
OTP.createIndexes()

module.exports = OTP
