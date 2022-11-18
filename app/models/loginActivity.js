const mongoose = require('mongoose')
mongoose.set('debug', true)

let Schema = mongoose.Schema

let loginActivitySchema = new Schema({
  email: { type: String, required: false },
  token: { type: String, required: false },
  deviceId: { type: String, default: '' },
  ipAdress: { type: String },
  suspend: { type: Boolean, default: false },
  createdAt: { type: String, required: false },
  updatedAt: { type: String, required: false },
  
})
loginActivitySchema.pre('save', function (next) {
  var now = new Date().getTime()
  this.createdAt = now
  this.updatedAt = now
  next()
})
loginActivitySchema.index({ email: 1 })
var loginActivity = mongoose.model('loginactivity', loginActivitySchema)
module.exports = loginActivity
