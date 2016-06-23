module.exports = accountRoutes
module.exports.attributes = {
  name: 'account-routes-accounts'
}

var Boom = require('boom')

var errors = require('./utils/errors')
var joiFailAction = require('./utils/joi-fail-action')
var serialise = require('./utils/serialise-account')
var toSessionId = require('./utils/request-to-session-id')
var validations = require('./utils/validations')

function accountRoutes (server, options, next) {
  var accounts = server.plugins.account.api.accounts
  var admins = options.admins

  var postAccountsRoute = {
    method: 'POST',
    path: '/accounts',
    config: {
      auth: false,
      validate: {
        headers: validations.sessionIdHeader,
        query: validations.accountQuery,
        payload: validations.accountPayload,
        failAction: joiFailAction
      }
    },
    handler: function (request, reply) {
      var username = request.payload.data.attributes.username
      var password = request.payload.data.attributes.password
      var query = request.query

      var sessionId = toSessionId(request)

      // check for admin. If not found, check for user
      admins.validateSession(sessionId)

      .then(function (doc) {
        return accounts.add({
          username: username,
          password: password,
          include: query.include
        })
      })

      .then(function (account) {
        return serialise({
          baseUrl: server.info.uri,
          include: request.query.include
        }, account)
      })

      .then(function (json) {
        reply(json).code(201)
      })

      .catch(function (error) {
        if (error.status === 401) {
          error.message = 'Session invalid'
        }
        if (error.message === 'missing') {
          error = errors.INVALID_SESSION
        }
        error = errors.parse(error)

        reply(Boom.wrap(error, error.status, error.message))
      })
    }
  }

  var getAccountsRoute = {
    method: 'GET',
    path: '/accounts',
    config: {
      auth: false,
      validate: {
        headers: validations.sessionIdHeader,
        failAction: joiFailAction
      }
    },
    handler: function (request, reply) {
      var sessionId = toSessionId(request)

      admins.validateSession(sessionId)

      .catch(function (error) {
        // pouchdb-admins throws MISSING_DOC with status 404 if the admin doc is not found
        if (error.status === 404) {
          throw errors.INVALID_SESSION
        }

        throw error
      })

      .then(function () {
        return accounts.findAll({
          db: options.db,
          sessionId: sessionId,
          include: request.query.include
        })
      })

      .then(function (accounts) {
        return serialise({
          baseUrl: server.info.uri,
          include: request.query.include
        }, accounts)
      })

      .then(reply)

      .catch(function (error) {
        error = errors.parse(error)
        reply(Boom.create(error.status, error.message))
      })
    }
  }

  var getAccountRoute = {
    method: 'GET',
    path: '/accounts/{id}',
    config: {
      auth: false,
      validate: {
        headers: validations.sessionIdHeader,
        failAction: joiFailAction
      }
    },
    handler: function (request, reply) {
      var sessionId = toSessionId(request)

      return accounts.find(request.params.id, {
        sessionId: sessionId,
        include: request.query.include
      })

      .then(function (account) {
        return serialise({
          baseUrl: server.info.uri,
          include: request.query.include,
          admin: true
        }, account)
      })

      .then(reply)

      .catch(function (error) {
        reply(Boom.wrap(error, error.status))
      })
    }
  }

  var patchAccountRoute = {
    method: 'PATCH',
    path: '/accounts/{id}',
    config: {
      auth: false,
      validate: {
        headers: validations.sessionIdHeader,
        payload: validations.accountPayload,
        failAction: joiFailAction
      }
    },
    handler: function (request, reply) {
      var sessionId = toSessionId(request)
      var username = request.payload.data.attributes.username
      var password = request.payload.data.attributes.password
      var profile = request.payload.data.attributes.profile

      return accounts.update(request.params.id, {
        username: username,
        password: password,
        profile: profile
      }, {
        sessionId: sessionId,
        include: request.query.include
      })

      .then(function (account) {
        return serialise({
          baseUrl: server.info.uri,
          include: request.query.include,
          admin: true
        }, account)
      })

      .then(function (json) {
        reply(json).code(201)
      })

      .catch(reply)
    }
  }

  var deleteAccountRoute = {
    method: 'DELETE',
    path: '/accounts/{id}',
    config: {
      auth: false,
      validate: {
        headers: validations.sessionIdHeader,
        failAction: joiFailAction
      }
    },
    handler: function (request, reply) {
      var sessionId = toSessionId(request)

      return accounts.remove(request.params.id, {
        sessionId: sessionId
      })

      .then(function (/* json */) {
        reply().code(204)
      })

      .catch(reply)
    }
  }

  server.route([
    postAccountsRoute,
    getAccountsRoute,
    getAccountRoute,
    patchAccountRoute,
    deleteAccountRoute
  ])

  next()
}
