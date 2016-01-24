var _ = require('lodash')
var nock = require('nock')
var test = require('tap').test

var couchdbErrorTests = require('../utils/couchdb-error-tests')
var getServer = require('../utils/get-server')

var jsonAPIHeaders = {
  accept: 'application/vnd.api+json',
  'content-type': 'application/vnd.api+json'
}
var headersWithAuth = _.merge({authorization: 'Bearer cGF0LWRvZToxMjc1MDA6zEZsQ1BuO-W8SthDSrg8KXQ8OlQ'}, jsonAPIHeaders)

var getAccountProfileRouteOptions = {
  method: 'GET',
  url: '/session/account/profile',
  headers: headersWithAuth
}
var patchAccountProfileRouteOptions = {
  method: 'PATCH',
  url: '/session/account/profile',
  headers: headersWithAuth,
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

  test('GET /session/account/profile', function (group) {
    // For now all tests within here are skipped anyway
    couchdbErrorTests(server, group, couchdbGetUserMock, getAccountProfileRouteOptions)

    group.test('Session does exist', function (t) {
      var couch = mockUserFound({
        profile: {
          fullName: 'Pat Doe',
          email: 'pat@example.com'
        }
      })
      var profileFixture = require('../fixtures/profile.json')

      server.inject(getAccountProfileRouteOptions, function (response) {
        t.is(couch.pendingMocks()[0], undefined, 'all mocks satisfied')
        delete response.result.meta
        t.is(response.statusCode, 200, 'returns 200 status')
        t.deepEqual(response.result, profileFixture, 'returns profile in right format')
        t.end()
      })
    })

    group.test('Session does not exist', function (t) {
      var couch = couchdbGetUserMock
        .reply(404, {error: 'not_found', reason: 'missing'})

      server.inject(getAccountProfileRouteOptions, function (response) {
        t.is(couch.pendingMocks()[0], undefined, 'all mocks satisfied')
        t.is(response.statusCode, 401, 'returns 401 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Unauthorized', 'returns "Unauthorized" error')
        t.end()
      })
    })

    group.test('User Is admin', function (t) {
      var requestOptions = _.defaultsDeep({
        headers: {
          // calculateSessionId('admin', '1081b31861bd1e91611341da16c11c16a12c13718d1f712e', 'secret', 1209600)
          authorization: 'Bearer YWRtaW46MTI3NTAwOh08V1EljPqAPAnv8mtxWNF87zdW'
        }
      }, getAccountProfileRouteOptions)

      server.inject(requestOptions, function (response) {
        delete response.result.meta
        t.is(response.statusCode, 403, 'returns 403 status')

        t.deepEqual(response.result.errors[0].detail, 'Admins have no account', 'returns "Admins have no account" error')
        t.end()
      })
    })

    group.end()
  })

  test('PATCH /session/account/profile', function (group) {
    // For now all tests within here are skipped anyway
    couchdbErrorTests(server, group, couchdbGetUserMock, patchAccountProfileRouteOptions)

    group.test('Session does exist', function (t) {
      var profileFixture = require('../fixtures/profile.json')
      // Mock the update
      nock('http://localhost:5984')
        .post('/_users/_bulk_docs')
        .reply(201, [{
          id: 'org.couchdb.user:pat-doe',
          rev: '2-3456'
        }])
      // Need to mock 2 times the found, one for the session, one before the update
      mockUserFound()
      var couch = mockUserFound({
        profile: {
          fullName: 'Pat Doe',
          email: 'pat@example.com'
        }
      })
      server.inject(patchAccountProfileRouteOptions, function (response) {
        t.is(couch.pendingMocks()[0], undefined, 'all mocks satisfied')
        delete response.result.meta
        // The PATCH updated the email
        profileFixture.data.attributes.email = patchAccountProfileRouteOptions
                                                .payload.data.attributes.email
        t.is(response.statusCode, 201, 'returns 201 status')
        t.deepEqual(response.result, profileFixture, 'returns profile in right format')
        t.end()
      })
    })

    group.test('Session does not exist', function (t) {
      var couch = couchdbGetUserMock
            .reply(404, {error: 'not_found', reason: 'missing'})

      server.inject(patchAccountProfileRouteOptions, function (response) {
        t.is(couch.pendingMocks()[0], undefined, 'all mocks satisfied')

        t.is(response.statusCode, 401, 'returns 401 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Unauthorized', 'returns "Unauthorized" error')
        t.end()
      })
    })

    group.test('User Is admin', function (t) {
      var requestOptions = _.defaultsDeep({
        headers: {
          // calculateSessionId('admin', '1081b31861bd1e91611341da16c11c16a12c13718d1f712e', 'secret', 1209600)
          authorization: 'Bearer YWRtaW46MTI3NTAwOh08V1EljPqAPAnv8mtxWNF87zdW'
        }
      }, patchAccountProfileRouteOptions)

      server.inject(requestOptions, function (response) {
        delete response.result.meta
        t.is(response.statusCode, 403, 'returns 403 status')

        t.deepEqual(response.result.errors[0].detail, 'Admins have no account', 'returns "Admins have no account" error')
        t.end()
      })
    })

    group.end()
  })
})
