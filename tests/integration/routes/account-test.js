var _ = require('lodash')
var Joi = require('joi')
var nock = require('nock')
var test = require('tap').test

var authorizationHeaderNotAllowedErrorTest = require('../utils/authorization-header-not-allowed-error')
var couchdbErrorTests = require('../utils/couchdb-error-tests')
var getServer = require('../utils/get-server')
var invalidTypeErrors = require('../utils/invalid-type-errors.js')

var jsonAPIHeaders = {
  accept: 'application/vnd.api+json',
  'content-type': 'application/vnd.api+json'
}
var headersWithAuth = _.merge({authorization: 'Bearer cGF0LWRvZToxMjc1MDA6zEZsQ1BuO-W8SthDSrg8KXQ8OlQ'}, jsonAPIHeaders)

var putAccountRouteOptions = {
  method: 'PUT',
  url: '/session/account',
  headers: jsonAPIHeaders,
  payload: {
    data: {
      type: 'account',
      attributes: {
        username: 'pat-doe',
        password: 'secret'
      }
    }
  }
}

var getAccountRouteOptions = {
  method: 'GET',
  url: '/session/account',
  headers: headersWithAuth
}

var deleteAccountRouteOptions = {
  method: 'DELETE',
  url: '/session/account',
  headers: headersWithAuth
}

var couchdbPutUserMock = nock('http://localhost:5984')
  .post('/_users/_bulk_docs', function (body) {
    return Joi.object({
      _id: Joi.any().only('org.couchdb.user:pat-doe').required(),
      name: Joi.any().only('pat-doe').required(),
      type: Joi.any().only('user').required(),
      salt: Joi.string().required(),
      derived_key: Joi.string().required(),
      iterations: Joi.any().only(10).required(),
      password_scheme: Joi.any().only('pbkdf2').required(),
      roles: Joi.array().items(Joi.string().regex(/^id:[0-9a-f]{12}$/)).max(1).min(1)
    }).validate(body.docs[0]).error === null
  })
  .query(true)

var couchdbGetUserMock = nock('http://localhost:5984')
  .get('/_users/org.couchdb.user%3Apat-doe')
  .query(true)

function mockUserFound (docChange) {
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

getServer(function (error, server) {
  if (error) {
    return test('test setup', function (t) {
      t.error(error)
      t.end()
    })
  }

  test('PUT /session/account', function (group) {
    couchdbErrorTests(server, group, couchdbPutUserMock, putAccountRouteOptions)
    invalidTypeErrors(server, group, putAccountRouteOptions)

    group.test('User not found', function (t) {
      var couchdb = couchdbPutUserMock
        .reply(201, [{
          id: 'org.couchdb.user:pat-doe',
          rev: '1-234'
        }])

      var accountFixture = require('../fixtures/account.json')

      server.inject(putAccountRouteOptions, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'CouchDB received request')
        delete response.result.meta

        t.is(response.statusCode, 201, 'returns 201 status')
        t.ok(/^[0-9a-f]{12}$/.test(response.result.data.id), 'sets id')
        response.result.data.id = 'userid123'
        response.result.data.relationships.profile.data.id = 'userid123-profile'
        t.deepEqual(response.result, accountFixture, 'returns account in right format')
        t.end()
      })
    })

    group.test('CouchDB User already exist', function (t) {
      var couchdb = couchdbPutUserMock
        .reply(201, [{
          id: 'org.couchdb.user:pat-doe',
          error: 'conflict',
          reason: 'Document update conflict'
        }])

      server.inject(putAccountRouteOptions, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'CouchDB received request')

        t.is(response.statusCode, 409, 'returns 409 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Conflict', 'returns "Conflict" error')
        t.is(response.result.errors[0].detail, 'Document update conflict', 'returns "Document update conflict." error message')
        t.end()
      })
    })

    group.end()
  })

  test('GET /session/account', function (group) {
    authorizationHeaderNotAllowedErrorTest(server, group, putAccountRouteOptions)
    couchdbErrorTests(server, group, couchdbGetUserMock, getAccountRouteOptions)

    group.test('Session does exist', function (t) {
      var couch = mockUserFound()
      var accountFixture = require('../fixtures/account.json')

      server.inject(getAccountRouteOptions, function (response) {
        t.is(couch.pendingMocks()[0], undefined, 'all mocks satisfied')

        delete response.result.meta
        t.is(response.statusCode, 200, 'returns 200 status')
        t.deepEqual(response.result, accountFixture, 'returns account in right format')
        t.end()
      })
    })

    group.test('Session does not exist', {todo: true}, function (t) {
      var couch = couchdbGetUserMock
        .reply(404, {error: 'Not Found'})

      server.inject(getAccountRouteOptions, function (response) {
        t.is(couch.pendingMocks()[0], undefined, 'all mocks satisfied')

        t.is(response.statusCode, 404, 'returns 404 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Not Found', 'returns "Not Found" error')
        t.end()
      })
    })

    group.test('User Is admin', function (t) {
      var requestOptions = _.defaultsDeep({
        headers: {
          // calculateSessionId('admin', '1081b31861bd1e91611341da16c11c16a12c13718d1f712e', 'secret', 1209600)
          authorization: 'Bearer YWRtaW46MTI3NTAwOh08V1EljPqAPAnv8mtxWNF87zdW'
        }
      }, getAccountRouteOptions)

      server.inject(requestOptions, function (response) {
        delete response.result.meta
        t.is(response.statusCode, 403, 'returns 403 status')

        t.deepEqual(response.result.errors[0].detail, 'Admins have no account', 'returns account in right format')
        t.end()
      })
    })

    group.end()
  })

  test('GET /session/account?include=profile', function (group) {
    group.test('Session does exist', function (t) {
      var couch = mockUserFound({
        profile: {
          fullName: 'pat Doe',
          email: 'pat@example.com'
        }
      })
      var accountWithProfileFixture = require('../fixtures/account-with-profile.json')
      var requestOptions = _.defaultsDeep({
        url: '/session/account?include=profile'
      }, getAccountRouteOptions)

      server.inject(requestOptions, function (response) {
        t.is(couch.pendingMocks()[0], undefined, 'all mocks satisfied')

        delete response.result.meta
        t.is(response.statusCode, 200, 'returns 200 status')
        t.deepEqual(response.result.included, accountWithProfileFixture.included, 'returns account in right format')
        t.end()
      })
    })

    group.end()
  })

  test('PATCH /session/account', {todo: true}, function (t) {
    // couchdbErrorTests(server, group, couchdbPutUserMock, patchAccountRouteOptions)
    // invalidTypeErrors(server, group, patchAccountRouteOptions)

    t.end()
  })

  test('PATCH /session/account?include=profile', {todo: true}, function (t) {
    t.end()
  })

  test('DELETE /session/account', function (group) {
    group.test('with valid session', function (t) {
      // first mock is for validating session, 2nd is to get _rev for delete
      mockUserFound()
      var couch = mockUserFound({_rev: '1-234'})
        .post('/_users/_bulk_docs', function (body) {
          return Joi.object({
            _id: Joi.any().only('org.couchdb.user:pat-doe').required(),
            _rev: '1-234',
            _deleted: true,
            name: Joi.any().only('pat-doe').required(),
            type: Joi.any().only('user').required(),
            salt: Joi.string().required(),
            derived_key: Joi.string().required(),
            iterations: Joi.any().only(10).required(),
            password_scheme: Joi.any().only('pbkdf2').required(),
            roles: Joi.array().items(Joi.string())
          }).validate(body.docs[0]).error === null
        })
        .query(true)
        .reply(201, [{
          id: 'org.couchdb.user:pat-doe',
          rev: '2-3456'
        }])

      server.inject(deleteAccountRouteOptions, function (response) {
        t.is(couch.pendingMocks()[0], undefined, 'all mocks satisfied')

        t.is(response.statusCode, 204, 'returns 204 status')
        t.is(response.result, null, 'returns no body')
        t.end()
      })
    })

    group.test('without valid session', function (t) {
      var couch = couchdbGetUserMock
        .reply(404, {error: 'Not Found'})

      server.inject(deleteAccountRouteOptions, function (response) {
        t.is(couch.pendingMocks()[0], undefined, 'all mocks satisfied')
        t.is(response.statusCode, 404, 'returns 404 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Not Found', 'returns "Not Found" error')

        t.end()
      })
    })

    couchdbErrorTests(server, group, couchdbGetUserMock, deleteAccountRouteOptions)

    group.end()
  })

  test('DELETE /session/account?include=profile', {todo: true}, function (t) {
    t.end()
  })
})
