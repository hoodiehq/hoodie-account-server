module.exports = addAccount

var randomstring = require('randomstring')

var errors = require('../utils/errors')
var toAccount = require('../utils/doc-to-account')

function addAccount (state, properties, options) {
  if (!options) {
    options = {}
  }
  var accountKey = 'org.couchdb.user:' + properties.username
  var accountId = properties.id || randomstring.generate({
    length: 12,
    charset: 'hex'
  })

  var doc = {
    _id: accountKey,
    type: 'user',
    name: properties.username,
    password: properties.password,
    roles: [
      'id:' + accountId
    ].concat(properties.roles || [])
  }

  return state.db.put(doc)

  .catch(function (error) {
    if (error.status === 409) {
      throw errors.USERNAME_EXISTS
    }
    throw error
  })

  .then(function () {
    return toAccount(doc, {
      includeProfile: options.include === 'profile'
    })
  })
}
