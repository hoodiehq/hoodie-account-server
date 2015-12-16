module.exports = addSession

var Boom = require('boom')
var calculateSessionId = require('couchdb-calculate-session-id')

var createSession = require('../../utils/session/create')
var validatePassword = require('../../utils/validate-password')

function addSession (state, options) {
  return new Promise(function (resolve, reject) {
    if (state.admins[options.username]) {
      var adminDoc = toAdminDoc(options.username, state.admins[options.username])

      if (!adminDoc) {
        return reject(Boom.unauthorized('Invalid password'))
      }

      return validatePassword(
        options.password,
        adminDoc.salt,
        adminDoc.iterations,
        adminDoc.derived_key,
        function (error, isCorrectPassword) {
          if (error) {
            return reject(error)
          }

          if (!isCorrectPassword) {
            return reject(Boom.unauthorized('Invalid password'))
          }

          var sessionTimeout = 1209600 // 14 days
          var bearerToken = calculateSessionId(
            adminDoc.name,
            adminDoc.salt,
            state.secret,
            Math.floor(Date.now() / 1000) + sessionTimeout
          )

          resolve({
            type: 'session',
            id: bearerToken
          })
        }
      )
    }

    createSession({
      db: state.db,
      secret: state.secret,
      username: options.username,
      password: options.password,
      includeProfile: options.include === 'account.profile'
    }, function (error, session) {
      if (error) {
        return reject(error)
      }

      resolve(session)
    })
  })
}

var regexAdminParts = /^-pbkdf2-([\da-f]+),([\da-f]+),([0-9]+)$/
function toAdminDoc (username, hash) {
  var info = hash.match(regexAdminParts)

  if (!info) {
    return
  }

  return {
    name: username,
    password_scheme: 'pbkdf2',
    derived_key: info[1],
    salt: info[2],
    iterations: parseInt(info[3], 10),
    roles: ['_admin']
  }
}
