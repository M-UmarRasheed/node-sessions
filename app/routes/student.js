const express = require('express')
const Student = require('../models/student')
const messages = require('../messages/messages')
const studentValidation = require('../validators/student')
const { validationResult } = require('express-validator')

const router = express.Router()

function createData(req, res) {

    const errors = validationResult(req)
    if (errors.errors.length !== 0) {
        return res.send({ errors: errors.errors })
    }
    const student = new Student(req.body)
    student.save((err, data) => {
        if (err) return res.send({ message: messages.DATA_NOT_SAVED, err })
        return res.send({ message: messages.DATA_INSERTED, data })
    })
}

function getAllRecord(req, res) {
    Student.find({}, (err, data) => {
        if (err) return res.send({ message: messages.GETTING_RECORDS_ERROR, err })
        return res.send({ message: messages.GETTING_RECORDES_SUCCESS, data })
    })
}

function deleteRecord(req, res) {
    const errors = validationResult(req)
    if (errors.errors.length !== 0) {
        return res.send({ errors: errors.errors })
    }
    Student.findOneAndDelete({ _id: req.body.id }, (err, record) => {
        if (err) return res.send({ message: messages.RECORD_NOT_FOUND })
        return res.send({ message: messages.RECORD_DELETED_SUCCESS, record })
    })
}

function updateRecord(req, res) {
    const errors = validationResult(req)
    if (errors.errors.length !== 0) {
        return res.send({ errors: errors.errors })
    }
    Student.findOne({ _id: req.body.id }, (err, record) => {
        if (err) return res.send({ message: messages.RECORD_NOT_FOUND, err })
        Object.assign(record, req.body).save((err, result) => {
            if (err) return res.send({ message: messages.RECORD_NOT_FOUND, err })
            return res.send({ message: messages.RECORD_UPDATED_SUCCESS, result })
        })
    })
}

router.post(
    '/createData',
    studentValidation.validate('createData'),
    createData
)
router.get(
    '/getAllRecord',
    getAllRecord
)
router.post(
    '/deleteRecord',
    studentValidation.validate('deleteRecord'),
    deleteRecord
)
router.post(
    '/updateRecord',
    studentValidation.validate('updateRecord'),
    updateRecord
)

module.exports = {
    router
}