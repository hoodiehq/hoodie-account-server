module.exports = createSession

var Boom = require('boom')

var findcustomRoles = require('../find-custom-roles')
var findIdInRoles = require('../find-id-in-roles')
// var getAccount = require('../account/get')
var hasAdminRole = require('../has-admin-role')

function createSession (options, callback) {
  // options.db.get(options.username)
  options.db.get('test')
  .catch(function (error) {
    console.log("error")
    console.log(error)

  })
  .then(function (response) {
    // TODO: compare password: options.password

    console.log("response")
    console.log(response)
    throw new Error('BLOCKER: response does not expose session id')
    process.exit()

    var bearerToken = response.headers['set-cookie'][0].match(/AuthSession=([^;]+)/)

    if (!bearerToken) {
      return callback(Boom.badImplementation())
    }

    bearerToken = bearerToken.pop()

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
}
