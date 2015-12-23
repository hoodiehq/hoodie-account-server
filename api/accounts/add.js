module.exports = addAccount

var randomstring = require('randomstring')

var toAccount = require('../utils/doc-to-account')

function addAccount (state, properties, options) {
  if (!options) {
    options = {}
  }
  var accountKey = 'org.couchdb.user:' + encodeURIComponent(properties.username)
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

  .then(function () {
    return toAccount(doc, {
      includeProfile: options.include === 'profile'
    })
  })
}
