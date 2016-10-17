var _ = require('lodash')
var nock = require('nock')
var test = require('tap').test

var couchdbErrorTests = require('../../utils/couchdb-error-tests')
var getServer = require('../../utils/get-server')

var routeOptions = {
  method: 'GET',
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
      createdAt: '1970-01-01T00:00:00.000Z',
      signedUpAt: '1970-01-01T00:00:00.000Z',
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

  test('GET /session/account', function (group) {
    couchdbErrorTests(server, group, couchdbGetUserMock, routeOptions)

    group.test('Session does exist', function (t) {
      var couch = mockCouchDbUserFound()
      var accountFixture = require('../../fixtures/account.json')

      server.inject(routeOptions, function (response) {
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

      server.inject(routeOptions, function (response) {
        t.is(couch.pendingMocks()[0], undefined, 'all mocks satisfied')

        t.is(response.statusCode, 401, 'returns 401 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Unauthorized', 'returns "Unauthorized" error')
        t.is(response.result.errors[0].detail, 'Invalid session', 'returns Invalid session message')
        t.end()
      })
    })

    group.test('User Is admin', function (t) {
      var requestOptions = _.defaultsDeep({
        headers: {
          // calculateSessionId('admin', '1081b31861bd1e91611341da16c11c16a12c13718d1f712e', 'secret', 1209600)
          authorization: 'Session YWRtaW46MTI3NTAwOh08V1EljPqAPAnv8mtxWNF87zdW'
        }
      }, routeOptions)

      server.inject(requestOptions, function (response) {
        delete response.result.meta
        t.is(response.statusCode, 404, 'returns 404 status')

        t.deepEqual(response.result.errors[0].detail, 'Admins have no accounts', 'returns "Admins have no accounts" error')
        t.end()
      })
    })

    group.end()
  })

  test('GET /session/account?include=profile', function (group) {
    group.test('Session does exist', function (t) {
      var couch = mockCouchDbUserFound({
        profile: {
          fullName: 'pat Doe',
          email: 'pat@example.com'
        }
      })
      var accountWithProfileFixture = require('../../fixtures/account-with-profile.json')
      var requestOptions = _.defaultsDeep({
        url: '/session/account?include=profile'
      }, routeOptions)

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

  test('GET /session/account?include=foobar', function (t) {
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
