var lolex = require('lolex')
var merge = require('lodash.merge')
var nock = require('nock')
var test = require('tap').test

var getServer = require('../utils/get-server')

var authorizationHeaderNotAllowedErrorTest = require('../utils/authorization-header-not-allowed-error')
var couchdbErrorTests = require('../utils/couchdb-error-tests')
var invalidTypeErrors = require('../utils/invalid-type-errors.js')

var jsonAPIHeaders = {
  accept: 'application/vnd.api+json',
  'content-type': 'application/vnd.api+json'
}

var headersWithAuth = merge({authorization: 'Bearer cGF0LWRvZToxMjc1MDA6zEZsQ1BuO-W8SthDSrg8KXQ8OlQ'}, jsonAPIHeaders)

var putSessionRouteOptions = {
  method: 'PUT',
  url: '/session',
  headers: {
    accept: 'application/vnd.api+json',
    'content-type': 'application/vnd.api+json'
  },
  payload: {
    data: {
      type: 'session',
      attributes: {
        username: 'pat-doe',
        password: 'secret'
      }
    }
  }
}

var getSessionRouteOptions = {
  method: 'GET',
  url: '/session',
  headers: headersWithAuth
}

var deleteSessionRouteOptions = {
  method: 'DELETE',
  url: '/session',
  headers: headersWithAuth
}

getServer(function (error, server) {
  if (error) {
    return test('test setup', function (t) {
      t.error(error)
      t.end()
    })
  }

  var couchdbGetUserMock = nock('http://localhost:5984')
    .get('/_users/org.couchdb.user%3Apat-doe')
    .query(true)

  test('PUT /session', function (group) {
    authorizationHeaderNotAllowedErrorTest(server, group, putSessionRouteOptions)
    couchdbErrorTests(server, group, couchdbGetUserMock, putSessionRouteOptions)
    invalidTypeErrors(server, group, putSessionRouteOptions)

    group.test('User Found', function (subGroup) {
      function mockUserFound (docChange) {
        return couchdbGetUserMock
          .reply(200, merge({
            _id: 'org.couchdb.user:pat-doe',
            _rev: '1-234',
            password_scheme: 'pbkdf2',
            iterations: 10,
            type: 'user',
            name: 'pat-doe',
            roles: ['id:userid123', 'mycustomrole'],
            derived_key: '4b5c9721ab77dd2faf06a36785fd0a30f0bf0d27',
            salt: 'salt123'
          }, docChange))
      }

      var sessionResponse = require('../fixtures/session-response.json')

      subGroup.test('Valid password', function (t) {
        var clock = lolex.install(0, ['Date'])
        mockUserFound()

        server.inject(putSessionRouteOptions, function (response) {
          delete response.result.meta
          t.is(response.statusCode, 201, 'returns 201 status')
          t.deepEqual(response.result.data.id, sessionResponse.data.id, 'returns the right content')

          clock.uninstall()
          t.end()
        })
      })

      subGroup.test('Invalid password', function (t) {
        var clock = lolex.install(0, ['Date'])
        var couchdb = mockUserFound()
        var options = merge({}, putSessionRouteOptions, {
          payload: {
            data: {
              attributes: {
                password: 'invalidsecret'
              }
            }
          }
        })

        server.inject(options, function (response) {
          t.doesNotThrow(couchdb.done, 'CouchDB received request')
          t.is(response.statusCode, 401, 'returns 401 status')
          t.is(response.result.errors.length, 1, 'returns one error')
          t.is(response.result.errors[0].title, 'Unauthorized', 'returns "Unauthorized" error')
          t.is(response.result.errors[0].detail, 'Invalid password', 'returns "Invalid password" message')

          clock.uninstall()
          t.end()
        })
      })

      subGroup.test('Valid password, but user has no id:... role', function (t) {
        var couchdb = mockUserFound({
          roles: ['mycustomrole']
        })

        server.inject(putSessionRouteOptions, function (response) {
          delete response.result.meta

          t.doesNotThrow(couchdb.done, 'CouchDB received request')
          t.is(response.statusCode, 403, 'returns 403 status')
          t.is(response.result.errors.length, 1, 'returns one error')
          t.is(response.result.errors[0].title, 'Forbidden', 'returns "Forbidden" error')
          t.is(response.result.errors[0].detail, '"id:..." role missing (https://github.com/hoodiehq/hoodie-server-account/blob/master/how-it-works.md#id-role)')
          t.end()
        })
      })

      subGroup.end()
    })

    group.test('User Is admin', function (subGroup) {
      subGroup.test('Valid password', function (t) {
        var clock = lolex.install(0, ['Date'])

        var options = merge({}, putSessionRouteOptions, {
          payload: {
            data: {
              attributes: {
                username: 'admin',
                password: 'secret'
              }
            }
          }
        })

        var adminSessionResponse = require('../fixtures/session-admin-response.json')

        server.inject(options, function (response) {
          delete response.result.meta
          t.is(response.statusCode, 201, 'returns 201 status')
          t.deepEqual(response.result, adminSessionResponse, 'returns the right content')

          clock.uninstall()
          t.end()
        })
      })

      subGroup.test('Invalid password', function (t) {
        var clock = lolex.install(0, ['Date'])

        var options = merge({}, putSessionRouteOptions, {
          payload: {
            data: {
              attributes: {
                username: 'admin',
                password: 'invalidsecret'
              }
            }
          }
        })

        server.inject(options, function (response) {
          t.is(response.statusCode, 401, 'returns 401 status')
          t.is(response.result.errors.length, 1, 'returns one error')
          t.is(response.result.errors[0].title, 'Unauthorized', 'returns "Unauthorized" error')
          t.is(response.result.errors[0].detail, 'Invalid password', 'returns "Invalid password" message')

          clock.uninstall()
          t.end()
        })
      })

      subGroup.end()
    })

    group.end()
  })

  test('PUT /session?include=account.profile', function (group) {
    var putSessionRouteWithProfileOptions = merge({}, putSessionRouteOptions, {
      url: '/session?include=account.profile'
    })

    group.test('User Found', function (subGroup) {
      function mockUserFound (docChange) {
        return couchdbGetUserMock
          .reply(200, merge({
            _id: 'org.couchdb.user:pat-doe',
            _rev: '1-234',
            password_scheme: 'pbkdf2',
            iterations: 10,
            type: 'user',
            name: 'pat-doe',
            roles: ['id:userid123', 'mycustomrole'],
            derived_key: '4b5c9721ab77dd2faf06a36785fd0a30f0bf0d27',
            salt: 'salt123'
          }, docChange))
      }

      var sessionWithProfileResponse = require('../fixtures/session-with-profile-response.json')

      subGroup.test('Valid password', function (t) {
        var clock = lolex.install(0, ['Date'])
        mockUserFound({
          profile: {
            fullName: 'pat Doe',
            email: 'pat@example.com'
          }
        })

        server.inject(putSessionRouteWithProfileOptions, function (response) {
          delete response.result.meta
          t.is(response.statusCode, 201, 'returns 201 status')
          t.deepEqual(response.result.included, sessionWithProfileResponse.included, 'returns the right content')

          clock.uninstall()
          t.end()
        })
      })

      subGroup.end()
    })

    group.test('User Is admin', function (subGroup) {
      subGroup.test('Valid password', function (t) {
        var clock = lolex.install(0, ['Date'])

        var options = merge({}, putSessionRouteWithProfileOptions, {
          payload: {
            data: {
              attributes: {
                username: 'admin',
                password: 'secret'
              }
            }
          }
        })

        server.inject(options, function (response) {
          t.is(response.statusCode, 403, 'returns 403 status')
          t.is(response.result.errors.length, 1, 'returns one error')
          t.is(response.result.errors[0].title, 'Forbidden', 'returns "Forbidden" error')

          clock.uninstall()
          t.end()
        })
      })

      subGroup.end()
    })

    group.end()
  })

  test('GET /session', function (group) {
    couchdbErrorTests(server, group, couchdbGetUserMock, getSessionRouteOptions)

    group.test('No Authorization header sent', function (t) {
      server.inject({
        method: 'GET',
        url: '/session',
        headers: {}
      }, function (response) {
        t.is(response.statusCode, 403, 'returns 403 status')
        t.end()
      })
    })

    group.test('User not found', function (t) {
      var couchdb = couchdbGetUserMock.reply(404, {error: 'Not Found'})

      server.inject(getSessionRouteOptions, function (response) {
        t.is(response.statusCode, 404, 'returns 404 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Not Found', 'returns "Not Found" error')
        t.doesNotThrow(couchdb.done, 'CouchDB received request')
        t.end()
      })
    })

    group.test('User found', function (subGroup) {
      subGroup.test('Session valid', function (t) {
        couchdbGetUserMock.reply(200, {
          name: 'pat-doe',
          roles: [
            'id:userid123', 'mycustomrole'
          ],
          salt: 'salt123'
        })

        var sessionResponse = require('../fixtures/session-response.json')

        server.inject(getSessionRouteOptions, function (response) {
          delete response.result.meta
          t.is(response.statusCode, 200, 'returns 200 status')
          t.deepEqual(response.result, sessionResponse, 'returns the right content')
          t.end()
        })
      })

      subGroup.test('Session invalid', function (t) {
        couchdbGetUserMock.reply(200, {
          name: 'pat-doe',
          roles: [
            'id:userid123', 'mycustomrole'
          ],
          salt: 'salt123'
        })

        var requestOptions = merge({}, getSessionRouteOptions, {
          headers: {
            // Token calculated with invalid salt (salt456)
            authorization: 'Bearer cGF0LWRvZToxMjc1MDA6YMtzOJDSC7iTA4cB2kjfjqbfk1Y'
          }
        })

        server.inject(requestOptions, function (response) {
          t.is(response.statusCode, 404, 'returns 404 status')
          t.is(response.result.errors.length, 1, 'returns one error')
          t.is(response.result.errors[0].title, 'Not Found', 'returns "Not Found" error')
          t.end()
        })
      })

      subGroup.end()
    })

    group.test('User is admin', function (t) {
      var requestOptions = merge({}, getSessionRouteOptions, {
        headers: {
          // calculateSessionId('admin', '1081b31861bd1e91611341da16c11c16a12c13718d1f712e', 'secret', 1209600)
          authorization: 'Bearer YWRtaW46MTI3NTAwOh08V1EljPqAPAnv8mtxWNF87zdW'
        }
      })

      var sessionAdminResponse = require('../fixtures/session-admin-response.json')

      server.inject(requestOptions, function (response) {
        delete response.result.meta
        t.is(response.statusCode, 200, 'returns 200 status')
        t.deepEqual(response.result, sessionAdminResponse, 'returns the right content')
        t.end()
      })
    })

    group.end()
  })

  test('GET /session?include=account.profile', function (group) {
    group.test('User found & Session valid', function (t) {
      couchdbGetUserMock.reply(200, {
        name: 'pat-doe',
        roles: [
          'id:userid123', 'mycustomrole'
        ],
        profile: {
          fullName: 'pat Doe',
          email: 'pat@example.com'
        },
        salt: 'salt123'
      })

      var routeOptions = merge({}, getSessionRouteOptions, {
        url: '/session?include=account.profile'
      })

      var sessionWithProfileResponse = require('../fixtures/session-with-profile-response.json')

      server.inject(routeOptions, function (response) {
        delete response.result.meta
        t.is(response.statusCode, 200, 'returns 200 status')

        t.deepEqual(response.result, sessionWithProfileResponse, 'returns the right content')
        t.end()
      })
    })

    group.end()
  })

  test('GET /session?include=foobar', function (t) {
    t.plan(1)

    var routeOptions = merge({}, getSessionRouteOptions, {
      url: '/session?include=foobar'
    })

    server.inject(routeOptions, function (response) {
      t.is(response.statusCode, 403, 'returns 403 status')
    })
  })

  test('DELETE /session', function (group) {
    couchdbErrorTests(server, group, couchdbGetUserMock, deleteSessionRouteOptions)

    group.test('No Authorization header sent', function (t) {
      var requestOptions = merge({}, deleteSessionRouteOptions)
      delete requestOptions.headers.authorization

      server.inject(requestOptions, function (response) {
        t.is(response.statusCode, 403, 'returns 403 status')
        t.end()
      })
    })

    group.test('User not found', function (t) {
      var couchdb = couchdbGetUserMock.reply(404, {error: 'Not Found'})

      server.inject(deleteSessionRouteOptions, function (response) {
        t.is(response.statusCode, 404, 'returns 404 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Not Found', 'returns "Not Found" error')
        t.doesNotThrow(couchdb.done, 'CouchDB received request')
        t.end()
      })
    })

    group.test('User found', function (subGroup) {
      function couchdbUserFoundMock () {
        return couchdbGetUserMock.reply(200, {
          name: 'pat-doe',
          roles: [
            'id:userid123', 'mycustomrole'
          ],
          salt: 'salt123'
        })
      }
      subGroup.test('Session valid', function (t) {
        var couchdb = couchdbUserFoundMock()

        server.inject(deleteSessionRouteOptions, function (response) {
          t.is(response.statusCode, 204, 'returns 204 status')
          t.doesNotThrow(couchdb.done, 'CouchDB received request')
          t.end()
        })
      })

      subGroup.test('Session invalid', function (t) {
        var couchdb = couchdbUserFoundMock()

        var requestOptions = merge({}, deleteSessionRouteOptions, {
          headers: {
            // Token calculated with invalid salt (salt456)
            authorization: 'Bearer cGF0LWRvZToxMjc1MDA6YMtzOJDSC7iTA4cB2kjfjqbfk1Y'
          }
        })

        server.inject(requestOptions, function (response) {
          t.is(response.statusCode, 404, 'returns 404 status')
          t.is(response.result.errors.length, 1, 'returns one error')
          t.is(response.result.errors[0].title, 'Not Found', 'returns "Not Found" error')
          t.doesNotThrow(couchdb.done, 'CouchDB received request')
          t.end()
        })
      })

      subGroup.end()
    })

    group.end()
  })

  test('DELETE /session?include=account', function (group) {
    var routeOptions = merge({}, deleteSessionRouteOptions, {
      url: '/session?include=account'
    })

    group.test('User found', function (subGroup) {
      function couchdbUserFoundMock () {
        return couchdbGetUserMock.reply(200, {
          name: 'pat-doe',
          roles: [
            'id:userid123', 'mycustomrole'
          ],
          salt: 'salt123'
        })
      }
      subGroup.test('Session valid', function (t) {
        var couchdb = couchdbUserFoundMock()

        var sessionResponse = require('../fixtures/session-response.json')

        server.inject(routeOptions, function (response) {
          delete response.result.meta
          t.is(response.statusCode, 200, 'returns 200 status')
          t.deepEqual(response.result, sessionResponse, 'returns the right content')
          t.doesNotThrow(couchdb.done, 'CouchDB received request')
          t.end()
        })
      })

      subGroup.end()
    })

    group.end()
  })

  test('DELETE /session?include=account.profile', function (group) {
    var routeOptions = merge({}, deleteSessionRouteOptions, {
      url: '/session?include=account.profile'
    })

    group.test('User found', function (subGroup) {
      function couchdbUserFoundMock () {
        return couchdbGetUserMock.reply(200, {
          name: 'pat-doe',
          roles: [
            'id:userid123', 'mycustomrole'
          ],
          salt: 'salt123',
          profile: {
            fullName: 'pat Doe',
            email: 'pat@example.com'
          }
        })
      }

      subGroup.test('Session valid', function (t) {
        var couchdb = couchdbUserFoundMock()

        var sessionWithProfileResponse = require('../fixtures/session-with-profile-response.json')

        server.inject(routeOptions, function (response) {
          delete response.result.meta
          t.is(response.statusCode, 200, 'returns 200 status')
          t.deepEqual(response.result, sessionWithProfileResponse, 'returns the right content')
          t.doesNotThrow(couchdb.done, 'CouchDB received request')
          t.end()
        })
      })

      subGroup.end()
    })

    group.end()
  })
})
