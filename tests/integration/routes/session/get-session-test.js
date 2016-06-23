var defaultsDeep = require('lodash/defaultsDeep')
var nock = require('nock')
var test = require('tap').test

var getServer = require('../../utils/get-server')

var couchdbErrorTests = require('../../utils/couchdb-error-tests')

var routeOptions = {
  method: 'GET',
  url: '/session',
  headers: {
    accept: 'application/vnd.api+json',
    authorization: 'Session cGF0LWRvZToxMjc1MDA6zEZsQ1BuO-W8SthDSrg8KXQ8OlQ',
    'content-type': 'application/vnd.api+json'
  }
}

var mockCouchDbGetUser = nock('http://localhost:5984')
  .get('/_users/org.couchdb.user%3Apat-doe')
  .query(true)

test('GET /session', function (group) {
  getServer(function (error, server) {
    if (error) {
      group.error(error)
      group.end()
      return
    }
    couchdbErrorTests(server, group, mockCouchDbGetUser, routeOptions)

    group.test('No Authorization header sent', function (t) {
      server.inject({
        method: 'GET',
        url: '/session',
        headers: {}
      }, function (response) {
        t.is(response.statusCode, 401, 'returns 401 status')
        t.is(response.result.error, 'Unauthorized', 'returns "Unauthorized" error')
        t.is(response.result.message, 'Authorization header missing', 'returns "Authorization header missing" error')

        // TODO:
        // - response.result.error should be response.result.errors[0].title
        // - response.result.message should be  response.result.errors[0].msesage
        // - and we should check for response.result.errors.length === 1
        // ^ these are currently blocked by https://github.com/wraithgar/hapi-json-api/issues/20
        t.end()
      })
    })

    group.test('User not found', function (t) {
      var couchdb = mockCouchDbGetUser.reply(404, {error: 'Not Found'})

      server.inject(routeOptions, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'CouchDB received request')
        t.is(response.statusCode, 401, 'returns 401 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Unauthorized', 'returns "Session invalid" error')
        t.end()
      })
    })

    group.test('User found', function (subGroup) {
      subGroup.test('Session valid', function (t) {
        mockCouchDbGetUser.reply(200, {
          name: 'pat-doe',
          roles: [
            'id:userid123', 'mycustomrole'
          ],
          salt: 'salt123'
        })

        var sessionResponse = require('../../fixtures/session-response.json')

        server.inject(routeOptions, function (response) {
          delete response.result.meta
          t.is(response.statusCode, 200, 'returns 200 status')
          t.deepEqual(response.result, sessionResponse, 'returns the right content')
          t.end()
        })
      })

      subGroup.test('Session invalid', function (t) {
        mockCouchDbGetUser.reply(200, {
          name: 'pat-doe',
          roles: [
            'id:userid123', 'mycustomrole'
          ],
          salt: 'salt123'
        })

        var requestOptions = defaultsDeep({
          headers: {
            // Token calculated with invalid salt (salt456)
            authorization: 'Session cGF0LWRvZToxMjc1MDA6YMtzOJDSC7iTA4cB2kjfjqbfk1Y'
          }
        }, routeOptions)

        server.inject(requestOptions, function (response) {
          t.is(response.statusCode, 401, 'returns 401 status')
          t.is(response.result.errors.length, 1, 'returns one error')
          t.is(response.result.errors[0].title, 'Unauthorized', 'returns "Unauthorized" error')
          t.is(response.result.errors[0].detail, 'Session invalid', 'returns "Session invalid" message')
          t.end()
        })
      })

      subGroup.end()
    })

    group.test('User is admin', function (t) {
      var requestOptions = defaultsDeep({
        headers: {
          // calculateSessionId('admin', '1081b31861bd1e91611341da16c11c16a12c13718d1f712e', 'secret', 1209600)
          authorization: 'Session YWRtaW46MTI3NTAwOh08V1EljPqAPAnv8mtxWNF87zdW'
        }
      }, routeOptions)

      var sessionAdminResponse = require('../../fixtures/session-admin-response.json')

      server.inject(requestOptions, function (response) {
        delete response.result.meta
        t.is(response.statusCode, 200, 'returns 200 status')
        t.deepEqual(response.result, sessionAdminResponse, 'returns the right content')
        t.end()
      })
    })

    group.end()
  })
})

test('GET /session?include=account.profile', function (group) {
  getServer(function (error, server) {
    if (error) {
      group.error(error)
      group.end()
      return
    }

    group.test('User found & Session valid', function (t) {
      mockCouchDbGetUser.reply(200, {
        name: 'pat-doe',
        roles: [
          'id:userid123', 'mycustomrole'
        ],
        profile: {
          fullName: 'pat Doe',
          email: 'pat@example.com'
        },
        salt: 'salt123'
      })

      var options = defaultsDeep({
        url: '/session?include=account.profile'
      }, routeOptions)

      var sessionWithProfileResponse = require('../../fixtures/session-with-profile-response.json')

      server.inject(options, function (response) {
        delete response.result.meta
        t.is(response.statusCode, 200, 'returns 200 status')

        t.deepEqual(response.result, sessionWithProfileResponse, 'returns the right content')
        t.end()
      })
    })

    group.end()
  })
})

test('GET /session?include=foobar', function (t) {
  getServer(function (error, server) {
    if (error) {
      t.error(error)
      t.end()
      return
    }

    t.plan(1)

    var options = defaultsDeep({
      url: '/session?include=foobar'
    }, routeOptions)

    server.inject(options, function (response) {
      t.is(response.statusCode, 400, 'returns 400 status')
    })
  })
})
