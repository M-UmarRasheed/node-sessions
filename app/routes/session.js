const express = require('express')
const useragent = require('express-useragent')
const sessionValidator = require('../validators/session')
const config = require('config')
const { validationResult } = require('express-validator')
const Session = require('../models/session')
const Xid = require('xid-js')

const router = express.Router()
const loginRouter = express.Router()

function createSession (req, res) {
  const errors = validationResult(req)
  if (errors.errors.length !== 0) { return res.send({message: 5001, errors: errors.errors}) }

  var source = req.headers['user-agent']
  console.log('source',source)
  var ua = useragent.parse(source)
  console.log("ua",ua)
  var obj = JSON.parse(JSON.stringify(ua))
console.log("obj",obj)
  let session = new Session()
  session.sessionId = Xid.next()
  session.fcmKey = req.body.fcmKey
  session.deviceId = obj.source
  var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').split(',')[0].trim()
  session.ip = ip

  session.save((err, session) => {
    if (err) return res.send({message: 5002, err})
    return res.send({message: 5026, session})
  })
}

function suspendSession (req, res) {
  const errors = validationResult(req)
  if (errors.errors.length !== 0) { return res.send({message: 5001, errors: errors.errors}) }

  Session.updateOne({sessionId: req.body.sessionId}, {$set: {suspended: true}}, (err, session) => {
    if (err) return res.send({message: 5002, err})
    return res.send({message: 5026,session})
  })
}

function unSuspendSession (req, res) {
  const errors = validationResult(req)
  if (errors.errors.length !== 0) { return res.send({message: 5001, errors: errors.errors}) }

  Session.updateOne({sessionId: req.body.sessionId}, {$set: {suspended: false}}, (err, session) => {
    if (err) return res.send({message: 5002, err})
    return res.send({message: 5026,session})
  })
}

function getAllSuspendedSessions (req, res) {
  var page = 1
  var query = {}
  var sortValue = 'createdAt'
  var sort = -1

  if (req.query.page) page = req.query.page
  if (req.query.sortValue) sortValue = req.query.sortValue
  if (req.query.sort) sort = req.query.sort
  query.suspended = true

  Session.paginate(query, {page: page, sort: {[sortValue]: sort}, select: {lname: 0, _id: 0, _v: 0}}, (err, result) => {
    if (err) return res.send({message: 5002, err})
    return res.send({message: 5026, result})
  })
}

function updateSession(req,res){
  var source = req.headers['user-agent']
  var ua = useragent.parse(source)
  var obj = JSON.parse(JSON.stringify(ua))
  Session.findOneAndUpdate({sessionId:req.body.sessionId,deviceId:obj.source},{$set:{fcmKey:req.body.fcmKey}},{new:true},(err,session)=>{
if(err) return res.send(err)
if(!session) return res.send({message:"no session "})
return res.send({message:"result",session})
  })
}


function getAllSessions (req, res) {
  Session.find({}, (err, result) => {
    if (err) return res.send({message: 5002, err})
    return res.send({message: 5026, result})
  })
}

// function searchUserSession (req, res) {
//   const errors = validationResult(req)
//   if (errors.errors.length !== 0) { return res.send({message: 5001, errors: errors.errors}) }

//   let query = {}
//   let page = 1
//   if (req.query.page) page = req.query.page
//   nGrams.createNgrams(req.body.searchPhrase, (err, searchPhrase) => {
//     if (err) return res.send({message: 5002, err})

//     query.$text = {$search: searchPhrase}

//     Session.count(query, (err, count) => {
//       if (err) return res.send({message: 5002, err})
//       let result = {}
//       result.total = count
//       Session.find(query, {score: {$meta: 'textScore'}, lname: 0, _id: 0, _v: 0}, (err, docs) => {
//         if (err) return res.send({message: 5002, err})
//         result.docs = docs
//         result.page = page
//         result.pages = Math.ceil(count / config.pageSize)
//         return res.send({message: 5026, result})
//       }).limit(config.pageSize)
//         .skip((config.pageSize * page) - config.pageSize)
//         .sort({score: {$meta: 'textScore'}})
//     })
//   })
// }

router.put('/createSession', sessionValidator.validate('createSession'), createSession)
router.post('/updateSession', sessionValidator.validate('updateSession'), updateSession)

loginRouter.post('/suspendSession', suspendSession)
loginRouter.post('/unSuspendSession', unSuspendSession)
loginRouter.post('/getAllSuspendedSessions/:page?/:sort?/:sortValue?', getAllSuspendedSessions)
router.post('/getAllSessions', getAllSessions)
// loginRouter.post('/searchUserSession/:page?', paginationValidator.validate('paginationPostSearch'), searchUserSession)

module.exports = {router, loginRouter}
