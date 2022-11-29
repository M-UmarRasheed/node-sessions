const mongoose = require('mongoose')
const bcrypt = require('bcrypt');
const config =require('config')
let Schema = mongoose.Schema

let userSchema = new Schema({
  username:{ type: String, required: false },
  name: { type: String,required: false },
  email: { type: String, index: true, unique: true },
  password:{ type:String },
  phone:{ type:Number, index: true },
  countryCode: { type: Number, required: false },
  role:{type:Number, default: 1 },
  active:{type:Boolean,default: true},
  hash: { type: String, required: false, index: true },
  forgotHash: {type:String },
  subRole: { type: String },
  suspended: { type: Boolean, default: false },
  facebookId: {type: Number},
  createdAt: { type: String, index: true },
  updatedAt: { type: String, index: true },
})

userSchema.pre('save', function (next) {
  var user =this
  var now = new Date().getTime()
  if (!user.createdAt) {
    user.createdAt = now
    user.updated = now
  } else {
    user.updated = now
  }
  bcrypt.hash(user.password, config.saltRounds, function (error, hash) {
    if (error) {
      return next(error)
    } else {
      user.password = hash
      // next should be called after the password has been hashed
      // otherwise non hashed password will be saved in the db
      next()
    }
  })
})

userSchema.methods.comparePassword = function (candidatePassword, cb) {
bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
  if (err) return cb(err)
  cb(null, isMatch)
})
}

userSchema.methods.hashPass = function (next) {
bcrypt.hash(this.password, config.saltRounds, function (err, hash) {
  if (err) return next(err)
  else {
    this.password = hash
    next()
  }
})
}

userSchema.index({ email: 1, suspended: 1 })
var User = mongoose.model('user', userSchema)

User.createIndexes()
module.exports = User
