module.exports = addSession

var calculateSessionId = require('couchdb-calculate-session-id')

var errors = require('../utils/errors')
var validatePassword = require('../utils/validate-password')
var toAccount = require('../utils/doc-to-account')

function addSession (state, options) {
  return state.db.get('org.couchdb.user:' + options.username)

  .then(function (doc) {
    // no auth, skip authentication (act as admin)
    if (!options.auth) {
      return doc
    }

    return new Promise(function (resolve, reject) {
      validatePassword(
        options.auth.password,
        doc.salt,
        doc.iterations,
        doc.derived_key,
        function (error, isCorrectPassword) {
          if (error) {
            return reject(error)
          }

          if (!isCorrectPassword) {
            return reject(errors.UNAUTHORIZED_PASSWORD)
          }

          resolve(doc)
        }
      )
    })
  })

  .then(function (doc) {
    var sessionTimeout = 1209600 // 14 days
    var sessionId = calculateSessionId(
      doc.name,
      doc.salt,
      state.secret,
      Math.floor(Date.now() / 1000) + sessionTimeout
    )

    var session = {
      id: sessionId,
      account: toAccount(doc, {
        includeProfile: options.include === 'account.profile'
      })
    }

    return session
  })
}
