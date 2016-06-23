module.exports = profileRoutes
module.exports.attributes = {
  name: 'account-routes-profile'
}

var Boom = require('boom')

var errors = require('./utils/errors')
var joiFailAction = require('./utils/joi-fail-action')
var serialiseProfile = require('./utils/serialise-profile')
var toSessionId = require('./utils/request-to-session-id')
var validations = require('./utils/validations')

function profileRoutes (server, options, next) {
  var serialise = serialiseProfile.bind(null, {
    baseUrl: server.info.uri
  })
  var admins = options.admins
  var sessions = server.plugins.account.api.sessions
  var accounts = server.plugins.account.api.accounts

  var getProfileRoute = {
    method: 'GET',
    path: '/session/account/profile',
    config: {
      auth: false,
      validate: {
        headers: validations.sessionIdHeader,
        query: validations.profileQuery,
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
          throw errors.NO_PROFILE_ACCOUNT
        },

        // if not admin
        function (error) {
          if (error.status === 404) {
            return sessions.find(sessionId, {
              include: 'account.profile'
            })
            .catch(function (error) {
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

  var patchProfileRoute = {
    method: 'PATCH',
    path: '/session/account/profile',
    config: {
      auth: false,
      validate: {
        headers: validations.sessionIdHeader,
        payload: validations.profilePayload,
        query: validations.profileQuery,
        failAction: joiFailAction
      }
    },
    handler: function (request, reply) {
      var sessionId = toSessionId(request)
      var givenProfile = request.payload.data.attributes
      var id = request.payload.data.id

      // check for admin. If not found, check for user
      admins.validateSession(sessionId)

        .then(
          // if admin
          function (doc) {
            throw errors.NO_PROFILE_ACCOUNT
          },

          // if not admin
          function (error) {
            if (error.status === 404) {
              return sessions.find(sessionId, {
                include: 'account.profile'
              })
                .catch(function (error) {
                  if (error.status === 404) {
                    throw errors.INVALID_SESSION
                  }
                })
            }

            throw error
          })

        .then(function (session) {
          if (session.account.id + '-profile' !== id) {
            throw errors.accountIdConflict(session.account.id + '-profile')
          }
          return accounts.update({username: session.account.username}, {
            profile: givenProfile
          }, {include: 'profile'})
        })

        .then(function (json) {
          reply().code(204)
        })

        .catch(function (error) {
          error = errors.parse(error)
          reply(Boom.create(error.status, error.message))
        })
    }
  }

  server.route([
    getProfileRoute,
    patchProfileRoute
  ])

  next()
}
