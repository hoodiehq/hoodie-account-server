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
  var api = getApi({ url: couchUrl, admin: options.admin })
  var sessions = api.sessions
  var accounts = api.accounts
  var serialise = serialiseAccount.bind(null, {
    baseUrl: server.info.uri + prefix
  })

  var signUpRoute = {
    method: 'PUT',
    path: prefix + '/session/account',
    config: {
      auth: false,
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
    config: {
      auth: false
    },
    handler: function (request, reply) {
      var sessionId = toBearerToken(request)

      sessions.find(sessionId, {
        include: request.query.include
      })

      .then(function (session) {
        if (session.account.isAdmin) {
          throw Boom.forbidden('Admin users have no account')
        }

        return accounts.find({
          username: session.account.username
        }, {
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
    config: {
      auth: false
    },
    handler: function (request, reply) {
      var sessionId = toBearerToken(request)

      sessions.find(sessionId, {
        include: request.query.include
      })

      .then(function (session) {
        return accounts.remove({
          username: session.account.username
        }, {
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
