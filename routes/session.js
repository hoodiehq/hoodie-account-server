module.exports = sessionRoutes
module.exports.attributes = {
  name: 'account-routes-session'
}

var getApi = require('../api')
var joiFailAction = require('../utils/joi-fail-action')
var serialiseSession = require('../utils/session/serialise')
var toBearerToken = require('../utils/to-bearer-token')
var validations = require('../utils/validations')

function sessionRoutes (server, options, next) {
  var couchUrl = options.couchdb || options.adapter.location
  var prefix = options.prefix || ''
  var session = getApi({ url: couchUrl }).session
  var serialise = serialiseSession.bind(null, {
    baseUrl: server.info.uri + prefix
  })

  var createSessionRoute = {
    method: 'PUT',
    path: prefix + '/session',
    config: {
      validate: {
        headers: validations.bearerTokenHeaderForbidden,
        query: validations.sessionQuery,
        failAction: joiFailAction
      }
    },
    handler: function (request, reply) {
      var username = request.payload.data.attributes.username
      var password = request.payload.data.attributes.password
      var query = request.query

      session.add({
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

  var getSessionRoute = {
    method: 'GET',
    path: prefix + '/session',
    config: {
      validate: {
        headers: validations.bearerTokenHeader,
        query: validations.sessionQuery,
        failAction: joiFailAction
      }
    },
    handler: function (request, reply) {
      var id = toBearerToken(request)

      session.find(id, {
        include: request.query.include
      })

      .then(serialise)

      .then(reply)

      .catch(reply)
    }
  }

  var deleteSessionRoute = {
    method: 'DELETE',
    path: prefix + '/session',
    config: {
      validate: {
        headers: validations.bearerTokenHeader,
        query: validations.sessionQuery,
        failAction: joiFailAction
      }
    },
    handler: function (request, reply) {
      var id = toBearerToken(request)

      session.remove(id, {
        include: request.query.include
      })

      .then(function (json) {
        if (!json) {
          return reply().code(204)
        }
        reply(serialise(json)).code(200)
      })

      .catch(reply)
    }
  }

  server.route([
    getSessionRoute,
    createSessionRoute,
    deleteSessionRoute
  ])

  next()
}
