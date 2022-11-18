let config = require('config')
let express = require('express')
let fs = require('fs')
const loginMiddleWare = require('./middleware/loginMiddleware')
const accessMiddleware = require('./middleware/accessMiddleware')
const sessionMiddleware = require('../app/middleware/sessionMiddleware')
const apisMiddleware = require('./middleware/apisMiddleware')
const aclMiddleware = require('./middleware/aclMiddleware')
const bodyParser = require('body-parser')

let app = express()
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
  var rolesContent = fs.readFileSync('config/settings/roles/roles.json')
  var roles = JSON.parse(rolesContent)

  var content = fs.readFileSync('config/settings/apis/general.json')
  var jsonContent = JSON.parse(content)

  var apisContent = fs.readFileSync(config.apisFileName)
  var jsonApis = JSON.parse(apisContent)
     // Allowed Apis on this server
   app.use(function (req, res, next) {
    apisMiddleware(req, res, next, jsonApis)
  })
  
  // app.use('/api', require('../app/routes/session').router)
  // app.use('/api', require('../app/routes/user.js').router)

  // Session middleware
  // app.use(function (req, res, next) {
  //   sessionMiddleware(req, res, next)
  // })

  app.use('/api', require('../app/routes/user.js').router)
  app.use('/api', require('../app/routes/socialLogin.js').router)


  // Login middleware
  app.use(function (req, res, next) {
    loginMiddleWare(req, res, next)
  })
  // Acceess middleware
  app.use(function (req, res, next) {
    accessMiddleware(req, res, next,roles, jsonContent)
  })

  // acl middleware (check if subadmin has access)
  app.use(function (req, res, next) {
    aclMiddleware(req, res, next)
  })
  app.use('/api', require('./routes/user.js').loginRouter)
  app.use('/api', require('./routes/session').loginRouter)

  app.use('/api', require('../app/db/db').router)

  app.listen(
    config.PORT,
    console.log('Server is listening on port 4002')
  )