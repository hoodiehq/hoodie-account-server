module.exports = getSession

var Boom = require('boom')
var base64url = require('base64url')
var calculateSessionId = require('couchdb-calculate-session-id')

var findCustomRoles = require('../find-custom-roles')
var findIdInRoles = require('../find-id-in-roles')
var getAccount = require('../account/get')
var hasAdminRole = require('../has-admin-role')

function getSession (options, callback) {
  // fetch user doc
  //   calcualte session id with user salt & bearer-time & server secret
  //   compare calculated session id with bearer token
  var username = getUserNameFromSessionId(options.sessionId)

  options.db.get('org.couchdb.user:' + username)
  .then(function (response) {

    return new Promise(function (resolve, reject) {
      validateSessionId(options, response, function (error, isValidSession) {
        if (error) {
          return reject(error)
        }

        if (!isValidSession) {
          return reject(Boom.notFound('Session invalid'))
        }
        resolve(response)
      })
    })
  }).then(function (user) {
    var username = user.name
    var roles = user.roles
    var accountId = findIdInRoles(roles)
    var isAdmin = hasAdminRole(roles)
    var session = {
      id: options.sessionId,
      account: {
        id: accountId,
        username: username,
        isAdmin: isAdmin,
        roles: findCustomRoles(roles)
      }
    }

    if (isAdmin && options.includeProfile) {
      return callback(Boom.frobidden('Admin accounts have no profile'))
    }

    if (!options.includeProfile) {
      return callback(null, session)
    }

    return callback(null, session)
  })
  .catch(function (error) {
    // TODO MAYBE
    // if (error) {
    //   return callback(Boom.wrap(error))
    // }
    //
    // if (response.statusCode >= 400) {
    //   return callback(Boom.create(response.statusCode, body.reason))
    // }
    //
    // if (body.name === null) {
    //   return callback(Boom.notFound())
    // }
    callback(Boom.wrap(error, error.status))
  })
}

function decodeSessionId (id) {
  var parts = base64url.decode(id).split(':')
  return {
    name: parts[0],
    time: parseInt(parts[1], 16),
    token: parts[2]
  }
}

function getUserNameFromSessionId (id) {
  return decodeSessionId(id).name
}

function validateSessionId (options, user, callback) {
  var session = decodeSessionId(options.sessionId)

  var salt = user.salt
  var name = session.name
  var time = session.time
  var secret = options.secret

  var sessionIdCheck = calculateSessionId(name, salt, secret, time)

  callback(null, sessionIdCheck === options.sessionId)
}
