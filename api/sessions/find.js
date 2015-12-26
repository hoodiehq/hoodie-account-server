module.exports = findSession

var decodeSessionId = require('../utils/couchdb-decode-session-id')
var errors = require('../utils/errors')
var isValidSessionId = require('../utils/couchdb-is-valid-session-id')
var toAccount = require('../utils/doc-to-account')

function findSession (state, id, options) {
  if (!options) {
    options = {}
  }
  var username = decodeSessionId(id).name

  return state.db.get('org.couchdb.user:' + username)

  .then(function (user) {
    if (!isValidSessionId(state.secret, user.salt, id)) {
      throw errors.MISSING_SESSION
    }

    return user
  })

  .then(function (doc) {
    var account = toAccount(doc, {
      includeProfile: options.include === 'account.profile'
    })

    var session = {
      id: id,
      account: account
    }

    return session
  })
}
