module.exports = createSession

var Boom = require('boom')

var findIdInRoles = require('../find-id-in-roles')
var getAccount = require('../account/get')

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
    var session = {
      id: bearerToken,
      account: {
        id: accountId,
        username: options.username
      }
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
