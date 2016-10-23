module.exports = accountRoutes
module.exports.attributes = {
  name: 'account-routes-account'
}

var Boom = require('boom')

var errors = require('./utils/errors')
var joiFailAction = require('./utils/joi-fail-action')
var serialiseAccount = require('./utils/serialise-account')
var toSessionId = require('./utils/request-to-session-id')
var validations = require('./utils/validations')

function accountRoutes (server, options, next) {
  var serialise = serialiseAccount.bind(null, {
    baseUrl: server.info.uri
  })
  var admins = options.admins
  var sessions = server.plugins.account.api.sessions
  var accounts = server.plugins.account.api.accounts

  var signUpRoute = {
    method: 'PUT',
    path: '/session/account',
    config: {
      auth: false,
      validate: {
        headers: validations.sessionIdHeaderForbidden,
        query: validations.accountQuery,
        payload: validations.accountPayload,
        failAction: joiFailAction
      }
    },
    handler: function (request, reply) {
      var username = request.payload.data.attributes.username
      var password = request.payload.data.attributes.password
      var createdAt = request.payload.data.attributes.createdAt
      var id = request.payload.data.id
      var query = request.query

      var currentTime = new Date().toISOString()

      accounts.add({
        username: username,
        password: password,
        createdAt: createdAt || currentTime,
        signedUpAt: currentTime,
        include: query.include,
        id: id
      })

      .then(serialise)

      .then(function (json) {
        reply(json).code(201)
      })

      .catch(function (error) {
        error = errors.parse(error)
        reply(Boom.create(error.status || 400, error.message))
      })
    }
  }

  var getAccountRoute = {
    method: 'GET',
    path: '/session/account',
    config: {
      auth: false,
      validate: {
        headers: validations.sessionIdHeader,
        query: validations.accountQuery,
        failAction: joiFailAction
      }
    },
    handler: function (request, reply) {
      var sessionId = toSessionId(request)

      // check for admin. If not found, check for user
      admins.validateSession(sessionId)

      .then(
        // if admin
        function (doc) {
          throw errors.NO_ADMIN_ACCOUNT
        },

        // if not admin
        function (error) {
          if (error.status === 404) {
            return sessions.find(sessionId, {
              include: request.query.include === 'profile' ? 'account.profile' : undefined
            }).catch(function (error) {
              if (error.status === 404) {
                throw errors.INVALID_SESSION
              }
            })
          }

          throw error
        })

      .then(function (session) {
        return session.account
      })

      .then(serialise)

      .then(reply)

      .catch(function (error) {
        error = errors.parse(error)
        reply(Boom.create(error.status, error.message))
      })
    }
  }

  var patchAccountRoute = {
    method: 'PATCH',
    path: '/session/account',
    config: {
      auth: false,
      validate: {
        headers: validations.sessionIdHeader,
        payload: validations.accountPayload,
        query: validations.accountQuery,
        failAction: joiFailAction
      }
    },
    handler: function (request, reply) {
      var sessionId = toSessionId(request)

      var newUsername = request.payload.data.attributes.username
      var newPassword = request.payload.data.attributes.password
      var id = request.payload.data.id

      admins.validateSession(sessionId)
      .then(
        // if admin
        function (doc) {
          throw errors.FORBIDDEN_ADMIN_ACCOUNT
        },

        // if not admin
        function (error) {
          if (error.status === 404) {
            return sessions.find(sessionId)
              .catch(function (error) {
                if (error.status === 404) {
                  throw errors.INVALID_SESSION
                }
              })
          }
          throw error
        })

      .then(function (session) {
        if (session.account.id !== id) {
          throw errors.accountIdConflict(session.account.id)
        }
        return accounts.update(session.account, {
          username: newUsername,
          password: newPassword
        }, {
          include: request.query.include
        })
      })

      .then(function (account) {
        // no auth param, act as 'admin' (we already validated the old session above)
        return sessions.add({
          account: {
            username: account.username
          }
        })
      })

      .then(function (session) {
        reply()
          .code(204)
          .header('x-set-session', session.id)
      })

      .catch(function (error) {
        error = errors.parse(error)

        reply(Boom.create(error.status, error.message))
      })
    }
  }

  var destroyAccountRoute = {
    method: 'DELETE',
    path: '/session/account',
    config: {
      auth: false,
      validate: {
        query: validations.accountQuery,
        failAction: joiFailAction
      }
    },
    handler: function (request, reply) {
      var sessionId = toSessionId(request)

      // check for admin. If not found, check for user
      admins.validateSession(sessionId)

      .then(
        // if admin
        function (doc) {
          throw errors.FORBIDDEN_ADMIN_ACCOUNT
        },

        // if not admin
        function (error) {
          if (error.status === 404) {
            return sessions.find(sessionId, {
              include: request.query.include === 'profile' ? 'account.profile' : undefined
            }).catch(function (error) {
              if (error.status === 404) {
                throw errors.INVALID_SESSION
              }
            })
          }

          throw error
        })

      .then(function (session) {
        return accounts.remove(session.account, {
          include: request.query.include
        })
      })

      .then(function (account) {
        if (request.query.include) {
          return reply(serialise(account)).code(200)
        }

        reply().code(204)
      })

      .catch(function (error) {
        error = errors.parse(error)
        reply(Boom.create(error.status, error.message))
      })
    }
  }

  server.route([
    getAccountRoute,
    patchAccountRoute,
    signUpRoute,
    destroyAccountRoute
  ])

  next()
}
