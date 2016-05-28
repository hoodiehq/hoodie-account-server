var defaultsDeep = require('lodash/defaultsDeep')
var lolex = require('lolex')
var _ = require('lodash')
var nock = require('nock')
var test = require('tap').test

var getServer = require('../../utils/get-server')

var authorizationHeaderNotAllowedErrorTest = require('../../utils/authorization-header-not-allowed-error')
var couchdbErrorTests = require('../../utils/couchdb-error-tests')
var invalidTypeErrors = require('../../utils/invalid-type-errors.js')

var routeOptions = {
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

var couchdbGetUserMock = nock('http://localhost:5984')
  .get('/_users/org.couchdb.user%3Apat-doe')
  .query(true)

function mockCouchDbUserDocFound (docChange) {
  return couchdbGetUserMock
    .reply(200, _.merge({
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

test('PUT /session', function (group) {
  getServer(function (error, server) {
    if (error) {
      group.error(error)
      group.end()
      return
    }

    authorizationHeaderNotAllowedErrorTest(server, group, routeOptions)
    couchdbErrorTests(server, group, couchdbGetUserMock, routeOptions)
    invalidTypeErrors(server, group, routeOptions, 'session')

    group.test('User Found', function (subGroup) {
      var sessionResponse = require('../../fixtures/session-response.json')

      subGroup.test('Valid password', function (t) {
        var clock = lolex.install(0, ['Date'])
        mockCouchDbUserDocFound()

        server.inject(routeOptions, function (response) {
          delete response.result.meta
          t.is(response.statusCode, 201, 'returns 201 status')
          t.deepEqual(response.result.data.id, sessionResponse.data.id, 'returns the right content')

          clock.uninstall()
          t.end()
        })
      })

      subGroup.test('Invalid password', function (t) {
        var clock = lolex.install(0, ['Date'])
        var couchdb = mockCouchDbUserDocFound()

        var options = defaultsDeep({
          payload: {
            data: {
              attributes: {
                password: 'invalidsecret'
              }
            }
          }
        }, routeOptions)

        server.inject(options, function (response) {
          t.is(couchdb.pendingMocks()[0], undefined, 'CouchDB received request')
          t.is(response.statusCode, 401, 'returns 401 status')
          t.is(response.result.errors.length, 1, 'returns one error')
          t.is(response.result.errors[0].title, 'Unauthorized', 'returns "Unauthorized" error')
          t.is(response.result.errors[0].detail, 'Invalid credentials', 'returns "Invalid credentials" message')

          clock.uninstall()
          t.end()
        })
      })

      subGroup.test('Valid password, but user has no id:... role', function (t) {
        var couchdb = mockCouchDbUserDocFound({
          roles: ['mycustomrole']
        })

        server.inject(routeOptions, function (response) {
          delete response.result.meta

          t.is(couchdb.pendingMocks()[0], undefined, 'CouchDB received request')
          t.is(response.statusCode, 403, 'returns 403 status')
          t.is(response.result.errors.length, 1, 'returns one error')
          t.is(response.result.errors[0].title, 'Forbidden', 'returns "Forbidden" error')
          t.is(response.result.errors[0].detail, '"id:..." role missing (https://github.com/hoodiehq/hoodie-account-server/blob/master/how-it-works.md#id-role)')
          t.end()
        })
      })

      subGroup.end()
    })

    group.test('User not found', function (t) {
      var couchdb = couchdbGetUserMock.reply(404, {error: 'Not Found'})

      server.inject(routeOptions, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'CouchDB received request')
        t.is(response.statusCode, 401, 'returns 401 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Unauthorized', 'returns "Unauthorized" error')
        t.is(response.result.errors[0].detail, 'Invalid credentials', 'returns "Invalid credentials" message')

        t.end()
      })
    })

    group.test('User Is admin', function (subGroup) {
      subGroup.test('Valid password', function (t) {
        var clock = lolex.install(0, ['Date'])

        var options = defaultsDeep({
          payload: {
            data: {
              attributes: {
                username: 'admin',
                password: 'secret'
              }
            }
          }
        }, routeOptions)

        var adminSessionResponse = require('../../fixtures/session-admin-response.json')

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

        var options = defaultsDeep({
          payload: {
            data: {
              attributes: {
                username: 'admin',
                password: 'invalidsecret'
              }
            }
          }
        }, routeOptions)

        server.inject(options, function (response) {
          t.is(response.statusCode, 401, 'returns 401 status')
          t.is(response.result.errors.length, 1, 'returns one error')
          t.is(response.result.errors[0].title, 'Unauthorized', 'returns "Unauthorized" error')
          t.is(response.result.errors[0].detail, 'Invalid credentials', 'returns "Invalid credentials" message')

          clock.uninstall()
          t.end()
        })
      })

      subGroup.end()
    })

    group.end()
  })
})

test('PUT /session?include=account.profile', function (group) {
  getServer(function (error, server) {
    if (error) {
      group.error(error)
      group.end()
      return
    }

    var putSessionRouteWithProfileOptions = defaultsDeep({
      url: '/session?include=account.profile'
    }, routeOptions)

    group.test('User Found', function (subGroup) {
      var sessionWithProfileResponse = require('../../fixtures/session-with-profile-response.json')

      subGroup.test('Valid password', function (t) {
        var clock = lolex.install(0, ['Date'])
        mockCouchDbUserDocFound({
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

        var options = defaultsDeep({
          payload: {
            data: {
              attributes: {
                username: 'admin',
                password: 'secret'
              }
            }
          }
        }, putSessionRouteWithProfileOptions)

        server.inject(options, function (response) {
          t.is(response.statusCode, 400, 'returns 400 status')
          t.is(response.result.errors.length, 1, 'returns one error')
          t.is(response.result.errors[0].title, 'Bad Request', 'returns "Bad Request" error')
          t.is(response.result.errors[0].detail, 'Admins have no account', 'returns "Admins have no account" message')

          clock.uninstall()
          t.end()
        })
      })

      subGroup.end()
    })

    group.end()
  })
})

test('PUT /session with uppercase letter (hoodiehq/hoodie#499)', function (t) {
  getServer(function (error, server) {
    if (error) {
      t.error(error)
      t.end()
      return
    }

    var options = defaultsDeep({
      payload: {
        data: {
          attributes: {
            username: 'Pat-doe'

          }
        }
      }
    }, routeOptions)

    var sessionResponse = require('../../fixtures/session-response.json')
    var clock = lolex.install(0, ['Date'])
    mockCouchDbUserDocFound()

    server.inject(options, function (response) {
      delete response.result.meta
      t.is(response.statusCode, 201, 'returns 201 status')
      t.deepEqual(response.result.data.id, sessionResponse.data.id, 'returns the right content')
      clock.uninstall()
      t.end()
    })
  })
})
