var nock = require('nock')
var test = require('tap').test

var getServer = require('../utils/get-server')
var couchdbErrorTests = require('../utils/couchdb-error-tests')

getServer(function (error, server) {
  if (error) {
    return test.fail(error)
  }

  test('PUT /session', function (group) {
    var postSessionRouteOptions = {
      method: 'PUT',
      url: '/session',
      payload: {
        username: 'john@example.com',
        password: 'secret'
      }
    }
    function postSessionResponseMock () {
      return nock('http://localhost:5984').post('/_session', {
        name: postSessionRouteOptions.payload.username,
        password: postSessionRouteOptions.payload.password
      })
    }

    group.test('CouchDB User does no exist', function (t) {
      t.plan(4)

      var couchdb = postSessionResponseMock()
        .reply(401, {
          error: 'unauthorized',
          reason: 'Name or password is incorrect.'
        })

      server.inject(postSessionRouteOptions, function (response) {
        t.is(response.statusCode, 401, 'returns 401 status')
        t.is(response.result.error, 'Unauthorized', '"Unauthorized" error')
        t.is(response.result.message, 'Name or password is incorrect.', '"Name or password is incorrect." message')
        t.doesNotThrow(couchdb.done, 'CouchDB received request')
      })
    })

    group.test('CouchDB User does exist', function (t) {
      postSessionResponseMock().reply(201, {
        ok: true,
        name: null,
        roles: []
      }, {
        'Set-Cookie': ['AuthSession=123; Version=1; Expires=Tue, 08-Sep-2015 00:35:52 GMT; Max-Age=1209600; Path=/; HttpOnly']
      })

      server.inject(postSessionRouteOptions, function (response) {
        t.is(response.statusCode, 201, 'returns 201 status')
        t.is(response.result.id, '123', 'returns session id')
        t.end()
      })
    })

    couchdbErrorTests(server, group, postSessionResponseMock, postSessionRouteOptions)

    group.end()
  })

  test('GET /session', function (group) {
    var getSessionRouteOptions = {
      method: 'GET',
      url: '/session',
      headers: {
        authorization: 'Bearer 123'
      }
    }
    function getSessionResponseMock () {
      return nock('http://localhost:5984').get('/_session')
    }

    group.test('CouchDB Session does no exist', function (t) {
      t.plan(3)

      var couchdb = getSessionResponseMock()
        .reply(200, {
          userCtx: { name: null }
        })

      server.inject(getSessionRouteOptions, function (response) {
        t.is(response.statusCode, 404, 'returns 404 status')
        t.is(response.result.error, 'Not Found', '"Not Found" error')
        t.doesNotThrow(couchdb.done, 'CouchDB received request')
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
      headers: {
        authorization: 'Bearer 123'
      }
    }
    function deleteSessionResponseMock () {
      return nock('http://localhost:5984').delete('/_session')
    }

    // CouchDB response is the same, no matter if session existed or not
    group.test('CouchDB responds', function (t) {
      t.plan(2)

      var couchdb = deleteSessionResponseMock()
        .reply(200, {
          ok: true
        }, {
          'Set-Cookie': 'AuthSession=; Version=1; Path=/; HttpOnly'
        })

      server.inject(deleteSessionRouteOptions, function (response) {
        t.is(response.statusCode, 204, 'returns 204 status')
        t.doesNotThrow(couchdb.done, 'CouchDB received request')
      })
    })

    couchdbErrorTests(server, group, deleteSessionResponseMock, deleteSessionRouteOptions)

    group.end()
  })
})
