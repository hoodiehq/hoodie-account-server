module.exports = sessionRoutes
module.exports.attributes = {
  name: 'account-routes-session'
}

var Boom = require('boom')

var errors = require('./utils/errors')
var joiFailAction = require('./utils/joi-fail-action')
var serialiseSession = require('./utils/serialise-session')
var toSessionId = require('./utils/request-to-session-id')
var validations = require('./utils/validations')

function sessionRoutes (server, options, next) {
  var admins = options.admins
  var sessions = server.plugins.account.api.sessions
  var serialise = serialiseSession.bind(null, {
    baseUrl: server.info.uri
  })

  var createSessionRoute = {
    method: 'PUT',
    path: '/session',
    config: {
      auth: false,
      validate: {
        headers: validations.sessionIdHeaderForbidden,
        query: validations.sessionQuery,
        payload: validations.sessionPayload,
        failAction: joiFailAction
      }
    },
    handler: function (request, reply) {
      var username = request.payload.data.attributes.username.toLowerCase()
      var password = request.payload.data.attributes.password
      var query = request.query

      // check for admin. If not found, check for user
      admins.validatePassword(username, password)

      .then(
        // if admin
        function () {
          if (query.include) {
            throw errors.FORBIDDEN_ADMIN_ACCOUNT
          }

          return admins.calculateSessionId(username)

          .then(function (sessionId) {
            return {
              id: sessionId
            }
          })
        },

        // if not admin
        function (error) {
          if (error.status === 404) {
            return sessions.add({
              account: {
                username: username,
                password: password
              },
              include: query.include
            })
            .catch(function (error) {
              if (error.status === 404) {
                throw errors.INVALID_CREDENTIALS
              }
              throw error
            })
          }

          throw error
        })

      .then(serialise)

      .then(function (json) {
        reply(json).code(201)
      })

      .catch(function (error) {
        error = errors.parse(error)
        reply(Boom.create(error.status, error.message))
      })
    }
  }

  var getSessionRoute = {
    method: 'GET',
    path: '/session',
    config: {
      auth: false,
      validate: {
        headers: validations.sessionIdHeader,
        query: validations.sessionQuery,
        failAction: joiFailAction
      }
    },
    handler: function (request, reply) {
      var query = request.query
      var sessionId = toSessionId(request)

      // check for admin. If not found, check for user
      admins.validateSession(sessionId)

      .then(
        // if admin
        function (doc) {
          if (query.include) {
            throw errors.FORBIDDEN_ADMIN_ACCOUNT
          }

          return {
            id: sessionId
          }
        },

        // if not admin
        function (error) {
          if (error.status === 404) {
            return sessions.find(sessionId, {
              include: request.query.include
            })
            .catch(function (error) {
              if (error.status === 401 || error.status === 404) {
                throw errors.INVALID_SESSION
              }
              throw error
            })
          }

          throw error
        })

      .then(serialise)

      .then(reply)

      .catch(function (error) {
        error = errors.parse(error)
        reply(Boom.create(error.status, error.message))
      })
    }
  }

  var deleteSessionRoute = {
    method: 'DELETE',
    path: '/session',
    config: {
      auth: false,
      validate: {
        headers: validations.sessionIdHeader,
        query: validations.sessionQuery,
        failAction: joiFailAction
      }
    },
    handler: function (request, reply) {
      var query = request.query
      var sessionId = toSessionId(request)

      // check for admin. If not found, check for user
      admins.validateSession(sessionId)

      .then(
        // if admin
        function (doc) {
          if (query.include) {
            throw errors.FORBIDDEN_ADMIN_ACCOUNT
          }
        },

        // if not admin
        function (error) {
          if (error.status === 404) {
            return sessions.remove(sessionId, {
              include: request.query.include
            })
            .catch(function (error) {
              if (error.status === 404 || error.status === 401) {
                throw errors.INVALID_SESSION
              }
              throw error
            })
          }

          throw error
        })

      .then(function (session) {
        if (!request.query.include) {
          return reply().code(204)
        }
        reply(serialise(session)).code(200)
      })

      .catch(function (error) {
        error = errors.parse(error)
        reply(Boom.create(error.status, error.message))
      })
    }
  }

  server.route([
    getSessionRoute,
    createSessionRoute,
    deleteSessionRoute
  ])

  next()
}
