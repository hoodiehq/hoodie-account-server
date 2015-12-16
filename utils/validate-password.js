module.exports = validatePassword

var crypto = require('crypto')

function validatePassword (password, salt, iterations, derivedKey, callback) {
  crypto.pbkdf2(password, salt, iterations, 20, function (error, derivedKeyCheck) {
    if (error) {
      return callback(error)
    }

    callback(null, derivedKeyCheck.toString('hex') === derivedKey)
  })
}
