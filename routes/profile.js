module.exports = profileRoutes
module.exports.attributes = {
  name: 'account-routes-profile'
}

var Boom = require('boom')

var errors = require('./utils/errors')
var joiFailAction = require('./utils/joi-fail-action')
var serialiseProfile = require('./utils/serialise-profile')
var toBearerToken = require('./utils/request-to-bearer-token')
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
        headers: validations.bearerTokenHeader,
        failAction: joiFailAction
      }
    },
    handler: function (request, reply) {
      var sessionId = toBearerToken(request)

      // check for admin. If not found, check for user
      admins.validateSession(sessionId)

      .then(function (doc) {
        throw errors.FORBIDDEN_ADMIN_ACCOUNT
      })

      .catch(function (error) {
        if (error.name === 'not_found') {
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
        headers: validations.bearerTokenHeader,
        payload: validations.profilePayload,
        failAction: joiFailAction
      }
    },
    handler: function (request, reply) {
      var sessionId = toBearerToken(request)
      var givenProfile = request.payload.data.attributes

      // check for admin. If not found, check for user
      admins.validateSession(sessionId)

        .then(function (doc) {
          throw errors.FORBIDDEN_ADMIN_ACCOUNT
        })

        .catch(function (error) {
          if (error.name === 'not_found') {
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
          return accounts.update({username: session.account.username}, {
            profile: givenProfile
          }, {include: 'profile'})
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

  server.route([
    getProfileRoute,
    patchProfileRoute
  ])

  next()
}
