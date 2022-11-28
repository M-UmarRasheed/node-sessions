const LoginActivity = require('../models/loginActivity')
const jwt = require('jsonwebtoken')
const config = require('config')
const geoHash = require('ngeohash')
const auth = require('basic-auth')


function verifySecureLogin(req, res, next) {
  var user = auth(req)
	var setCommand = {}
	if (user) {
		req.basicAuth = {}
		req.basicAuth.user = user.name
		req.basicAuth.pass = user.pass
	}

  if (req.basicAuth) {
    check(req, res, next, req.basicAuth.pass, req.basicAuth.user)
  } else {
    return res.status(403).send({ message: 5014 })
  }
}

function check(req, res, next, token, user) {
 console.log('token',token)
 console.log('user',user)

  let location = {}
  let region = req.region ? req.region : null
  if (req.location) {
    let encoded = geoHash.decode(req.location)
    location = {
      type: 'Point',
      coordinates: [encoded.longitude, encoded.latitude],
    }
  }
  LoginActivity.findOneAndUpdate(
    {
      // deviceId: req.session.sessionId,
      email: user,
      token: token,
      suspended: false,
    },
    { lastSeen: new Date().getTime(), location, region },
    { upsert: false, new: false },
    (err, userObj) => {
      if (err) return res.send({ message: 5002, err })
      console.log("user",userObj)
      console.log("err",err)

      if (!userObj) return res.send({ message: 5006 })

      jwt.verify(token, config.secret, function (err, decoded) {
        if (err) return res.send({ message: 5002, err })
        // if everything is good, save to request for use in other routes
        req.decoded = decoded
        console.log("req.decoded",req.decoded)
        console.log("req.decoded",user)

        req.decoded.login = userObj
        if (decoded.user !== userObj.email) return res.send({ message: 5006 }) // checking it from DB
        if (decoded.user !== user) return res.send({ message: 5006 }) // checking it from client request
        next()
      })
    }
  )
}

module.exports = verifySecureLogin
