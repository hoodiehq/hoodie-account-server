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
    path: prefix + '/session',
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

        reply({
          id: bearerToken
        })
      })
    }
  }, {
    method: 'PUT',
    path: prefix + '/session',
    handler: function (_req, reply) {
      var server = _req.connection.server
      var payload = _req.payload
      var query = _req.query

      if (_req.headers['authorization']) {
        return reply(Boom.forbidden('Authorization header not allowed'))
      }

      var username = payload.data.attributes.username

      request.post({
        url: '/_session',
        form: {
          name: username,
          password: payload.data.attributes.password
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

        bearerToken = bearerToken.pop()

        // TODO: it's not guratneed that the `id:<accountId>` role is 1st
        var accountId = body.roles[0].substr(3)

        var jsonApiResponse = {
          links: {
            self: server.info.uri + prefix + '/session'
          },
          data: {
            id: bearerToken,
            type: 'session',
            relationships: {
              account: {
                links: {
                  related: server.info.uri + prefix + '/session/account'
                },
                data: {
                  id: accountId,
                  type: 'account'
                }
              }
            }
          },
          included: [
            {
              id: accountId,
              type: 'account',
              attributes: {
                username: username
              },
              relationships: {
                profile: {
                  links: {
                    related: server.info.uri + prefix + '/session/account/profile'
                  },
                  data: {
                    id: accountId + '-profile',
                    type: 'accountProfile'
                  }
                }
              }
            }
          ]
        }

        if (query.include !== 'account.profile') {
          return reply(jsonApiResponse).code(201)
        }

        request.get({
          url: '/_users/org.couchdb.user:' + encodeURIComponent(username),
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

          jsonApiResponse.included.push({
            id: 'abc1234-profile',
            type: 'profile',
            attributes: body.profile || {}
          })

          reply(jsonApiResponse).code(201)
        })
      })
    }
  }, {
    method: 'DELETE',
    path: prefix + '/session',
    handler: function (_req, reply) {
      var headers = _req.headers
      var authorization = headers.authorization
      var options = {
        url: '/_session'
      }

      if (authorization && authorization.substr(0, 7) === 'Bearer ') {
        var bearerToken = authorization.substr(7)
        options.headers = {
          cookie: 'AuthSession=' + bearerToken
        }
      }

      request.del(options, function (error, response, body) {
        if (error) {
          return reply(Boom.wrap(error))
        }

        if (response.statusCode >= 400) {
          return reply(Boom.create(response.statusCode, body.reason))
        }

        reply().code(204)
      })
    }
  }])

  next()
}

module.exports.attributes = {
  name: 'account-api-session'
}
