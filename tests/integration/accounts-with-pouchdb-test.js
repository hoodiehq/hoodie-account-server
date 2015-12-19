var nock = require('nock')
var test = require('tap').test
var lodash = require('lodash')

var getServer = require('./utils/get-server-with-pouchdb')
var couchdbErrorTests = require('./utils/couchdb-error-tests')

getServer(function (error, server) {
  if (error) {
    throw error
  }

  var jsonAPIHeaders = {
    accept: 'application/vnd.api+json',
    'content-type': 'application/vnd.api+json'
  }

  var headersWithAuth = lodash.merge({authorization: 'Bearer sessionid123'}, jsonAPIHeaders)

  test('POST /accounts', function (group) {
    var route = '/_users/org.couchdb.user:pat'
    var postAccountsRouteOptions = {
      method: 'POST',
      url: '/accounts',
      headers: headersWithAuth,
      payload: {
        data: {
          type: 'account',
          attributes: {
            username: 'pat',
            password: 'secret'
          }
        }
      }
    }

    function putAccountsResponseMock () {
      return nock('http://localhost:5984').put(route)
    }

    group.test('No Authorization header sent', function (t) {
      server.inject({
        method: 'POST',
        url: '/accounts',
        headers: {}
      }, function (response) {
        t.is(response.statusCode, 403, 'returns 403 status')
        t.end()
      })
    })

    group.test('CouchDB Session valid', {only: true}, function (t) {
      var couchdb = putAccountsResponseMock().reply(201, {
        ok: true,
        id: 'org.couchdb.user:pat',
        rev: '123456'
      })

      server.inject(postAccountsRouteOptions, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')
        delete response.result.meta
        t.is(response.statusCode, 201, 'returns 201 status')
        t.is(response.result.data.attributes.username, 'pat', 'returns the right content')
        t.end()
      })
    })

    group.end()
  })


  //
  // test('GET /accounts', function (group) {
  //   var route = '/_users/_all_docs?include_docs=true&startkey=%22org.couchdb.user%3A%22&enkey=%22org.couchdb.user%3A%E9%A6%99%22'
  //   var getAccountsRouteOptions = {
  //     method: 'GET',
  //     url: '/accounts',
  //     headers: headersWithAuth
  //   }
  //
  //   function getAccountsResponseMock () {
  //     return nock('http://localhost:5984', {
  //       reqheaders: {
  //         cookie: 'AuthSession=sessionid123'
  //       }
  //     }).get(route)
  //   }
  //
  //   group.test('No Authorization header sent', function (t) {
  //     server.inject({
  //       method: 'GET',
  //       url: '/accounts',
  //       headers: {}
  //     }, function (response) {
  //       t.is(response.statusCode, 403, 'returns 403 status')
  //       t.end()
  //     })
  //   })
  //
  //   group.test('CouchDB Session invalid', function (t) {
  //     var couchdb = getAccountsResponseMock()
  //       .reply(403, {
  //         error: 'forbidden',
  //         reason: 'Only admins can access _all_docs of system databases.'
  //       })
  //
  //     server.inject(getAccountsRouteOptions, function (response) {
  //       t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')
  //       t.is(response.statusCode, 403, 'returns 403 status')
  //       t.is(response.result.errors.length, 1, 'returns one error')
  //       t.is(response.result.errors[0].title, 'Forbidden', 'returns "Forbidden" error')
  //       t.is(response.result.errors[0].detail, 'Only admins can access /users', 'returns "Forbidden" detail message')
  //       t.end()
  //     })
  //   })
  //
  //   group.test('CouchDB Session valid', function (t) {
  //     var couchdb = getAccountsResponseMock().reply(200, {
  //       rows: [{
  //         id: 'org.couchdb.user:pat',
  //         key: 'org.couchdb.user:pat',
  //         value: { rev: '1-234' },
  //         doc: {
  //           _id: 'org.couchdb.user:pat',
  //           _rev: '1-234',
  //           name: 'pat',
  //           roles: ['id:abc4567']
  //         }
  //       }, {
  //         id: 'org.couchdb.user:sam',
  //         key: 'org.couchdb.user:sam',
  //         value: { rev: '1-567' },
  //         doc: {
  //           _id: 'org.couchdb.user:sam',
  //           _rev: '1-567',
  //           name: 'sam',
  //           roles: ['id:def678']
  //         }
  //       }]
  //     })
  //
  //     var accounts = require('./fixtures/accounts.json')
  //
  //     server.inject(getAccountsRouteOptions, function (response) {
  //       t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')
  //       delete response.result.meta
  //       t.is(response.statusCode, 200, 'returns 200 status')
  //       t.deepEqual(response.result, accounts, 'returns the right content')
  //       t.end()
  //     })
  //   })
  //
  //   group.test('with ?include=profile', function (t) {
  //     var couchdb = getAccountsResponseMock().reply(200, {
  //       rows: [{
  //         id: 'org.couchdb.user:pat',
  //         key: 'org.couchdb.user:pat',
  //         value: { rev: '1-234' },
  //         doc: {
  //           _id: 'org.couchdb.user:pat',
  //           _rev: '1-234',
  //           name: 'pat',
  //           roles: ['id:abc4567'],
  //           profile: {
  //             fullname: 'Dr Pat Hook'
  //           }
  //         }
  //       }, {
  //         id: 'org.couchdb.user:sam',
  //         key: 'org.couchdb.user:sam',
  //         value: { rev: '1-567' },
  //         doc: {
  //           _id: 'org.couchdb.user:sam',
  //           _rev: '1-567',
  //           name: 'sam',
  //           roles: ['id:def678'],
  //           profile: {
  //             fullname: 'Mrs. Saminent'
  //           }
  //         }
  //       }]
  //     })
  //
  //     var accounts = require('./fixtures/accounts-with-profile.json')
  //
  //     server.inject({
  //       method: 'GET',
  //       url: '/accounts?include=profile',
  //       headers: headersWithAuth
  //     }, function (response) {
  //       t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')
  //       delete response.result.meta
  //       t.is(response.statusCode, 200, 'returns 200 status')
  //       t.deepEqual(response.result, accounts, 'returns the right content')
  //       t.end()
  //     })
  //   })
  //
  //   couchdbErrorTests(server, group, getAccountsResponseMock, getAccountsRouteOptions)
  //
  //   group.end()
  // })
  //
  // test('GET /accounts/abc4567', {only: true}, function (group) {
  //   group.test('No Authorization header sent', function (t) {
  //     server.inject({
  //       method: 'GET',
  //       url: '/accounts/abc4567',
  //       headers: {}
  //     }, function (response) {
  //       t.is(response.statusCode, 403, 'returns 403 status')
  //       t.end()
  //     })
  //   })
  //
  //   group.test('Account found', function (t) {
  //     var couchdb = nock('http://localhost:5984', {
  //       reqheaders: {
  //         cookie: 'AuthSession=sessionid123'
  //       }
  //     }).get('/_users/_design/byId/_view/byId?key=abc1234&include_docs=true').reply(200, {
  //       total_rows: 1,
  //       offset: 0,
  //       rows: [{
  //         doc: {
  //           roles: [
  //             'id:abc1234'
  //           ],
  //           name: 'pat',
  //           profile: {
  //             fullname: 'Dr. Pat Hook'
  //           }
  //         }
  //       }]
  //     })
  //
  //     var account = require('./fixtures/admin-account.json')
  //
  //     server.inject({
  //       method: 'GET',
  //       url: '/accounts/abc1234',
  //       headers: headersWithAuth
  //     }, function (response) {
  //       t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')
  //       delete response.result.meta
  //       t.is(response.statusCode, 200, 'returns 200 status')
  //       t.deepEqual(response.result, account, 'returns the right content')
  //       t.end()
  //     })
  //   })
  //
  //   group.test('Account not found', function (t) {
  //     var couchdb = nock('http://localhost:5984', {
  //       reqheaders: {
  //         cookie: 'AuthSession=sessionid123'
  //       }
  //     }).get('/_users/_design/byId/_view/byId?key=abc1234&include_docs=true')
  //       .reply(200, {total_rows: 1, offset: 0, rows: []})
  //
  //     server.inject({
  //       method: 'GET',
  //       url: '/accounts/abc1234',
  //       headers: headersWithAuth
  //     }, function (response) {
  //       t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')
  //       delete response.result.meta
  //       t.is(response.statusCode, 404, 'returns 404 status')
  //       t.end()
  //     })
  //   })
  //
  //   group.test('Account found with ?include=profile', function (t) {
  //     var couchdb = nock('http://localhost:5984', {
  //       reqheaders: {
  //         cookie: 'AuthSession=sessionid123'
  //       }
  //     }).get('/_users/_design/byId/_view/byId?key=abc1234&include_docs=true')
  //       .reply(200, {
  //         total_rows: 1,
  //         offset: 0,
  //         rows: [{
  //           doc: {
  //             roles: [
  //               'id:abc1234'
  //             ],
  //             name: 'pat',
  //             profile: {
  //               fullname: 'Dr Pat Hook'
  //             }
  //           }
  //         }]
  //       })
  //
  //     var accountWithProfile = require('./fixtures/admin-account-with-profile.json')
  //
  //     server.inject({
  //       method: 'GET',
  //       url: '/accounts/abc1234?include=profile',
  //       headers: headersWithAuth
  //     }, function (response) {
  //       t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')
  //       delete response.result.meta
  //       t.is(response.statusCode, 200, 'returns 200 status')
  //       t.deepEqual(response.result, accountWithProfile, 'returns the right content')
  //       t.end()
  //     })
  //   })
  //
  //   group.end()
  // })
  //
  // test('PATCH /accounts/abc4567', function (group) {
  //   var route = '/_users/org.couchdb.user:pat'
  //   var patchAccountsRouteOptionsUsername = {
  //     method: 'PATCH',
  //     url: '/accounts/abc4567',
  //     headers: headersWithAuth,
  //     payload: {
  //       data: {
  //         type: 'account',
  //         attributes: {
  //           username: 'sam'
  //         }
  //       }
  //     }
  //   }
  //   var patchAccountsRouteOptionsPassword = {
  //     method: 'PATCH',
  //     url: '/accounts/abc4567',
  //     headers: headersWithAuth,
  //     payload: {
  //       data: {
  //         type: 'account',
  //         attributes: {
  //           password: 'newsecret'
  //         }
  //       }
  //     }
  //   }
  //
  //   function patchAccountsResponseMock () {
  //     return nock('http://localhost:5984')
  //       .get('/_users/_design/byId/_view/byId?key=abc4567&include_docs=true')
  //       .reply(200, {
  //         total_rows: 1,
  //         offset: 0,
  //         rows: [{
  //           doc: {
  //             _id: 'org.couchdb.user:pat',
  //             _rev: '1-abc',
  //             roles: [
  //               'id:abc1234'
  //             ],
  //             name: 'pat',
  //             profile: {
  //               fullname: 'Dr Pat Hook'
  //             }
  //           }
  //         }]
  //       })
  //   }
  //
  //   group.test('No Authorization header sent', function (t) {
  //     server.inject({
  //       method: 'PATCH',
  //       url: '/accounts/abc4567',
  //       headers: {}
  //     }, function (response) {
  //       t.is(response.statusCode, 403, 'returns 403 status')
  //       t.end()
  //     })
  //   })
  //
  //   group.test('changing password', {only: true}, function (t) {
  //     var couchdb = patchAccountsResponseMock()
  //       .put('/_users/org.couchdb.user:pat')
  //       .reply(201, {
  //         ok: true,
  //         id: 'org.couchdb.user:pat',
  //         rev: '2-3456'
  //       })
  //
  //     server.inject(patchAccountsRouteOptionsPassword, function (response) {
  //       t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')
  //       delete response.result.meta
  //       t.is(response.statusCode, 201, 'returns 201 status')
  //       t.is(response.result.data.attributes.username, 'pat', 'returns the right content')
  //       t.end()
  //     })
  //   })
  //
  //   group.test('changing username', {only: true}, function (t) {
  //     var couchdb = patchAccountsResponseMock()
  //       .put('/_users/org.couchdb.user:sam')
  //       .reply(201, {
  //         ok: true,
  //         id: 'org.couchdb.user:pat',
  //         rev: '2-3456'
  //       })
  //       .delete(route + '?rev=1-abc')
  //       .reply(200, {
  //         ok: true,
  //         id: 'org.couchdb.user:foo',
  //         rev: '2-3456'
  //       })
  //
  //     server.inject(patchAccountsRouteOptionsUsername, function (response) {
  //       t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')
  //       delete response.result.meta
  //       t.is(response.statusCode, 201, 'returns 201 status')
  //       t.is(response.result.data.attributes.username, 'sam', 'returns the right content')
  //       t.end()
  //     })
  //   })
  //
  //   group.end()
  // })
  //
  // test('DELETE /accounts/abc4567', function (group) {
  //   var deleteAccountsRouteOptions = {
  //     method: 'DELETE',
  //     url: '/accounts/abc4567',
  //     headers: headersWithAuth,
  //     payload: {
  //       data: {
  //         type: 'account',
  //         attributes: {
  //           username: 'sam'
  //         }
  //       }
  //     }
  //   }
  //
  //   function deleteAccountsResponseMock () {
  //     return nock('http://localhost:5984')
  //       .get('/_users/_design/byId/_view/byId?key=abc4567')
  //       .reply(200, {
  //         total_rows: 1,
  //         offset: 0,
  //         rows: [{
  //           id: 'org.couchdb.user:pat'
  //         }]
  //       })
  //   }
  //
  //   group.test('No Authorization header sent', function (t) {
  //     server.inject({
  //       method: 'DELETE',
  //       url: '/accounts/abc4567',
  //       headers: {}
  //     }, function (response) {
  //       t.is(response.statusCode, 403, 'returns 403 status')
  //       t.end()
  //     })
  //   })
  //
  //   group.test('account exists', {only: true}, function (t) {
  //     var couchdb = deleteAccountsResponseMock()
  //       .delete('/_users/org.couchdb.user:pat')
  //       .reply(201, {
  //         ok: true,
  //         id: 'org.couchdb.user:pat',
  //         rev: '2-3456'
  //       })
  //
  //     server.inject(deleteAccountsRouteOptions, function (response) {
  //       t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')
  //       t.is(response.statusCode, 204, 'returns 204 status')
  //       t.is(response.result, null, 'returns no content')
  //       t.end()
  //     })
  //   })
  //
  //   group.end()
  // })
})
