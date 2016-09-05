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

    group.test('changing password', {only: true}, function (t) {
      var couchdb = mockCouchDbUpdateAccountResponse()
        .reply(201, {
          ok: true,
          id: 'org.couchdb.user:pat-doe',
          rev: '2-3456'
        })

      server.inject(routeOptions, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')
        delete response.result.meta
        t.is(response.statusCode, 201, 'returns 201 status')
        t.is(response.result.data.attributes.username, 'pat-doe', 'returns the right content')
        t.end()
      })
    })

    group.test('changing username', {todo: true}, function (t) {
      t.end()
    })

    // TOOD: test server error handling
    // couchdbErrorTests(server, group, mockCouchDbUpdateAccountResponse(), routeOptions)
    invalidTypeErrors(server, group, routeOptions, 'account')

    group.end()
  })
})
