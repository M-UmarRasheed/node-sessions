const mongoose = require('mongoose')
const express = require('express')
const router = express.Router()
// const url ="mongodb://localhost/session-crud",
const url = 'mongodb+srv://umar:umar123@cluster0.vaxmx8u.mongodb.net/?retryWrites=true&w=majority'
mongoose.connect(url,
    {
    useUnifiedTopology: true,
    useNewUrlParser: true
    })
let db = mongoose.connection
db.on('error',console.error.bind('mongodb connect error'))

module.exports= { router }