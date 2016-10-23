var _ = require('lodash')
var Joi = require('joi')
var nock = require('nock')
var test = require('tap').test

var getServer = require('../../utils/get-server')

var routeOptions = {
  method: 'DELETE',
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
        username: 'sam'
      }
    }
  }
}

function mockCouchDbDeleteResponse () {
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
          roles: ['id:abc4567', 'mycustomrole'],
          derived_key: '4b5c9721ab77dd2faf06a36785fd0a30f0bf0d27',
          salt: 'salt123'
        }
      }]
    })
    .put('/_users/org.couchdb.user%3Apat-doe', function (body) {
      return Joi.object({
        _id: Joi.any().only('org.couchdb.user:pat-doe').required(),
        _rev: Joi.any().only('1-234').required(),
        _deleted: Joi.any().only(true).required(),
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

  test('DELETE /accounts/abc4567', function (group) {
    group.test('No Authorization header sent', function (t) {
      server.inject({
        method: 'DELETE',
        url: '/accounts/abc4567',
        headers: {}
      }, function (response) {
        t.is(response.statusCode, 401, 'returns 401 status')
        t.is(response.result.error, 'Unauthorized', 'returns "Unauthorized" error')
        t.is(response.result.message, 'Authorization header missing', 'returns "Authorization header missing" error')
        t.end()
      })
    })

    group.test('CouchDB Session invalid', {todo: true}, function (t) {
      t.end()
    })

    group.test('Not an admin', {todo: true}, function (t) {
      t.end()
    })

    group.test('account not found', function (t) {
      var couchdb = nock('http://localhost:5984')
        .get('/_users/_design/byId/_view/byId')
        .query({
          key: '"abc4567"',
          include_docs: true
        })
        .reply(200, {total_rows: 1, offset: 0, rows: []})

      server.inject(routeOptions, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')
        t.is(response.statusCode, 404, 'returns 404 status')
        t.end()
      })
    })

    group.test('account exists', function (t) {
      var couchdb = mockCouchDbDeleteResponse()
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

    group.test('with ?include=profile', {todo: true}, function (t) {
      t.end()
    })

    group.test('with ?include=foobar', {todo: true}, function (t) {
      var options = _.defaultsDeep({
        url: '/accounts/123?include=foobar'
      }, routeOptions)

      server.inject(options, function (response) {
        t.is(response.statusCode, 400, 'returns 400 status')
        t.deepEqual(response.result.errors[0].detail, 'Allowed value for ?include is \'profile\'', 'returns error message')
        t.end()
      })
    })

    group.end()
  })
})
