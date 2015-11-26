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
    var route = '/_users/_all_docs?startkey=%22org.couchdb.user%3A%22&enkey=%22org.couchdb.user%3A%E9%A6%99%22'
    var getAccountsRouteOptions = {
      method: 'GET',
      url: '/accounts',
      headers: headersWithAuth
    }

    function getAccountsResponseMock () {
      return nock('http://localhost:5984').get(route)
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
        t.is(response.statusCode, 403, 'returns 403 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Forbidden', 'returns "Forbidden" error')
        t.is(response.result.errors[0].detail, 'Only admins can access /users', 'returns "Forbidden" detail message')
        t.doesNotThrow(couchdb.done, 'CouchDB received request')
        t.end()
      })
    })

    group.test('CouchDB Session valid', function (t) {
      getAccountsResponseMock().reply(200, {
        rows: [{
          id: 'org.couchdb.user:admin',
          key: 'org.couchdb.user:admin',
          value: { rev: '1-234' },
          doc: {
            _id: 'org.couchdb.user:admin',
            _rev: '1-234',
            name: 'pat',
            roles: ['id:abc1234']
          }
        }]
      })

      var account = require('./fixtures/account.json')

      server.inject(getAccountsRouteOptions, function (response) {
        delete response.result.meta
        t.is(response.statusCode, 200, 'returns 200 status')
        t.deepEqual(response.result, [account], 'returns the right content')
        t.end()
      })
    })

    couchdbErrorTests(server, group, getAccountsResponseMock, getAccountsRouteOptions)

    group.end()
  })
})
