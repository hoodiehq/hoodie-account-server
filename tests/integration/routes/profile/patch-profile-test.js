var _ = require('lodash')
var nock = require('nock')
var test = require('tap').test

var couchdbErrorTests = require('../../utils/couchdb-error-tests')
var getServer = require('../../utils/get-server')

var routeOptions = {
  method: 'PATCH',
  url: '/session/account/profile',
  headers: {
    accept: 'application/vnd.api+json',
    authorization: 'Session cGF0LWRvZToxMjc1MDA6zEZsQ1BuO-W8SthDSrg8KXQ8OlQ',
    'content-type': 'application/vnd.api+json'
  },
  payload: {
    data: {
      id: 'userid123-profile',
      type: 'profile',
      attributes: {
        email: 'pat@doe.com'
      }
    }
  }
}

var mockCouchDbGetUserDoc = nock('http://localhost:5984')
  .get('/_users/org.couchdb.user%3Apat-doe')
  .query(true)

function mockUserFound (docChange) {
  return mockCouchDbGetUserDoc
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

  test('PATCH /session/account/profile', function (group) {
    // For now all tests within here are skipped anyway
    couchdbErrorTests(server, group, mockCouchDbGetUserDoc, routeOptions)

    group.test('Session does exist', function (t) {
      // Mock the update
      nock('http://localhost:5984')
        .put('/_users/org.couchdb.user%3Apat-doe')
        .reply(201, {
          ok: true,
          id: 'org.couchdb.user:pat-doe',
          rev: '2-3456'
        })
      // Need to mock 2 times the found, one for the session, one before the update
      mockUserFound()
      var couch = mockUserFound({
        profile: {
          fullName: 'Pat Doe',
          email: 'pat@example.com'
        }
      })
      server.inject(routeOptions, function (response) {
        t.is(couch.pendingMocks()[0], undefined, 'all mocks satisfied')
        // The PATCH updated the email
        t.is(response.statusCode, 204, 'returns 204 status')
        t.is(response.result, null, 'returns no body')
        t.end()
      })
    })

    group.test('Session does not exist', function (t) {
      var couch = mockCouchDbGetUserDoc
            .reply(404, {error: 'not_found', reason: 'missing'})

      server.inject(routeOptions, function (response) {
        t.is(couch.pendingMocks()[0], undefined, 'all mocks satisfied')

        t.is(response.statusCode, 401, 'returns 401 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Unauthorized', 'returns "Unauthorized" error')
        t.is(response.result.errors[0].detail, 'Session invalid', 'returns "Session invalid" error')
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
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Not Found', 'returns "Not Found" error')
        t.is(response.result.errors[0].detail, 'Admins have no profiles', 'returns "Admins have no profiles" error')
        t.end()
      })
    })

    // test prepared for https://github.com/hoodiehq/hoodie-account-server/issues/104
    group.test('data.id is != account.id belonging to session', function (t) {
      var couch = mockUserFound()
      var options = _.defaultsDeep({
        payload: {
          data: {
            id: 'foobar-profile'
          }
        }
      }, routeOptions)

      server.inject(options, function (response) {
        t.is(couch.pendingMocks()[0], undefined, 'all mocks satisfied')

        t.is(response.statusCode, 409, 'returns 409 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Conflict', 'returns "Conflict" error')
        t.is(response.result.errors[0].detail, 'data.id must be \'userid123-profile\'', 'returns "data.id must be \'userid123-profile\'" message')

        t.end()
      })
    })

    group.end()
  })

  test('PATCH /session/account/profile?include=foobar', function (t) {
    var options = _.defaultsDeep({
      url: '/session/account/profile?include=foobar'
    }, routeOptions)

    server.inject(options, function (response) {
      t.is(response.statusCode, 400, 'returns 400 status')
      t.deepEqual(response.result.errors[0].detail, '?include not allowed', 'returns error message')
      t.end()
    })
  })
})
