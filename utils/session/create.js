module.exports = createSession

var Boom = require('boom')

var findcustomRoles = require('../find-custom-roles')
var findIdInRoles = require('../find-id-in-roles')
var getAccount = require('../account/get')
var hasAdminRole = require('../has-admin-role')

function createSession (options, callback) {
  var request = require('request').defaults({
    json: true,
    baseUrl: options.couchUrl,
    timeout: 10000 // 10 seconds
  })

  request.post({
    url: '/_session',
    form: {
      name: options.username,
      password: options.password
    }
  }, function (error, response, body) {
    if (error) {
      return callback(Boom.wrap(error))
    }

    if (response.statusCode >= 400) {
      return callback(Boom.create(response.statusCode, body.reason))
    }

    var bearerToken = response.headers['set-cookie'][0].match(/AuthSession=([^;]+)/)

    if (!bearerToken) {
      return callback(Boom.badImplementation())
    }

    bearerToken = bearerToken.pop()

    var accountId = findIdInRoles(body.roles)
    var isAdmin = hasAdminRole(body.roles)

    if (!isAdmin && !accountId) {
      return callback(Boom.forbidden(('"id:..." role missing (https://github.com/hoodiehq/hoodie-server-account/blob/master/how-it-works.md#id-role)')))
    }

    var session = {
      id: bearerToken,
      account: {
        id: accountId,
        username: options.username,
        isAdmin: isAdmin,
        roles: findcustomRoles(body.roles)
      }
    }

    if (isAdmin && options.includeProfile) {
      return callback(Boom.forbidden('Admin accounts have no profile'))
    }

    if (!options.includeProfile) {
      return callback(null, session)
    }

    getAccount({
      couchUrl: options.couchUrl,
      bearerToken: options.bearerToken,
      username: session.account.username
    }, function (error, account) {
      if (error) {
        return callback(error)
      }

      session.account.profile = account.profile || {}

      callback(null, session)
    })
  })
}
