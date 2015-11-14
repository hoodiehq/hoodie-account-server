module.exports = accountRoutes
module.exports.attributes = {
  name: 'account-routes-account'
}

var Boom = require('boom')

var getApi = require('../api')
var joiFailAction = require('../utils/joi-fail-action')
var serialiseAccount = require('../utils/account/serialise')
var toBearerToken = require('../utils/to-bearer-token')
var validations = require('../utils/validations')

function accountRoutes (server, options, next) {
  var couchUrl = options.couchdb.url
  var prefix = options.prefix || ''
  var api = getApi({ url: couchUrl })
  var sessions = api.sessions
  var accounts = api.accounts
  var serialise = serialiseAccount.bind(null, {
    baseUrl: server.info.uri + prefix
  })

  var request = require('request').defaults({
    json: true,
    baseUrl: couchUrl,
    timeout: 10000 // 10 seconds
  })

  var signUpRoute = {
    method: 'PUT',
    path: prefix + '/session/account',
    config: {
      validate: {
        headers: validations.bearerTokenHeaderForbidden,
        query: validations.accountQuery,
        failAction: joiFailAction
      }
    },
    handler: function (request, reply) {
      var username = request.payload.data.attributes.username
      var password = request.payload.data.attributes.password
      var query = request.query

      accounts.add({
        username: username,
        password: password,
        include: query.include
      })

      .then(serialise)

      .then(function (json) {
        reply(json).code(201)
      })

      .catch(reply)
    }
  }

  var getAccountRoute = {
    method: 'GET',
    path: prefix + '/session/account',
    handler: function (request, reply) {
      var sessionId = toBearerToken(request)

      sessions.find(sessionId, {
        include: request.query.include
      })

      .then(function (session) {
        return accounts.find(session.account.username, {
          bearerToken: sessionId,
          include: request.query.include
        })
      })

      .then(serialise)

      .then(reply)

      .catch(reply)
    }
  }

  var destroyAccountRoute = {
    method: 'DELETE',
    path: prefix + '/session/account',
    handler: function (request, reply) {
      var sessionId = toBearerToken(request)

      sessions.find(sessionId, {
        include: request.query.include
      })

      .then(function (session) {
        return accounts.remove(session.account.username, {
          bearerToken: sessionId,
          include: request.query.include
        })
      })

      .then(function () {
        reply().code(204)
      })

      .catch(reply)
    }
  }

  server.route([
    getAccountRoute,
    signUpRoute,
    destroyAccountRoute
  ])

  next()
}
