var nock = require('nock')
var test = require('tap').test

var getServer = require('../utils/get-server')
var couchdbErrorTests = require('../utils/couchdb-error-tests')

getServer(function (error, server) {
  if (error) {
    return test.fail(error)
  }

  test('PUT /session/account', function (group) {
    var putAccountRouteOptions = {
      method: 'PUT',
      url: '/session/account',
      payload: {
        username: 'john',
        password: 'secret'
      }
    }
    function putAccountResponseMock () {
      return nock('http://localhost:5984')
        // mock valid response to sign in request
        .post('/_session', {
          name: putAccountRouteOptions.payload.username,
          password: putAccountRouteOptions.payload.password
        })
        .reply(201, {
          ok: true,
          name: null,
          roles: []
        }, {
          'Set-Cookie': ['AuthSession=123; Version=1; Expires=Tue, 08-Sep-2015 00:35:52 GMT; Max-Age=1209600; Path=/; HttpOnly']
        })
        // send create _users doc request
        .put('/_users/org.couchdb.user%3Ajohn', {
          name: putAccountRouteOptions.payload.username,
          password: putAccountRouteOptions.payload.password,
          roles: [],
          type: 'user'
        })
    }

    group.test('CouchDB User does not exist', function (t) {
      t.plan(4)

      var couchdb = putAccountResponseMock()
        .reply(201, {
          ok: true,
          id: 'org.couchdb.user:funky',
          rev: '1-abc'
        })

      server.inject(putAccountRouteOptions, function (response) {
        t.is(response.statusCode, 201, 'returns 401 status')
        t.is(response.result.username, 'john', 'returns username')
        t.is(response.result.session.id, '123', 'returns session.id')
        t.doesNotThrow(couchdb.done, 'CouchDB received request')
      })
    })

    group.test('CouchDB User already exist', function (t) {
      t.plan(3)

      putAccountResponseMock()
        .reply(409, {
          error: 'conflict',
          reason: 'Document update conflict.'
        })

      server.inject(putAccountRouteOptions, function (response) {
        t.is(response.statusCode, 409, 'returns 401 status')
        t.is(response.result.error, 'Conflict', 'returns "Conflict" error')
        t.is(response.result.message, 'Document update conflict.', 'returns "Document update conflict." error message')
      })
    })

    couchdbErrorTests(server, group, putAccountResponseMock, putAccountRouteOptions)

    group.end()
  })

  test('GET /session/account', function (group) {
    var putAccountRouteOptions = {
      method: 'GET',
      url: '/session/account',
      headers: {
        authorization: 'Bearer 123'
      }
    }
    function getAccountResponseMock () {
      return nock('http://localhost:5984')
        // mock valid response to sign in request
        .get('/_users/org.couchdb.user%3Ajohn')
        .reply(200, {
          _id: 'org.couchdb.user:john',
          _rev: '1-abc',
          name: 'john',
          type: 'user',
          roles: []
        })
        .get('/_session')
    }

    group.test('Session does exist', function (t) {
      t.plan(2)

      getAccountResponseMock()
        // has session
        .reply(200, {
          userCtx: { name: 'john' }
        })

      server.inject(putAccountRouteOptions, function (response) {
        t.is(response.statusCode, 200, 'returns 401 status')
        t.is(response.result.username, 'john', 'returns username')
      })
    })

    group.test('Session does not exist', function (t) {
      t.plan(2)

      getAccountResponseMock()
        // has session
        .reply(200, {
          userCtx: { name: null }
        })

      server.inject(putAccountRouteOptions, function (response) {
        t.is(response.statusCode, 404, 'returns 401 status')
        t.is(response.result.error, 'Not Found', 'returns "Not Found" error')
      })
    })

    couchdbErrorTests(server, group, getAccountResponseMock, putAccountRouteOptions)

    group.end()
  })

  test('DELETE /session/account', function (group) {
    var deleteAccountRouteOptions = {
      method: 'DELETE',
      url: '/session/account',
      headers: {
        authorization: 'Bearer 123'
      }
    }
    function deleteAccountResponseMock () {
      return nock('http://localhost:5984')
        // mock valid response to sign in request
        .delete('/_users/org.couchdb.user%3Ajohn')
        .reply(202, {
          ok: true,
          id: 'org.couchdb.user:john',
          rev: '2-def'
        })
        .get('/_session')
    }

    group.test('Session does exist', function (t) {
      t.plan(2)

      deleteAccountResponseMock()
        // has session
        .reply(200, {
          userCtx: { name: 'john' }
        })

      server.inject(deleteAccountRouteOptions, function (response) {
        t.is(response.statusCode, 204, 'returns 204 status')
        t.is(response.result, null, 'returns no body')
      })
    })

    group.test('Session does not exist', function (t) {
      t.plan(2)

      deleteAccountResponseMock()
        // has session
        .reply(200, {
          userCtx: { name: null }
        })

      server.inject(deleteAccountRouteOptions, function (response) {
        t.is(response.statusCode, 404, 'returns 404 status')
        t.is(response.result.error, 'Not Found', 'returns "Not Found" error')
      })
    })

    couchdbErrorTests(server, group, deleteAccountResponseMock, deleteAccountRouteOptions)

    group.end()
  })
})
