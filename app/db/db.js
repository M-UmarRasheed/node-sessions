const mongoose = require('mongoose')
const express = require('express')
const router = express.Router()
const url ="mongodb://localhost/session-crud"
mongoose.connect(url,
    {
    useUnifiedTopology: true,
    useNewUrlParser: true
    })
let db = mongoose.connection
db.on('error',console.error.bind('mongodb connect error'))

module.exports= { router }