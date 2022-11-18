const auth = require('basic-auth')
const Session = require('../models/session')
const useragent = require('express-useragent')

function checkSession(req, res, next, roles, jsonAccess) {
  var sessionId = req.headers['session-id']
  var location = req.headers['trax-location']
  var region = req.headers['trax-region']
  var address = req.headers['trax-address']
  
  var source = req.headers['user-agent']
  var ua = useragent.parse(source)
  var obj = JSON.parse(JSON.stringify(ua))

  var user = auth(req)
  var setCommand = {}

  if (user) {
    req.basicAuth = {}
    req.basicAuth.user = user.name
    req.basicAuth.pass = user.pass
    setCommand.$set = {
      email: user.name,
      updatedAt: new Date().getTime() / 1000,
    }
  } else {
    setCommand.$set = { updatedAt: new Date().getTime() / 1000 }
  }
  Session.findOneAndUpdate(
    { sessionId: sessionId, deviceId: obj.source, suspended: false },
    setCommand,
    (err, session) => {
      if (err) return res.send({ message: 5002, err })
      if (!session) return res.send({ message: 5067 })
      req.session = session
      req.location = location
      req.region = region
      req.address = address
      next()
    }
  )
}

module.exports = checkSession
