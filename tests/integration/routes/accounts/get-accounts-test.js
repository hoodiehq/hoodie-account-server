var _ = require('lodash')
var nock = require('nock')
var test = require('tap').test

var getServer = require('../../utils/get-server')
var couchdbErrorTests = require('../../utils/couchdb-error-tests')

var headers = {
  accept: 'application/vnd.api+json',
  authorization: 'Session YWRtaW46MTI3NTAwOh08V1EljPqAPAnv8mtxWNF87zdW',
  'content-type': 'application/vnd.api+json'
}

var routeOptions = {
  method: 'GET',
  url: '/accounts',
  headers: headers
}

function mockCouchDbGetAccounts () {
  return nock('http://localhost:5984', {
    encodedQueryParams: true
  })
  .get('/_users/_all_docs')
  .query({
    include_docs: true,
    startkey: '%22org.couchdb.user%3A%22',
    endkey: '%22org.couchdb.user%3A%EF%BF%B0%22'
  })
}

getServer(function (error, server) {
  if (error) {
    return test('test setup', function (t) {
      t.error(error)
      t.end()
    })
  }

  test('GET /accounts', function (group) {
    group.test('No Authorization header sent', function (t) {
      server.inject({
        method: 'GET',
        url: '/accounts',
        headers: {}
      }, function (response) {
        t.is(response.statusCode, 401, 'returns 401 status')
        t.is(response.result.error, 'Unauthorized', 'returns "Unauthorized" error')
        t.is(response.result.message, 'Authorization header missing', 'returns "Authorization header missing" error')
        t.end()
      })
    })

    group.test('CouchDB Session invalid', function (t) {
      var requestOptions = _.defaultsDeep({
        headers: {
          authorization: 'Session someInvalidSession'
        }
      }, routeOptions)

      server.inject(requestOptions, function (response) {
        t.is(response.statusCode, 401, 'returns 401 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Unauthorized', 'returns "Unauthorized" error')
        t.is(response.result.errors[0].detail, 'Session invalid', 'returns Invalid session message')
        t.end()
      })
    })

    group.test('Not an admin', function (t) {
      var requestOptions = _.defaultsDeep({
        headers: {
          // Session ID based on 'pat-doe', 'salt123', 'secret', 1209600
          authorization: 'Session cGF0LWRvZToxMjc1MDA6zEZsQ1BuO-W8SthDSrg8KXQ8OlQ'
        }
      }, routeOptions)

      server.inject(requestOptions, function (response) {
        t.is(response.statusCode, 401, 'returns 401 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Unauthorized', 'returns "Unauthorized" error')
        t.is(response.result.errors[0].detail, 'Session invalid', 'returns Invalid session message')
        t.end()
      })
    })

    group.test('CouchDB Session valid', function (t) {
      var couchdb = mockCouchDbGetAccounts().reply(200, {
        rows: [{
          id: 'org.couchdb.user:pat-doe',
          key: 'org.couchdb.user:pat-doe',
          value: { rev: '1-234' },
          doc: {
            _id: 'org.couchdb.user:pat-doe',
            _rev: '1-234',
            name: 'pat-doe',
            createdAt: '1970-01-01T00:00:00.000Z',
            signedUpAt: '1970-01-01T00:00:00.000Z',
            roles: ['id:abc4567']
          }
        }, {
          id: 'org.couchdb.user:sam',
          key: 'org.couchdb.user:sam',
          value: { rev: '1-567' },
          doc: {
            _id: 'org.couchdb.user:sam',
            _rev: '1-567',
            name: 'sam',
            createdAt: '1970-01-01T00:00:00.000Z',
            signedUpAt: '1970-01-01T00:00:00.000Z',
            roles: ['id:def678']
          }
        }]
      })

      var accounts = require('../../fixtures/accounts.json')

      server.inject(routeOptions, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')
        delete response.result.meta
        t.is(response.statusCode, 200, 'returns 200 status')

        t.deepEqual(response.result.data, accounts.data, 'returns the right content')
        t.end()
      })
    })

    group.test('with ?include=profile', function (t) {
      var couchdb = mockCouchDbGetAccounts().reply(200, {
        rows: [{
          id: 'org.couchdb.user:pat-doe',
          key: 'org.couchdb.user:pat-doe',
          value: { rev: '1-234' },
          doc: {
            _id: 'org.couchdb.user:pat-doe',
            _rev: '1-234',
            name: 'pat-doe',
            createdAt: '1970-01-01T00:00:00.000Z',
            signedUpAt: '1970-01-01T00:00:00.000Z',
            roles: ['id:abc4567'],
            profile: {
              fullname: 'Dr Pat Hook'
            }
          }
        }, {
          id: 'org.couchdb.user:sam',
          key: 'org.couchdb.user:sam',
          value: { rev: '1-567' },
          doc: {
            _id: 'org.couchdb.user:sam',
            _rev: '1-567',
            name: 'sam',
            createdAt: '1970-01-01T00:00:00.000Z',
            signedUpAt: '1970-01-01T00:00:00.000Z',
            roles: ['id:def678'],
            profile: {
              fullname: 'Mrs. Saminent'
            }
          }
        }]
      })

      var accounts = require('../../fixtures/accounts-with-profile.json')

      server.inject({
        method: 'GET',
        url: '/accounts?include=profile',
        headers: headers
      }, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')
        delete response.result.meta
        t.is(response.statusCode, 200, 'returns 200 status')
        t.deepEqual(response.result, accounts, 'returns the right content')
        t.end()
      })
    })

    group.test('with ?include=foobar', function (t) {
      var options = _.defaultsDeep({
        url: '/accounts?include=foobar'
      }, routeOptions)

      server.inject(options, function (response) {
        t.is(response.statusCode, 400, 'returns 400 status')
        t.deepEqual(response.result.errors[0].detail, 'Allowed value for ?include is \'profile\'', 'returns error message')
        t.end()
      })
    })

    couchdbErrorTests(server, group, mockCouchDbGetAccounts, routeOptions)

    group.end()
  })

  test('GET /accounts/abc4567', function (group) {
    group.test('No Authorization header sent', function (t) {
      server.inject({
        method: 'GET',
        url: '/accounts/abc4567',
        headers: {}
      }, function (response) {
        t.is(response.statusCode, 401, 'returns 401 status')
        t.end()
      })
    })

    group.test('Account found', function (t) {
      var couchdb = nock('http://localhost:5984')
        .get('/_users/_design/byId/_view/byId')
        .query({
          key: '"abc1234"',
          include_docs: true
        })
        .reply(200, {
          total_rows: 1,
          offset: 0,
          rows: [{
            doc: {
              roles: [
                'id:abc1234'
              ],
              name: 'pat-doe',
              createdAt: '1970-01-01T00:00:00.000Z',
              signedUpAt: '1970-01-01T00:00:00.000Z',
              profile: {
                fullname: 'Dr. Pat Hook'
              }
            }
          }]
        })

      var account = require('../../fixtures/admin-account.json')

      server.inject({
        method: 'GET',
        url: '/accounts/abc1234',
        headers: headers
      }, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')

        delete response.result.meta
        t.is(response.statusCode, 200, 'returns 200 status')
        t.deepEqual(response.result, account, 'returns the right content')
        t.end()
      })
    })

    group.test('Account not found', function (t) {
      var couchdb = nock('http://localhost:5984')
        .get('/_users/_design/byId/_view/byId')
        .query({
          key: '"abc1234"',
          include_docs: true
        })
        .reply(200, {total_rows: 1, offset: 0, rows: []})

      server.inject({
        method: 'GET',
        url: '/accounts/abc1234',
        headers: headers
      }, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')
        delete response.result.meta
        t.is(response.statusCode, 404, 'returns 404 status')

        t.end()
      })
    })

    group.test('CouchDB Session invalid', function (t) {
      var options = _.defaultsDeep({
        url: '/accounts/abc1234',
        headers: {
          authorization: 'Session someInvalidSession',
          accept: 'application/vnd.api+json'
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

    group.test('Not an admin', function (t) {
      server.inject({
        method: 'GET',
        url: '/accounts/abc1234',
        headers: {
          // Session ID based on 'pat-doe', 'salt123', 'secret', 1209600
          authorization: 'Session cGF0LWRvZToxMjc1MDA6zEZsQ1BuO-W8SthDSrg8KXQ8OlQ',
          accept: 'application/vnd.api+json'
        }
      }, function (response) {
        t.is(response.statusCode, 401, 'returns 401 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Unauthorized', 'returns "Unauthorized" error')
        t.is(response.result.errors[0].detail, 'Session invalid', 'returns Invalid session message')
        t.end()
      })
    })

    group.test('with ?include=profile', function (t) {
      var couchdb = nock('http://localhost:5984')
        .get('/_users/_design/byId/_view/byId')
        .query({
          key: '"abc1234"',
          include_docs: true
        })
        .reply(200, {
          total_rows: 1,
          offset: 0,
          rows: [{
            doc: {
              roles: [
                'id:abc1234'
              ],
              name: 'pat-doe',
              createdAt: '1970-01-01T00:00:00.000Z',
              signedUpAt: '1970-01-01T00:00:00.000Z',
              profile: {
                fullname: 'Dr Pat Hook'
              }
            }
          }]
        })

      var accountWithProfile = require('../../fixtures/admin-account-with-profile.json')

      server.inject({
        method: 'GET',
        url: '/accounts/abc1234?include=profile',
        headers: headers
      }, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')
        delete response.result.meta
        t.is(response.statusCode, 200, 'returns 200 status')
        t.deepEqual(response.result, accountWithProfile, 'returns the right content')
        t.end()
      })
    })

    group.test('with ?include=foobar', function (t) {
      server.inject({
        method: 'GET',
        url: '/accounts/abc1234?include=foobar',
        headers: headers
      }, function (response) {
        t.is(response.statusCode, 400, 'returns 400 status')
        t.deepEqual(response.result.errors[0].detail, 'Allowed value for ?include is \'profile\'', 'returns error message')
        t.end()
      })
    })

    group.end()
  })
})
