const { body } = require('express-validator')
module.exports.validate = (method) => {
  switch (method) {
    case 'createSession': {
      return [
        body('fcmKey', 'FCM key is required for creating a session').exists(),
      ]
    }
    case 'updateSession':{
      return [ 
        body('fcmKey','fcmKey is required to update a session').escape(),
      ]
    }
  }
}
