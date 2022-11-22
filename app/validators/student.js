const { body } = require('express-validator')
const messages = require('../messages/messages')

module.exports.validate = (method) => {
    switch(method) {
        case 'createData': {
            return [
                body('email', messages.EMAIL_REQUIRED).exists().isEmail().withMessage('email set in email format'),
                body('phoneNumber', messages.PHONE_NUMBER_REQUIRED).exists().isString().withMessage(' phoneNumber must be string'),
                body('firstName', messages.FIRST_NAME_REQUIRED).optional().isString().withMessage('firstName must be string'),
                body('lastName', messages.LAST_NAME_REQUIRED).optional().isString().withMessage('lastName must be sting')
            ]
        }
        case 'deleteRecord': {
            return [
                body('id', messages.ID_REQUIRED ).exists().isString().withMessage('id must be string')
            ]
        }
        case 'updateRecord': {
            return [
                body('id', messages.ID_REQUIRED ).exists().isString().withMessage('id must be string')
            ]
        }
    }
}