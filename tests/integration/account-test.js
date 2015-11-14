var Joi = require('joi')
var lodash = require('lodash')
var nock = require('nock')
var test = require('tap').test

var getServer = require('./utils/get-server')
var couchdbErrorTests = require('./utils/couchdb-error-tests')

getServer(function (error, server) {
  if (error) {
    return test.fail(error)
  }

  var jsonAPIHeaders = {
    accept: 'application/vnd.api+json',
    'content-type': 'application/vnd.api+json'
  }

  var headersWithAuth = lodash.merge({authorization: 'Bearer 123'}, jsonAPIHeaders)

  test('PUT /session/account', function (group) {
    var putAccountRouteOptions = {
      method: 'PUT',
      url: '/session/account',
      headers: jsonAPIHeaders,
      payload: {
        data: {
          type: 'account',
          attributes: {
            username: 'pat',
            password: 'secret'
          }
        }
      }
    }

    function putAccountResponseMock () {
      return nock('http://localhost:5984')
        // send create _users doc request
        .put('/_users/org.couchdb.user:pat', function (body) {
          return Joi.object({
            name: Joi.any().only('pat').required(),
            password: Joi.any().only('secret').required(),
            type: Joi.any().only('user').required(),
            roles: Joi.array().items(Joi.string().regex(/^id:[0-9a-f]{12}$/)).max(1).min(1)
          }).validate(body).error === null
        })
    }

    group.test('CouchDB User does not exist', function (t) {
      t.plan(3)

      putAccountResponseMock()
        .reply(201, {
          ok: true,
          id: 'org.couchdb.user:pat',
          rev: '1-abc'
        })

      var accountFixture = require('./fixtures/account.json')

      server.inject(putAccountRouteOptions, function (response) {
        delete response.result.meta
        t.is(response.statusCode, 201, 'returns 201 status')
        t.match(response.result.data.id, /^[0-9a-f]{12}$/, 'sets id')
        response.result.data.id = 'abc1234'
        response.result.data.relationships.profile.data.id = 'abc1234-profile'
        t.deepEqual(response.result, accountFixture, 'returns account in right format')
      })
    })

    group.test('CouchDB User already exist', function (t) {
      putAccountResponseMock()
        .reply(409, {
          error: 'conflict',
          reason: 'Document update conflict.'
        })

      server.inject(putAccountRouteOptions, function (response) {
        t.is(response.statusCode, 409, 'returns 409 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Conflict', 'returns "Conflict" error')
        t.is(response.result.errors[0].detail, 'Document update conflict.', 'returns "Document update conflict." error message')
        t.end()
      })
    })

    couchdbErrorTests(server, group, putAccountResponseMock, putAccountRouteOptions)

    group.end()
  })

  test('GET /session/account', function (group) {
    var getAccountRouteOptions = {
      method: 'GET',
      url: '/session/account',
      headers: headersWithAuth
    }
    function getAccountResponseMock () {
      return nock('http://localhost:5984')
        // mock valid response to sign in request
        .get('/_users/org.couchdb.user:pat')
        .reply(200, {
          _id: 'org.couchdb.user:pat',
          _rev: '1-abc',
          name: 'pat',
          type: 'user',
          roles: ['id:abc1234']
        })
        .get('/_session')
    }

    group.test('Session does exist', function (t) {
      t.plan(2)

      getAccountResponseMock()
        // has session
        .reply(200, {
          userCtx: {
            name: 'pat',
            roles: ['id:abc1234']
          }
        })

      var accountFixture = require('./fixtures/account.json')

      server.inject(getAccountRouteOptions, function (response) {
        delete response.result.meta
        t.is(response.statusCode, 200, 'returns 200 status')
        t.deepEqual(response.result, accountFixture, 'returns account in right format')
      })
    })

    group.test('Session does not exist', function (t) {
      getAccountResponseMock()
        // has session
        .reply(200, {
          userCtx: { name: null }
        })

      server.inject(getAccountRouteOptions, function (response) {
        t.is(response.statusCode, 404, 'returns 404 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Not Found', 'returns "Not Found" error')
        t.end()
      })
    })

    couchdbErrorTests(server, group, getAccountResponseMock, getAccountRouteOptions)

    group.end()
  })

  test('GET /session/account?include=profile', function (t) {
    t.fail('GET /session/account?include=profile', {
      skip: true
    })
    t.end()
  })

  test('PATCH /session/account', function (t) {
    t.fail('PATCH /session/account', {
      skip: true
    })
    t.end()
  })

  test('PATCH /session/account?include=profile', function (t) {
    t.fail('PATCH /session/account?include=profile', {
      skip: true
    })
    t.end()
  })

  test('DELETE /session/account', function (group) {
    var deleteAccountRouteOptions = {
      method: 'DELETE',
      url: '/session/account',
      headers: headersWithAuth
    }
    function deleteAccountResponseMock () {
      return nock('http://localhost:5984')
        // mock valid response to sign in request
        .delete('/_users/org.couchdb.user:pat')
        .reply(202, {
          ok: true,
          id: 'org.couchdb.user:pat',
          rev: '2-def'
        })
        .get('/_session')
    }

    group.test('with valid session', function (t) {
      t.plan(2)

      deleteAccountResponseMock()
        // has session
        .reply(200, {
          userCtx: {
            name: 'pat',
            roles: ['id:abc1234']
          }
        })

      server.inject(deleteAccountRouteOptions, function (response) {
        t.is(response.statusCode, 204, 'returns 204 status')
        t.is(response.result, null, 'returns no body')
      })
    })

    group.test('without valid session', function (t) {
      t.plan(3)

      deleteAccountResponseMock()
        // has session
        .reply(200, {
          userCtx: { name: null }
        })

      server.inject(deleteAccountRouteOptions, function (response) {
        t.is(response.statusCode, 404, 'returns 404 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Not Found', 'returns "Not Found" error')
      })
    })

    couchdbErrorTests(server, group, deleteAccountResponseMock, deleteAccountRouteOptions)

    group.end()
  })

  test('DELETE /session/account?include=profile', function (t) {
    t.fail('DELETE /session/account?include=profile', {
      skip: true
    })
    t.end()
  })
})
