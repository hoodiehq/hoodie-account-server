var Joi = require('joi')
var nock = require('nock')
var test = require('tap').test

var getServer = require('../../utils/get-server')
var couchdbErrorTests = require('../../utils/couchdb-error-tests')
var invalidTypeErrors = require('../../utils/invalid-type-errors.js')

var routeOptions = {
  method: 'POST',
  url: '/accounts',
  headers: {
    accept: 'application/vnd.api+json',
    // calculateSessionId('admin', '1081b31861bd1e91611341da16c11c16a12c13718d1f712e', 'secret', 1209600)
    authorization: 'Bearer YWRtaW46MTI3NTAwOh08V1EljPqAPAnv8mtxWNF87zdW',
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

    // prepared test for https://github.com/hoodiehq/hoodie-server-account/issues/124
    group.test('Not an admin', {todo: true}, function (t) {
      t.end()
    })
    })

    // prepared test for https://github.com/hoodiehq/hoodie-server-account/issues/125
    group.test('Session cannot be found', {todo: true}, function (t) {
      t.end()
    })

    group.test('CouchDB Session valid', function (t) {
      var couchdb = mockCouchDbCreateUserDoc
        .reply(201, [{
          id: 'org.couchdb.user:pat-doe',
          rev: '1-234'
        }])

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
})
