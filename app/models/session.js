let mongoose = require('mongoose')
// let Schema = mongoose.Schema
mongoose.set('debug', true)
let SessionSchema = new mongoose.Schema(
  {
    sessionId: {type: String, required: true},
    lname: { type: String, required: false },
    email: {type: String, default: ''},
    fcmKey: {type: String, default: ''},
    suspended: {type: Boolean, default: false},
    deviceId: {type: String, default: ''},
    ip: {type: String, default: ''},
    createdAt: { type: Number, Default: new Date().getTime() / 1000,index:true},
    updatedAt: { type: Number, Default: new Date().getTime() / 1000,index:true},
  }
)
SessionSchema.index({sessionId: 1 })
var Session = mongoose.model('session', SessionSchema)
Session.createIndexes()

module.exports = Session
