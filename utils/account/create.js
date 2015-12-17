module.exports = createAccount

var randomstring = require('randomstring')

function createAccount (state, options, callback) {
  var accountKey = 'org.couchdb.user:' + encodeURIComponent(options.username)
  var accountId = randomstring.generate({
    length: 12,
    charset: 'hex'
  })

  // TODO generate salt, calculate derived key for password
  var salt = 'salt123'
  var derivedKey = 'derivedKey123'

  options.db.put({
    _id: accountKey,
    type: 'user',
    name: options.username,
    roles: [
      'id:' + accountId
    ].concat(options.roles || []),
    salt: salt,
    derived_key: derivedKey,
    iterations: 10,
    password_scheme: 'pbkdf2'
  })

  .then(function () {
    var account = {
      id: accountId,
      username: options.username
    }
    callback(account)
  })

  .catch(callback)
}
