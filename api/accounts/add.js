module.exports = addAccount

var uuid = require('uuid')

var errors = require('../utils/errors')
var toAccount = require('../utils/doc-to-account')

function addAccount (state, properties, options) {
  if (!options) {
    options = {}
  }
  var accountKey = 'org.couchdb.user:' + properties.username
  var accountId = properties.id || uuid.v4()

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
