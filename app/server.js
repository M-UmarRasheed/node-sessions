let config = require('config')
let express = require('express')
let fs = require('fs')
const loginMiddleWare = require('./middleware/loginMiddleware')
const accessMiddleware = require('./middleware/accessMiddleware')
const sessionMiddleware = require('./middleware/sessionMiddleware')
const apisMiddleware = require('./middleware/apisMiddleware')
const aclMiddleware = require('./middleware/aclMiddleware')
const bodyParser = require('body-parser')
let mongoose = require('mongoose')
// let cors = require('cors')

let app = express()
app.use(bodyParser.json({ strict: false }))
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.get('/', (req, res) => res.json({ message: 'Welcome to first App deployed on AWS EC2 by Umar !' }))

let options = {
	useNewUrlParser: true,
	useUnifiedTopology: true,
	autoIndex: false, // Don't build indexes
	serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
	socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
	family: 4, // Use IPv4, skip trying IPv6
	keepAlive: 1,
	connectTimeoutMS: 30000,
	ssl: config.useSSL,
	sslValidate: false,
	// sslCA: fs.readFileSync('./rds-combined-ca-bundle.pem'),
}

// db connection
mongoose.connect(config.DBHost, options)
let db = mongoose.connection
db.on('error', console.error.bind(console, 'connection error:'))

// var corsOptions = {
// 	origin: true,
// 	credentials: true,
// 	methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH'],
// 	optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
// }
// app.use(cors(corsOptions))
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

  app.use('/api', require('./routes/user.js').router)
  app.use('/api', require('./routes/socialLogin.js').router)


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

  app.listen(
    config.PORT,
    console.log('Server is listening on port 4002')
  )