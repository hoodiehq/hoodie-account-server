var _ = require('lodash')
var Joi = require('joi')
var nock = require('nock')
var test = require('tap').test

var authorizationHeaderNotAllowedErrorTest = require('../../utils/authorization-header-not-allowed-error')
var couchdbErrorTests = require('../../utils/couchdb-error-tests')
var getServer = require('../../utils/get-server')
var invalidTypeErrors = require('../../utils/invalid-type-errors.js')

var routeOptions = {
  method: 'PUT',
  url: '/session/account',
  headers: {
    accept: 'application/vnd.api+json',
    'content-type': 'application/vnd.api+json'
  },
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

var mockCouchDbPutUser = nock('http://localhost:5984')
  .put('/_users/org.couchdb.user%3Apat-doe', function (body) {
    return Joi.object({
      _id: Joi.any().only('org.couchdb.user:pat-doe').required(),
      name: Joi.any().only('pat-doe').required(),
      type: Joi.any().only('user').required(),
      salt: Joi.string().required(),
      derived_key: Joi.string().required(),
      iterations: Joi.any().only(10).required(),
      password_scheme: Joi.any().only('pbkdf2').required(),
      roles: Joi.array().items(Joi.string().regex(/^id:[0-9a-f-]{36}$/)).max(1).min(1)
    }).validate(body).error === null
  })
  .query(true)

getServer(function (error, server) {
  if (error) {
    return test('test setup', function (t) {
      t.error(error)
      t.end()
    })
  }

  test('PUT /session/account', function (group) {
    couchdbErrorTests(server, group, mockCouchDbPutUser, routeOptions)
    authorizationHeaderNotAllowedErrorTest(server, group, routeOptions)
    invalidTypeErrors(server, group, routeOptions, 'account')

    group.test('User not found', function (t) {
      var couchdb = mockCouchDbPutUser
        .reply(201, {
          ok: true,
          id: 'org.couchdb.user:pat-doe',
          rev: '1-234'
        })

      var accountFixture = require('../../fixtures/account.json')

      server.inject(routeOptions, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'CouchDB received request')
        delete response.result.meta

        t.is(response.statusCode, 201, 'returns 201 status')
        t.ok(/^[0-9a-f-]{36}$/.test(response.result.data.id), 'sets id')
        response.result.data.id = 'userid123'
        response.result.data.relationships.profile.data.id = 'userid123-profile'
        t.deepEqual(response.result, accountFixture, 'returns account in right format')
        t.end()
      })
    })

    group.test('CouchDB User already exists', function (t) {
      var couchdb = mockCouchDbPutUser
        .reply(409, {
          error: 'conflict',
          reason: 'Document update conflict'
        })

      server.inject(routeOptions, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'CouchDB received request')

        t.is(response.statusCode, 409, 'returns 409 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Conflict', 'returns "Conflict" error')
        t.is(response.result.errors[0].detail, 'An account with that username already exists', 'returns "An account with that username already exists." error message')
        t.end()
      })
    })

    group.end()
  })

  test('PUT /session/account?include=foobar', function (t) {
    var options = _.defaultsDeep({
      url: '/session/account?include=foobar'
    }, routeOptions)

    server.inject(options, function (response) {
      t.is(response.statusCode, 400, 'returns 400 status')
      t.deepEqual(response.result.errors[0].detail, 'Allowed value for ?include is \'profile\'', 'returns error message')
      t.end()
    })
  })
})
