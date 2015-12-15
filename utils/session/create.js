module.exports = createSession

var Boom = require('boom')
var calculateSessionId = require('couchdb-calculate-session-id')

var findcustomRoles = require('../find-custom-roles')
var findIdInRoles = require('../find-id-in-roles')
// var getAccount = require('../account/get')
var hasAdminRole = require('../has-admin-role')

function createSession (options, callback) {

  options.db.get('org.couchdb.user:' + options.username)
  .then(function (response) {
    // TODO: compare password: options.password
    // TODO: calculate real cookie
    var sessionTimeout = 1209600 // 14 days
    var bearerToken = calculateSessionId(
      response.name,
      response.salt,
      options.secret,
      Math.floor(Date.now() / 1000) + sessionTimeout
    )

    var accountId = findIdInRoles(response.roles)
    var isAdmin = hasAdminRole(response.roles)

    if (!isAdmin && !accountId) {
      return callback(Boom.forbidden(('"id:..." role missing (https://github.com/hoodiehq/hoodie-server-account/blob/master/how-it-works.md#id-role)')))
    }

    var session = {
      id: bearerToken,
      account: {
        id: accountId,
        username: options.username,
        isAdmin: isAdmin,
        roles: findcustomRoles(response.roles)
      }
    }

    if (isAdmin && options.includeProfile) {
      return callback(Boom.forbidden('Admin accounts have no profile'))
    }

    if (!options.includeProfile) {
      return callback(null, session)
    }
  })
  .catch(function (error) {
    console.log("error")
    console.log(error)
    callback(reror)
  })
}
