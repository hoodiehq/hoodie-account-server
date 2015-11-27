var nock = require('nock')
var test = require('tap').test
var lodash = require('lodash')

var getServer = require('./utils/get-server')
var couchdbErrorTests = require('./utils/couchdb-error-tests')

getServer(function (error, server) {
  if (error) {
    return test.fail(error)
  }

  var jsonAPIHeaders = {
    accept: 'application/vnd.api+json',
    'content-type': 'application/vnd.api+json'
  }

  var headersWithAuth = lodash.merge({authorization: 'Bearer sessionid123'}, jsonAPIHeaders)

  test('GET /accounts', function (group) {
    var route = '/_users/_all_docs?include_docs=true&startkey=%22org.couchdb.user%3A%22&enkey=%22org.couchdb.user%3A%E9%A6%99%22'
    var getAccountsRouteOptions = {
      method: 'GET',
      url: '/accounts',
      headers: headersWithAuth
    }

    function getAccountsResponseMock () {
      return nock('http://localhost:5984', {
        reqheaders: {
          cookie: 'AuthSession=sessionid123'
        }
      }).get(route)
    }

    group.test('No Authorization header sent', function (t) {
      server.inject({
        method: 'GET',
        url: '/accounts',
        headers: {}
      }, function (response) {
        t.is(response.statusCode, 403, 'returns 403 status')
        t.end()
      })
    })

    group.test('CouchDB Session invalid', function (t) {
      var couchdb = getAccountsResponseMock()
        .reply(403, {
          error: 'forbidden',
          reason: 'Only admins can access _all_docs of system databases.'
        })

      server.inject(getAccountsRouteOptions, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')
        t.is(response.statusCode, 403, 'returns 403 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Forbidden', 'returns "Forbidden" error')
        t.is(response.result.errors[0].detail, 'Only admins can access /users', 'returns "Forbidden" detail message')
        t.end()
      })
    })

    group.test('CouchDB Session valid', function (t) {
      var couchdb = getAccountsResponseMock().reply(200, {
        rows: [{
          id: 'org.couchdb.user:pat',
          key: 'org.couchdb.user:pat',
          value: { rev: '1-234' },
          doc: {
            _id: 'org.couchdb.user:pat',
            _rev: '1-234',
            name: 'pat',
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
            roles: ['id:def678']
          }
        }]
      })

      var accounts = require('./fixtures/accounts.json')

      server.inject(getAccountsRouteOptions, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')
        delete response.result.meta
        t.is(response.statusCode, 200, 'returns 200 status')
        t.deepEqual(response.result, accounts, 'returns the right content')
        t.end()
      })
    })

    group.test('with ?include=profile', function (t) {
      var couchdb = getAccountsResponseMock().reply(200, {
        rows: [{
          id: 'org.couchdb.user:pat',
          key: 'org.couchdb.user:pat',
          value: { rev: '1-234' },
          doc: {
            _id: 'org.couchdb.user:pat',
            _rev: '1-234',
            name: 'pat',
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
            roles: ['id:def678'],
            profile: {
              fullname: 'Mrs. Saminent'
            }
          }
        }]
      })

      var accounts = require('./fixtures/accounts-with-profile.json')

      server.inject({
        method: 'GET',
        url: '/accounts?include=profile',
        headers: headersWithAuth
      }, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')
        delete response.result.meta
        t.is(response.statusCode, 200, 'returns 200 status')
        t.deepEqual(response.result, accounts, 'returns the right content')
        t.end()
      })
    })

    couchdbErrorTests(server, group, getAccountsResponseMock, getAccountsRouteOptions)

    group.end()
  })
})
