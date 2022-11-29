const { body } = require('express-validator')
const messages = require('../messages/messages')

module.exports.validate = (method) => {
    switch (method) {
        case 'facebookLogin': {
            return [
                body('access_token', messages.ACCESS_TOKEN_REQUIRED).exists().isString().withMessage(" access_token must in string")
            ]
        }
        case 'googleLogin': {
            return [
                body('access_token', messages.ACCESS_TOKEN_REQUIRED).exists().isString().withMessage(" access_token must in string")
            ]
        }
        case 'appleSocialLogin': {
            return [
              body('notificationStatus', 'Notificaiton status is required field').exists()
                .isIn([0, 1]).withMessage('status 0 and 1 are supported'),
              body('notificationKey', 'Notificaiton key is required').exists(),
              body('access_token', messages.ACCESS_TOKEN_REQUIRED).exists(),
              body('code', 'Authorization Code is required').exists()
            ]
          }
    }
}