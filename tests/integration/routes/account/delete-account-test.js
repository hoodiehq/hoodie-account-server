var _ = require('lodash')
var Joi = require('joi')
var nock = require('nock')
var test = require('tap').test

var couchdbErrorTests = require('../../utils/couchdb-error-tests')
var getServer = require('../../utils/get-server')

var routeOptions = {
  method: 'DELETE',
  url: '/session/account',
  headers: {
    accept: 'application/vnd.api+json',
    authorization: 'Session cGF0LWRvZToxMjc1MDA6zEZsQ1BuO-W8SthDSrg8KXQ8OlQ',
    'content-type': 'application/vnd.api+json'
  }
}

var couchdbGetUserMock = nock('http://localhost:5984')
  .get('/_users/org.couchdb.user%3Apat-doe')
  .query(true)

function mockCouchDbUserFound (docChange) {
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

  test('DELETE /session/account', function (group) {
    group.test('with valid session', function (t) {
      // first mock is for validating session, 2nd is to get _rev for delete
      mockCouchDbUserFound()
      var couch = mockCouchDbUserFound({_rev: '1-234'})
        .put('/_users/org.couchdb.user%3Apat-doe', function (body) {
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
          }).validate(body).error === null
        })
        .query(true)
        .reply(201, {
          ok: true,
          id: 'org.couchdb.user:pat-doe',
          rev: '2-3456'
        })

      server.inject(routeOptions, function (response) {
        t.is(couch.pendingMocks()[0], undefined, 'all mocks satisfied')

        t.is(response.statusCode, 204, 'returns 204 status')
        t.is(response.result, null, 'returns no body')
        t.end()
      })
    })

    group.test('without valid session', function (t) {
      var couch = couchdbGetUserMock
        .reply(404, {error: 'Not Found'})

      server.inject(routeOptions, function (response) {
        t.is(couch.pendingMocks()[0], undefined, 'all mocks satisfied')
        t.is(response.statusCode, 401, 'returns 401 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Unauthorized', 'returns "Unauthorized" error')
        t.is(response.result.errors[0].detail, 'Session invalid', 'returns "Session invalid" message')

        t.end()
      })
    })

    couchdbErrorTests(server, group, couchdbGetUserMock, routeOptions)

    group.end()
  })

  test('DELETE /session/account?include=profile', {todo: true}, function (t) {
    t.end()
  })

  test('DELETE /session/account?include=foobar', function (t) {
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
