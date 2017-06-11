var cloneDeep = require('lodash/cloneDeep')
var defaultsDeep = require('lodash/defaultsDeep')
var nock = require('nock')
var test = require('tap').test

var getServer = require('../../utils/get-server')

var couchdbErrorTests = require('../../utils/couchdb-error-tests')

var routeOptions = {
  method: 'DELETE',
  url: '/session',
  headers: {
    accept: 'application/vnd.api+json',
    authorization: 'Session cGF0LWRvZTpCQkZFMzg4MDqp7ppCNngda1JMi7XcyhtaUxf2nA',
    'content-type': 'application/vnd.api+json'
  }
}

var couchdbGetUserMock = nock('http://localhost:5984')
  .get('/_users/org.couchdb.user%3Apat-doe')
  .query(true)

test('DELETE /session', function (group) {
  group.beforeEach(getServer)

  couchdbErrorTests(group, couchdbGetUserMock, routeOptions)

  group.test('No Authorization header sent', function (t) {
    var requestOptions = cloneDeep(routeOptions)
    delete requestOptions.headers.authorization

    this.server.inject(requestOptions, function (response) {
      t.is(response.statusCode, 401, 'returns 401 status')
      t.is(response.result.errors.length, 1, 'returns one error')
      t.is(response.result.errors[0].title, 'Unauthorized', 'returns "Unauthorized" error')
      t.is(response.result.errors[0].detail, 'Authorization header missing', 'returns "Authorization header missing" error')
      t.end()
    })
  })

  group.test('User not found', function (t) {
    var couchdb = couchdbGetUserMock.reply(401, {error: 'Unauthorized'})

    this.server.inject(routeOptions, function (response) {
      t.is(couchdb.pendingMocks()[0], undefined, 'CouchDB received request')
      t.is(response.statusCode, 401, 'returns 401 status')
      t.is(response.result.errors.length, 1, 'returns one error')
      t.is(response.result.errors[0].title, 'Unauthorized', 'returns "Unauthorized" error')
      t.is(response.result.errors[0].detail, 'Session invalid', 'returns "Session invalid" message')
      t.end()
    })
  })

  group.test('User found', function (subGroup) {
    function couchdbUserFoundMock () {
      return couchdbGetUserMock.reply(200, {
        name: 'pat-doe',
        roles: [
          'id:userid123', 'mycustomrole'
        ],
        salt: 'salt123'
      })
    }
    subGroup.test('Session valid', function (t) {
      var couchdb = couchdbUserFoundMock()

      this.server.inject(routeOptions, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'CouchDB received request')
        t.is(response.statusCode, 204, 'returns 204 status')
        t.end()
      })
    })

    subGroup.test('Session invalid', function (t) {
      var couchdb = couchdbUserFoundMock()

      var requestOptions = defaultsDeep({
        headers: {
          // Token calculated with invalid salt (salt456)
          authorization: 'Session cGF0LWRvZToxMjc1MDA6YMtzOJDSC7iTA4cB2kjfjqbfk1Y'
        }
      }, routeOptions)

      this.server.inject(requestOptions, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'CouchDB received request')
        t.is(response.statusCode, 401, 'returns 401 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Unauthorized', 'returns "Unauthorized" error')
        t.is(response.result.errors[0].detail, 'Session invalid', 'returns "Session invalid" message')
        t.end()
      })
    })

    subGroup.end()
  })

  group.end()
})

test('DELETE /session?include=account', function (group) {
  var options = defaultsDeep({
    url: '/session?include=account'
  }, routeOptions)

  group.beforeEach(getServer)

  group.test('User found', function (subGroup) {
    function couchdbUserFoundMock () {
      return couchdbGetUserMock.reply(200, {
        name: 'pat-doe',
        roles: [
          'id:userid123', 'mycustomrole'
        ],
        salt: 'salt123'
      })
    }
    subGroup.test('Session valid', function (t) {
      var couchdb = couchdbUserFoundMock()

      var sessionResponse = require('../../fixtures/session-response.json')

      this.server.inject(options, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'CouchDB received request')
        delete response.result.meta
        t.is(response.statusCode, 200, 'returns 200 status')
        t.deepEqual(response.result, sessionResponse, 'returns the right content')
        t.end()
      })
    })

    subGroup.end()
  })

  group.end()
})

test('DELETE /session?include=account.profile', function (group) {
  var options = defaultsDeep({
    url: '/session?include=account.profile'
  }, routeOptions)

  group.beforeEach(getServer)

  group.test('User found', function (subGroup) {
    function couchdbUserFoundMock () {
      return couchdbGetUserMock.reply(200, {
        name: 'pat-doe',
        roles: [
          'id:userid123', 'mycustomrole'
        ],
        salt: 'salt123',
        profile: {
          fullName: 'pat Doe',
          email: 'pat@example.com'
        }
      })
    }

    subGroup.test('Session valid', function (t) {
      var couchdb = couchdbUserFoundMock()

      var sessionWithProfileResponse = require('../../fixtures/session-with-profile-response.json')

      this.server.inject(options, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'CouchDB received request')
        delete response.result.meta
        t.is(response.statusCode, 200, 'returns 200 status')
        t.deepEqual(response.result, sessionWithProfileResponse, 'returns the right content')
        t.end()
      })
    })

    subGroup.end()
  })

  group.end()
})

test('DELETE /session?include=foobar', function (t) {
  t.plan(2)

  getServer(function (error, server) {
    t.error(error)

    var options = defaultsDeep({
      url: '/session?include=foobar'
    }, routeOptions)

    this.server.inject(options, function (response) {
      t.is(response.statusCode, 400, 'returns 400 status')
    })
  })
})
