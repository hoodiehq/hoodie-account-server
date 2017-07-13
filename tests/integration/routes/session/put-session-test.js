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

function mockCouchDbUserDocFoundByToken () {
  return nock('http://localhost:5984')
    .get('/_users/_design/byToken/_view/byToken')
    .query({
      include_docs: true,
      key: '"token123"'
    })
    .reply(200, {
      total_rows: 1,
      offset: 0,
      rows: [
        {
          id: 'org.couchdb.user:pat-doe',
          key: 'token123',
          value: {
            type: 'login',
            createdAt: '2015-11-01T00:00:00.000Z',
            expiresAt: '2015-11-15T00:00:00.000Z'
          },
          doc: {
            _id: 'org.couchdb.user:pat-doe',
            _rev: '1-234',
            password_scheme: 'pbkdf2',
            iterations: 10,
            type: 'user',
            name: 'pat-doe',
            roles: ['id:userid123', 'mycustomrole'],
            derived_key: '4b5c9721ab77dd2faf06a36785fd0a30f0bf0d27',
            salt: 'salt123',
            tokens: {
              token123: {
                type: 'login',
                createdAt: '2015-11-01T00:00:00.000Z',
                expiresAt: '2017-11-15T00:00:00.000Z',
                contact: 'pat@example.com'
              }
            }
          }
        }
      ]
    })
    .put('/_users/org.couchdb.user%3Apat-doe', function (body) {
      return !body.tokens.token123
    })
    .query(true)
    .reply(201, {
      ok: true,
      id: 'org.couchdb.user:pat-doe',
      rev: '2-3456'
    })
}

test('PUT /session', function (group) {
  group.beforeEach(getServer)

  authorizationHeaderNotAllowedErrorTest(group, routeOptions)
  couchdbErrorTests(group, couchdbGetUserMock, routeOptions)
  invalidTypeErrors(group, routeOptions, 'session')

  group.test('token', function (subGroup) {
    var sessionResponse = require('../../fixtures/session-response.json')

    subGroup.test('valid', function (t) {
      var clock = lolex.install({now: 0, toFake: ['Date']})
      mockCouchDbUserDocFoundByToken()
      // nock.recorder.rec

      var options = _.cloneDeep(routeOptions)
      options.payload.data.attributes = {
        token: 'token123'
      }

      this.server.inject(options, function (response) {
        delete response.result.meta
        t.is(response.statusCode, 201, 'returns 201 status')
        t.deepEqual(response.result.data.id, sessionResponse.data.id, 'returns the right content')

        clock.uninstall()
        t.end()
      })
    })

    subGroup.end()
  })

  group.test('User Found by username', function (subGroup) {
    var sessionResponse = require('../../fixtures/session-response.json')

    subGroup.test('Valid password', function (t) {
      var clock = lolex.install({now: 0, toFake: ['Date']})
      mockCouchDbUserDocFound()

      this.server.inject(routeOptions, function (response) {
        delete response.result.meta
        t.is(response.statusCode, 201, 'returns 201 status')
        t.deepEqual(response.result.data.id, sessionResponse.data.id, 'returns the right content')

        clock.uninstall()
        t.end()
      })
    })

    subGroup.test('Invalid password', function (t) {
      var clock = lolex.install({now: 0, toFake: ['Date']})
      var couchdb = mockCouchDbUserDocFound()

      var options = _.defaultsDeep({
        payload: {
          data: {
            attributes: {
              password: 'invalidsecret'
            }
          }
        }
      }, routeOptions)

      this.server.inject(options, function (response) {
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

      this.server.inject(routeOptions, function (response) {
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

    this.server.inject(routeOptions, function (response) {
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
      var clock = lolex.install({now: 0, toFake: ['Date']})

      var options = _.defaultsDeep({
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

      this.server.inject(options, function (response) {
        delete response.result.meta
        t.is(response.statusCode, 201, 'returns 201 status')
        t.deepEqual(response.result, adminSessionResponse, 'returns the right content')

        clock.uninstall()
        t.end()
      })
    })

    subGroup.test('Invalid password', function (t) {
      var clock = lolex.install({now: 0, toFake: ['Date']})

      var options = _.defaultsDeep({
        payload: {
          data: {
            attributes: {
              username: 'admin',
              password: 'invalidsecret'
            }
          }
        }
      }, routeOptions)

      this.server.inject(options, function (response) {
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

test('PUT /session?include=account.profile', function (group) {
  var putSessionRouteWithProfileOptions = _.defaultsDeep({
    url: '/session?include=account.profile'
  }, routeOptions)

  group.beforeEach(getServer)

  group.test('User Found', function (subGroup) {
    var sessionWithProfileResponse = require('../../fixtures/session-with-profile-response.json')

    subGroup.test('Valid password', function (t) {
      var clock = lolex.install({now: 0, toFake: ['Date']})
      mockCouchDbUserDocFound({
        profile: {
          fullName: 'pat Doe',
          email: 'pat@example.com'
        }
      })

      this.server.inject(putSessionRouteWithProfileOptions, function (response) {
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
      var clock = lolex.install({now: 0, toFake: ['Date']})

      var options = _.defaultsDeep({
        payload: {
          data: {
            attributes: {
              username: 'admin',
              password: 'secret'
            }
          }
        }
      }, putSessionRouteWithProfileOptions)

      this.server.inject(options, function (response) {
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

test('PUT /session with uppercase letter (hoodiehq/hoodie#499)', function (t) {
  getServer(function (error, server) {
    t.error(error)

    var options = _.defaultsDeep({
      payload: {
        data: {
          attributes: {
            username: 'Pat-doe'

          }
        }
      }
    }, routeOptions)

    var sessionResponse = require('../../fixtures/session-response.json')
    var clock = lolex.install({now: 0, toFake: ['Date']})
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
