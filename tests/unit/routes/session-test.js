var nock = require('nock')
var test = require('tap').test
var lodash = require('lodash')

var getServer = require('../utils/get-server')
var couchdbErrorTests = require('../utils/couchdb-error-tests')
var authorizationHeaderNotAllowedErrorTest = require('../utils/authorization-header-not-allowed-error')

getServer(function (error, server) {
  if (error) {
    return test.fail(error)
  }

  var jsonAPIHeaders = {
    accept: 'application/vnd.api+json',
    'content-type': 'application/vnd.api+json'
  }

  var headersWithAuth = lodash.merge({authorization: 'Bearer 123'}, jsonAPIHeaders)

  test('PUT /session', function (group) {
    var postSessionRouteOptions = {
      method: 'PUT',
      url: '/session',
      headers: jsonAPIHeaders,
      payload: {
        data: {
          type: 'session',
          attributes: {
            username: 'john',
            password: 'secret'
          }
        }
      }
    }
    function postSessionResponseMock () {
      return nock('http://localhost:5984').post('/_session', {
        name: postSessionRouteOptions.payload.data.attributes.username,
        password: postSessionRouteOptions.payload.data.attributes.password
      })
    }

    authorizationHeaderNotAllowedErrorTest(server, group, postSessionRouteOptions, headersWithAuth)

    group.test('CouchDB User does no exist', function (t) {
      var couchdb = postSessionResponseMock()
        .reply(401, {
          error: 'unauthorized',
          reason: 'Name or password is incorrect.'
        })

      server.inject(postSessionRouteOptions, function (response) {
        t.is(response.statusCode, 401, 'returns 401 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Unauthorized', 'returns "Unauthorized" error')
        t.is(response.result.errors[0].detail, 'Name or password is incorrect.', 'returns "Name or password is incorrect." message')
        t.doesNotThrow(couchdb.done, 'CouchDB received request')
        t.end()
      })
    })

    couchdbErrorTests(server, group, postSessionResponseMock, postSessionRouteOptions)

    group.test('Session was created', function (t) {
      postSessionResponseMock().reply(201, {
        ok: true,
        name: null,
        roles: []
      }, {
        'Set-Cookie': ['AuthSession=sessionid123; Version=1; Expires=Tue, 08-Sep-2015 00:35:52 GMT; Max-Age=1209600; Path=/; HttpOnly']
      }).get('/_users/org.couchdb.user:jane-doe').reply(201, {
        _id: 'org.couchdb.user:jane-doe',
        _rev: '1-123',
        name: 'jane-doe',
        roles: [],
        accountId: 'abc1234',
        profile: {}
      })

      var sessionResponse = require('../fixtures/session-response.json')

      server.inject(postSessionRouteOptions, function (response) {
        delete response.result.meta
        t.is(response.statusCode, 201, 'returns 201 status')
        t.deepEqual(response.result, sessionResponse, 'returns the right content')
        t.end()
      })
    })

    group.end()
  })

  test('GET /session', function (group) {
    var getSessionRouteOptions = {
      method: 'GET',
      url: '/session',
      headers: headersWithAuth
    }

    function getSessionResponseMock () {
      return nock('http://localhost:5984').get('/_session')
    }

    group.test('CouchDB Session does no exist', function (t) {
      var couchdb = getSessionResponseMock()
        .reply(200, {
          userCtx: { name: null }
        })

      server.inject(getSessionRouteOptions, function (response) {
        t.is(response.statusCode, 404, 'returns 404 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Not Found', 'returns "Not Found" error')
        t.doesNotThrow(couchdb.done, 'CouchDB received request')
        t.end()
      })
    })

    group.test('CouchDB Session does exist', function (t) {
      getSessionResponseMock().reply(200, {
        userCtx: { name: 'john@example.com' }
      })

      server.inject(getSessionRouteOptions, function (response) {
        t.is(response.statusCode, 200, 'returns 200 status')
        t.is(response.result.id, '123', 'returns session id')
        t.end()
      })
    })

    couchdbErrorTests(server, group, getSessionResponseMock, getSessionRouteOptions)

    group.end()
  })

  test('DELETE /session', function (group) {
    var deleteSessionRouteOptions = {
      method: 'DELETE',
      url: '/session',
      headers: headersWithAuth
    }
    function deleteSessionResponseMock () {
      return nock('http://localhost:5984').delete('/_session')
    }

    // CouchDB response is the same, no matter if session existed or not
    group.test('CouchDB responds', function (t) {
      var couchdb = deleteSessionResponseMock()
        .reply(200, {
          ok: true
        }, {
          'Set-Cookie': 'AuthSession=; Version=1; Path=/; HttpOnly'
        })

      server.inject(deleteSessionRouteOptions, function (response) {
        t.is(response.statusCode, 204, 'returns 204 status')
        t.doesNotThrow(couchdb.done, 'CouchDB received request')
        t.end()
      })
    })

    couchdbErrorTests(server, group, deleteSessionResponseMock, deleteSessionRouteOptions)

    group.end()
  })
})
