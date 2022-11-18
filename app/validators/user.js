const { body } = require('express-validator')
module.exports.validate = (method) => {
  switch (method) {
    case 'addUser': {
      return [
        body('firstName', 'firstName is required')
          .exists()
          .isString()
          .withMessage('must be string')
          .notEmpty()
          .withMessage('must not be null'),
        body('lastName', 'lastName is required')
          .exists()
          .isString()
          .withMessage('must be string')
          .notEmpty()
          .withMessage('must not be null'),
        body('email', 'email is required')
          .exists()
          .isString()
          .withMessage('must be string')
          .notEmpty()
          .withMessage('must not be null'),
      ]
    }
  }
}
