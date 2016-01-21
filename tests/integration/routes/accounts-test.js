var Joi = require('joi')
var _ = require('lodash')
var nock = require('nock')
var test = require('tap').test

var getServer = require('../utils/get-server')
var couchdbErrorTests = require('../utils/couchdb-error-tests')
var invalidTypeErrors = require('../utils/invalid-type-errors.js')

getServer(function (error, server) {
  if (error) {
    return test('test setup', function (t) {
      t.error(error)
      t.end()
    })
  }
  var jsonAPIHeaders = {
    accept: 'application/vnd.api+json',
    'content-type': 'application/vnd.api+json'
  }
  var headersWithAuth = _.merge({
    // calculateSessionId('admin', '1081b31861bd1e91611341da16c11c16a12c13718d1f712e', 'secret', 1209600)
    authorization: 'Bearer YWRtaW46MTI3NTAwOh08V1EljPqAPAnv8mtxWNF87zdW'
  }, jsonAPIHeaders)

  var couchdbPutUserMock = nock('http://localhost:5984')
    .post('/_users/_bulk_docs', function (body) {
      return Joi.object({
        _id: Joi.any().only('org.couchdb.user:pat-doe').required(),
        name: Joi.any().only('pat-doe').required(),
        type: Joi.any().only('user').required(),
        salt: Joi.string().required(),
        derived_key: Joi.string().required(),
        iterations: Joi.any().only(10).required(),
        password_scheme: Joi.any().only('pbkdf2').required(),
        roles: Joi.array().items(Joi.string().regex(/^id:[0-9a-f]{12}$/)).max(1).min(1)
      }).validate(body.docs[0]).error === null
    })
    .query(true)

  test('POST /accounts', function (group) {
    var postAccountsRouteOptions = {
      method: 'POST',
      url: '/accounts',
      headers: headersWithAuth,
      payload: {
        data: {
          type: 'account',
          attributes: {
            username: 'pat-doe',
            password: 'secret'
          }
        }
      }
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

    group.test('Not an admin', {todo: true}, function (t) {
      t.end()
    })

    group.test('CouchDB Session valid', function (t) {
      var couchdb = couchdbPutUserMock
        .reply(201, [{
          id: 'org.couchdb.user:pat-doe',
          rev: '1-234'
        }])

      server.inject(postAccountsRouteOptions, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')
        delete response.result.meta

        t.is(response.statusCode, 201, 'returns 201 status')
        t.is(response.result.data.attributes.username, 'pat-doe', 'returns the right content')
        t.end()
      })
    })

    couchdbErrorTests(server, group, couchdbPutUserMock, postAccountsRouteOptions)
    invalidTypeErrors(server, group, postAccountsRouteOptions)

    group.end()
  })

  test('GET /accounts', function (group) {
    var getAccountsRouteOptions = {
      method: 'GET',
      url: '/accounts',
      headers: headersWithAuth
    }

    function getAccountsResponseMock () {
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

    group.test('CouchDB Session invalid', {todo: true}, function (t) {
      t.end()
    })

    group.test('Not an admin', {todo: true}, function (t) {
      t.end()
    })

    group.test('CouchDB Session valid', function (t) {
      var couchdb = getAccountsResponseMock().reply(200, {
        rows: [{
          id: 'org.couchdb.user:pat-doe',
          key: 'org.couchdb.user:pat-doe',
          value: { rev: '1-234' },
          doc: {
            _id: 'org.couchdb.user:pat-doe',
            _rev: '1-234',
            name: 'pat-doe',
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

      var accounts = require('../fixtures/accounts.json')

      server.inject(getAccountsRouteOptions, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')
        delete response.result.meta
        t.is(response.statusCode, 200, 'returns 200 status')

        t.deepEqual(response.result.data, accounts.data, 'returns the right content')
        t.end()
      })
    })

    group.test('with ?include=profile', function (t) {
      var couchdb = getAccountsResponseMock().reply(200, {
        rows: [{
          id: 'org.couchdb.user:pat-doe',
          key: 'org.couchdb.user:pat-doe',
          value: { rev: '1-234' },
          doc: {
            _id: 'org.couchdb.user:pat-doe',
            _rev: '1-234',
            name: 'pat-doe',
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

      var accounts = require('../fixtures/accounts-with-profile.json')

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

  test('GET /accounts/abc4567', {only: true}, function (group) {
    group.test('No Authorization header sent', function (t) {
      server.inject({
        method: 'GET',
        url: '/accounts/abc4567',
        headers: {}
      }, function (response) {
        t.is(response.statusCode, 403, 'returns 403 status')
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
              profile: {
                fullname: 'Dr. Pat Hook'
              }
            }
          }]
        })

      var account = require('../fixtures/admin-account.json')

      server.inject({
        method: 'GET',
        url: '/accounts/abc1234',
        headers: headersWithAuth
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
        headers: headersWithAuth
      }, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')
        delete response.result.meta
        t.is(response.statusCode, 404, 'returns 404 status')

        t.end()
      })
    })

    group.end()
  })

  test('GET /accounts/abc4567?include=profile', {only: true}, function (group) {
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
              profile: {
                fullname: 'Dr Pat Hook'
              }
            }
          }]
        })

      var accountWithProfile = require('../fixtures/admin-account-with-profile.json')

      server.inject({
        method: 'GET',
        url: '/accounts/abc1234?include=profile',
        headers: headersWithAuth
      }, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')
        delete response.result.meta
        t.is(response.statusCode, 200, 'returns 200 status')
        t.deepEqual(response.result, accountWithProfile, 'returns the right content')
        t.end()
      })
    })

    group.end()
  })

  test('PATCH /accounts/abc4567', function (group) {
    var patchAccountsRouteOptionsPassword = {
      method: 'PATCH',
      url: '/accounts/abc4567',
      headers: headersWithAuth,
      payload: {
        data: {
          type: 'account',
          attributes: {
            password: 'newsecret'
          }
        }
      }
    }

    function patchAccountsResponseMock () {
      return nock('http://localhost:5984')
        .get('/_users/_design/byId/_view/byId')
        .query({
          key: '"abc4567"',
          include_docs: true
        })
        .reply(200, {
          total_rows: 1,
          offset: 0,
          rows: [{
            doc: {
              _id: 'org.couchdb.user:pat-doe',
              _rev: '1-234',
              password_scheme: 'pbkdf2',
              iterations: 10,
              type: 'user',
              name: 'pat-doe',
              roles: ['id:userid123', 'mycustomrole'],
              derived_key: '4b5c9721ab77dd2faf06a36785fd0a30f0bf0d27',
              salt: 'salt123'
            }
          }]
        })
        .post('/_users/_bulk_docs', function (body) {
          return Joi.object({
            _id: Joi.any().only('org.couchdb.user:pat-doe').required(),
            _rev: Joi.any().only('1-234').required(),
            name: Joi.any().only('pat-doe').required(),
            type: Joi.any().only('user').required(),
            salt: Joi.string().required(),
            derived_key: Joi.string().required(),
            iterations: Joi.any().only(10).required(),
            password_scheme: Joi.any().only('pbkdf2').required(),
            roles: Joi.array().items(Joi.string())
          }).validate(body.docs[0]).error === null
        })
        .query(true)
    }

    group.test('No Authorization header sent', function (t) {
      server.inject({
        method: 'PATCH',
        url: '/accounts/abc4567',
        headers: {}
      }, function (response) {
        t.is(response.statusCode, 403, 'returns 403 status')
        t.end()
      })
    })

    group.test('changing password', {only: true}, function (t) {
      var couchdb = patchAccountsResponseMock()
        .reply(201, [{
          id: 'org.couchdb.user:pat-doe',
          rev: '2-3456'
        }])

      server.inject(patchAccountsRouteOptionsPassword, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')
        delete response.result.meta
        t.is(response.statusCode, 201, 'returns 201 status')
        t.is(response.result.data.attributes.username, 'pat-doe', 'returns the right content')
        t.end()
      })
    })

    group.test('changing username', {todo: true}, function (t) {
      t.end()
    })

    // TOOD: test server error handling
    // couchdbErrorTests(server, group, patchAccountsResponseMock(), patchAccountsRouteOptionsPassword)
    invalidTypeErrors(server, group, patchAccountsRouteOptionsPassword)

    group.end()
  })

  test('DELETE /accounts/abc4567', function (group) {
    var deleteAccountsRouteOptions = {
      method: 'DELETE',
      url: '/accounts/abc4567',
      headers: headersWithAuth,
      payload: {
        data: {
          type: 'account',
          attributes: {
            username: 'sam'
          }
        }
      }
    }

    function deleteAccountsResponseMock () {
      return nock('http://localhost:5984')
        .get('/_users/_design/byId/_view/byId')
        .query({
          key: '"abc4567"',
          include_docs: true
        })
        .reply(200, {
          total_rows: 1,
          offset: 0,
          rows: [{
            doc: {
              _id: 'org.couchdb.user:pat-doe',
              _rev: '1-234',
              password_scheme: 'pbkdf2',
              iterations: 10,
              type: 'user',
              name: 'pat-doe',
              roles: ['id:userid123', 'mycustomrole'],
              derived_key: '4b5c9721ab77dd2faf06a36785fd0a30f0bf0d27',
              salt: 'salt123'
            }
          }]
        })
        .post('/_users/_bulk_docs', function (body) {
          return Joi.object({
            _id: Joi.any().only('org.couchdb.user:pat-doe').required(),
            _rev: Joi.any().only('1-234').required(),
            _deleted: Joi.any().only(true).required(),
            name: Joi.any().only('pat-doe').required(),
            type: Joi.any().only('user').required(),
            salt: Joi.string().required(),
            derived_key: Joi.string().required(),
            iterations: Joi.any().only(10).required(),
            password_scheme: Joi.any().only('pbkdf2').required(),
            roles: Joi.array().items(Joi.string())
          }).validate(body.docs[0]).error === null
        })
        .query(true)
    }

    group.test('No Authorization header sent', function (t) {
      server.inject({
        method: 'DELETE',
        url: '/accounts/abc4567',
        headers: {}
      }, function (response) {
        t.is(response.statusCode, 403, 'returns 403 status')
        t.end()
      })
    })

    group.test('CouchDB Session invalid', {todo: true}, function (t) {
      t.end()
    })

    group.test('Not an admin', {todo: true}, function (t) {
      t.end()
    })

    group.test('account exists', {only: true}, function (t) {
      var couchdb = deleteAccountsResponseMock()
        .reply(201, [{
          id: 'org.couchdb.user:pat-doe',
          rev: '2-3456'
        }])

      server.inject(deleteAccountsRouteOptions, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')
        t.is(response.statusCode, 204, 'returns 204 status')
        t.is(response.result, null, 'returns no content')
        t.end()
      })
    })

    group.end()
  })
})
