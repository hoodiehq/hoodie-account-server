var Boom = require('boom')

module.exports = function (server, options, next) {
  var couchUrl = options.couchdb || options.adapter.location
  var prefix = options.prefix || ''

  var request = require('request').defaults({
    json: true,
    baseUrl: couchUrl,
    timeout: 10000 // 10 seconds
  })

  server.route([{
    method: 'GET',
    path: prefix + '/session/account',
    handler: function (_req, reply) {
      var headers = _req.headers
      var authorization = headers.authorization

      if (!authorization) {
        return reply(Boom.notFound())
      }
      if (authorization.substr(0, 7) !== 'Bearer ') {
        return reply(Boom.notFound())
      }

      var bearerToken = headers.authorization.substr(7)
      request.get({
        url: '/_session',
        headers: {
          cookie: 'AuthSession=' + bearerToken
        }
      }, function (error, response, body) {
        if (error) {
          return reply(Boom.wrap(error))
        }

        if (response.statusCode >= 400) {
          return reply(Boom.create(response.statusCode, body.reason))
        }

        if (body.userCtx.name === null) {
          return reply(Boom.notFound())
        }

        // TODO: this fails due to
        // https://github.com/pouchdb/express-pouchdb/issues/240
        var userId = 'org.couchdb.user:' + body.userCtx.name
        request.get({
          url: '/_users/' + encodeURIComponent(userId),
          headers: {
            cookie: 'AuthSession=' + bearerToken
          }
        }, function (error, response, body) {
          if (error) {
            return reply(Boom.wrap(error))
          }

          if (response.statusCode >= 400) {
            return reply(Boom.create(response.statusCode, body.reason))
          }

          reply({
            username: body.name
          })
        })
      })
    }
  }, {
    method: 'PUT',
    path: prefix + '/session/account',
    handler: function (_req, reply) {
      var server = _req.connection.server
      var payload = _req.payload
      var userId = 'org.couchdb.user:' + payload.username
      request.put({
        url: '/_users/' + encodeURIComponent(userId),
        body: {
          type: 'user',
          roles: [],
          name: payload.username,
          password: payload.password
        }
      }, function (error, response, body) {
        if (error) {
          return reply(Boom.wrap(error))
        }

        if (response.statusCode >= 400) {
          // Note that PouchDB Server does not return a 409 as it should in case of conflict
          // but a 403: https://github.com/pouchdb/express-pouchdb/issues/240
          return reply(Boom.create(response.statusCode, body.reason))
        }

        request.post({
          url: '/_session',
          form: {
            name: payload.username,
            password: payload.password
          }
        }, function (error, response, body) {
          if (error) {
            return reply(Boom.wrap(error))
          }

          if (response.statusCode >= 400) {
            return reply(Boom.create(response.statusCode, body.reason))
          }

          var bearerToken = response.headers['set-cookie'][0].match(/AuthSession=([^;]+)/)

          if (!bearerToken) {
            server.log(['error', 'couchdb'], '"AuthSession" not found in set-cookie header of POST /_session response')
            return reply(Boom.badImplementation())
          }

          reply({
            username: payload.username,
            session: {
              id: bearerToken.pop()
            }
          }).code(201)
        })
      })
    }
  }, {
    method: 'DELETE',
    path: prefix + '/session/account',
    handler: function (_req, reply) {
      var headers = _req.headers
      var authorization = headers.authorization
      if (!authorization) {
        return reply(Boom.notFound())
      }
      if (authorization.substr(0, 7) !== 'Bearer ') {
        return reply(Boom.notFound())
      }

      var bearerToken = authorization.substr(7)

      request.get({
        url: '/_session',
        headers: {
          cookie: 'AuthSession=' + bearerToken
        }
      }, function (error, response, body) {
        if (error) {
          return reply(Boom.wrap(error))
        }

        if (response.statusCode >= 400) {
          return reply(Boom.create(response.statusCode, body))
        }

        if (body.userCtx.name === null) {
          return reply(Boom.notFound())
        }

        // TODO: this fails due to
        // https://github.com/pouchdb/express-pouchdb/issues/240
        var userId = 'org.couchdb.user:' + body.userCtx.name
        request.del({
          url: '/_users/' + encodeURIComponent(userId),
          headers: {
            cookie: 'AuthSession=' + bearerToken
          }
        }, function (error, response, body) {
          if (error) {
            return reply(Boom.wrap(error))
          }

          if (response.statusCode >= 400) {
            return reply(Boom.create(response.statusCode, body))
          }

          reply().code(204)
        })
      })
    }
  }])

  next()
}

module.exports.attributes = {
  name: 'account-api-account'
}
