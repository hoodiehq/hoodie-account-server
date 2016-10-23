var _ = require('lodash')
var Joi = require('joi')
var nock = require('nock')
var test = require('tap').test
var cloneDeep = require('lodash/cloneDeep')

var getServer = require('../../utils/get-server')
var couchdbErrorTests = require('../../utils/couchdb-error-tests')
var invalidTypeErrors = require('../../utils/invalid-type-errors.js')

var routeOptions = {
  method: 'POST',
  url: '/accounts',
  headers: {
    accept: 'application/vnd.api+json',
    // calculateSessionId('admin', '1081b31861bd1e91611341da16c11c16a12c13718d1f712e', 'secret', 1209600)
    authorization: 'Session YWRtaW46MTI3NTAwOh08V1EljPqAPAnv8mtxWNF87zdW',
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

var mockCouchDbCreateUserDoc = nock('http://localhost:5984')
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

  test('POST /accounts', function (group) {
    group.test('No Authorization header sent', function (t) {
      server.inject({
        method: 'POST',
        url: '/accounts',
        headers: {}
      }, function (response) {
        t.is(response.statusCode, 401, 'returns 401 status')
        t.is(response.result.error, 'Unauthorized', 'returns "Unauthorized" error')
        t.is(response.result.message, 'Authorization header missing', 'returns "Authorization header missing" error')
        t.end()
      })
    })

    group.test('Not an admin', function (t) {
      server.inject({
        method: 'POST',
        url: '/accounts',
        headers: {
          accept: 'application/vnd.api+json',
          authorization: 'Session cGF0LWRvZToxMjc1MDA6zEZsQ1BuO-W8SthDSrg8KXQ8OlQ',
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
      }, function (response) {
        t.is(response.statusCode, 401, 'returns 401 status')
        t.is(response.result.errors[0].title, 'Unauthorized', 'returns "Unauthorized" error')
        t.is(response.result.errors[0].detail, 'Session invalid', 'returns "Session invalid" error')
        t.end()
      })
    })

    // prepared test for https://github.com/hoodiehq/hoodie-account-server/issues/125
    group.test('Session cannot be found', function (t) {
      var requestOptions = cloneDeep(routeOptions)
      requestOptions.headers.authorization = 'Session YWRtaW46__BOGUS'

      server.inject(requestOptions, function (response) {
        t.is(response.statusCode, 401, 'returns 401 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Unauthorized', 'returns "Unauthorized" error')
        t.is(response.result.errors[0].detail, 'Session invalid', 'returns "Session invalid" error')
        t.end()
      })
    })

    group.test('CouchDB Session valid', function (t) {
      var couchdb = mockCouchDbCreateUserDoc
        .reply(201, {
          ok: true,
          id: 'org.couchdb.user:pat-doe',
          rev: '1-234'
        })

      server.inject(routeOptions, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')
        delete response.result.meta

        t.is(response.statusCode, 201, 'returns 201 status')
        t.is(response.result.data.attributes.username, 'pat-doe', 'returns the right content')
        t.end()
      })
    })

    couchdbErrorTests(server, group, mockCouchDbCreateUserDoc, routeOptions)
    invalidTypeErrors(server, group, routeOptions, 'account')

    group.end()
  })

  test('POST /accounts?include=foobar', function (t) {
    var options = _.defaultsDeep({
      url: '/accounts?include=foobar'
    }, routeOptions)

    server.inject(options, function (response) {
      t.is(response.statusCode, 400, 'returns 400 status')
      t.deepEqual(response.result.errors[0].detail, 'Allowed value for ?include is \'profile\'', 'returns error message')
      t.end()
    })
  })
})
