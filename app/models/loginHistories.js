/**
 * A schema class for the login Activity History,
 * which will handle the logins History
 * @type {schema}
 */

 let mongoose = require('mongoose')
 let Schema = mongoose.Schema
//  let Global = require('../global/settings')

 let LoginActivityHistory = new Schema({
   loginEmail: { type: String },
   loginMSISDN: { type: Number, required: false },
   deviceId: { type: String, default: '' },
   isSuspended: { type: Boolean },
   loginType: { type: String },
   ipAddress: { type: String },
   userId: { type: String },
   isXoxUser: { type: Boolean },
   createdAt: { type: Date },
   registrationType: { type: Number },
   ipAddress: { type: String },
 })
 
 LoginActivityHistory.pre('save', function (next) {
     var now = new Date().getTime()
     if (!this.createdAt) {
         this.createdAt = now
     }
     next()
 })
 
 LoginActivityHistory.index({ loginEmail: 1, deviceId: 1 })
//  LoginActivityHistory.plugin(Global.paginate)
 
 Schema({}, { usePushEach: true })
 
 module.exports = mongoose.model('loginActivityHistory', LoginActivityHistory)
 