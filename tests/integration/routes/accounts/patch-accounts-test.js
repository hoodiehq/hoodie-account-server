var _ = require('lodash')
var Joi = require('joi')
var nock = require('nock')
var test = require('tap').test

var getServer = require('../../utils/get-server')
// var couchdbErrorTests = require('../../utils/couchdb-error-tests')
var invalidTypeErrors = require('../../utils/invalid-type-errors.js')

var routeOptions = {
  method: 'PATCH',
  url: '/accounts/abc4567',
  headers: {
    accept: 'application/vnd.api+json',
    // calculateSessionId('admin', '1081b31861bd1e91611341da16c11c16a12c13718d1f712e', 'secret', 1209600)
    authorization: 'Session YWRtaW46MTI3NTAwOh08V1EljPqAPAnv8mtxWNF87zdW',
    'content-type': 'application/vnd.api+json'
  },
  payload: {
    data: {
      type: 'account',
      id: 'abc4567',
      attributes: {
        password: 'newsecret'
      }
    }
  }
}

function mockCouchDbUpdateAccountResponse () {
  return nock('http://localhost:5984')
    .get('/_users/_design/byId/_view/byId')
    .query({
      key: '"abc4567"',
      include_docs: true
    })
    .reply(200, {
      total_rows: 1,
      offset: 0,
      rows: [{
        doc: {
          _id: 'org.couchdb.user:pat-doe',
          _rev: '1-234',
          password_scheme: 'pbkdf2',
          iterations: 10,
          type: 'user',
          name: 'pat-doe',
          roles: ['id:userid123', 'mycustomrole'],
          derived_key: '4b5c9721ab77dd2faf06a36785fd0a30f0bf0d27',
          salt: 'salt123'
        }
      }]
    })
    .put('/_users/org.couchdb.user%3Apat-doe', function (body) {
      return Joi.object({
        _id: Joi.any().only('org.couchdb.user:pat-doe').required(),
        _rev: Joi.any().only('1-234').required(),
        name: Joi.any().only('pat-doe').required(),
        type: Joi.any().only('user').required(),
        salt: Joi.string().required(),
        derived_key: Joi.string().required(),
        iterations: Joi.any().only(10).required(),
        password_scheme: Joi.any().only('pbkdf2').required(),
        roles: Joi.array().items(Joi.string())
      }).validate(body).error === null
    })
    .query(true)
}

getServer(function (error, server) {
  if (error) {
    return test('test setup', function (t) {
      t.error(error)
      t.end()
    })
  }

  test('PATCH /accounts/abc4567', function (group) {
    group.test('No Authorization header sent', function (t) {
      server.inject({
        method: 'PATCH',
        url: '/accounts/abc4567',
        headers: {}
      }, function (response) {
        t.is(response.statusCode, 401, 'returns 401 status')
        t.is(response.result.error, 'Unauthorized', 'returns "Unauthorized" error')
        t.is(response.result.message, 'Authorization header missing', 'returns "Authorization header missing" error')
        t.end()
      })
    })

    group.test('CouchDB Session invalid', function (t) {
      var options = _.defaultsDeep({
        headers: {
          authorization: 'Session InvalidKey'
        }
      }, routeOptions)
      server.inject(options, function (response) {
        t.is(response.statusCode, 401, 'returns 401 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Unauthorized', 'returns "Unauthorized" error')
        t.is(response.result.errors[0].detail, 'Session invalid', 'returns "Session invalid" message')
        t.end()
      })
    })

    group.test('Not an admin', {todo: true}, function (t) {
      t.end()
    })

    group.test('Not found', function (t) {
      var couchdb = nock('http://localhost:5984')
          .get('/_users/_design/byId/_view/byId')
          .query({
            key: '"xyz1234"',
            include_docs: true
          })
          .reply(200, {
            total_rows: 1,
            offset: 0,
            rows: []
          })

      server.inject({
        method: 'PATCH',
        url: '/accounts/xyz1234',
        headers: routeOptions.headers,
        payload: {
          data: {
            type: 'account',
            id: 'xyz1234',
            attributes: {
              password: 'newsecret'
            }
          }
        }
      }, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')
        t.is(response.statusCode, 404, 'returns 404 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Not Found', 'returns "Not Found" error')
        t.is(response.result.errors[0].detail, 'Account Id Not Found', 'returns "Account Id Not Found" message')
        t.end()
      })
    })

    group.test('data.type & data.id don’t match existing document', function (t) {
      server.inject(Object.assign({}, routeOptions, {
        payload: {
          data: {
            type: 'not-account',
            id: 'not-abc456'
          }
        }
      }), function (response) {
        t.is(response.statusCode, 409, 'returns 409 status')
        t.end()
      })
    })

    group.test('changing password', function (t) {
      var couchdb = mockCouchDbUpdateAccountResponse()
        .reply(201, {
          ok: true,
          id: 'org.couchdb.user:pat-doe',
          rev: '2-3456'
        })

      server.inject(routeOptions, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')
        t.is(response.statusCode, 204, 'returns 204 status')
        t.is(response.result, null, 'returns no content')
        t.end()
      })
    })

    group.test('changing username', {todo: true}, function (t) {
      t.end()
    })

    group.test('with ?include=profile', {todo: true}, function (t) {
      t.end()
    })

    group.test('with ?include=foobar', function (t) {
      var options = _.defaultsDeep({
        url: '/accounts/abcd4567?include=foobar'
      }, routeOptions)

      server.inject(options, function (response) {
        t.is(response.statusCode, 400, 'returns 400 status')
        t.deepEqual(response.result.errors[0].detail, 'Allowed value for ?include is \'profile\'', 'returns error message')
        t.end()
      })
    })

    // TOOD: test server error handling
    // couchdbErrorTests(server, group, mockCouchDbUpdateAccountResponse(), routeOptions)
    invalidTypeErrors(server, group, routeOptions, 'account')

    group.end()
  })
})
