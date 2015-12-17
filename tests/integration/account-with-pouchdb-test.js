// I've hit an issue with lolex. If you get
//
//     TypeError: Cannot read property 'now' of undefined
//
// uncomment "delete target[method];" in src/lolex.js

var Hapi = require('hapi')
var Joi = require('joi')
var nock = require('nock')
var PouchDB = require('pouchdb')
var test = require('tap').test

// nock.recorder.rec()

var hapiAccount = require('../../plugin')

// var authorizationHeaderNotAllowedErrorTest = require('./utils/authorization-header-not-allowed-error')
// var couchdbErrorTests = require('./utils/couchdb-error-tests')

var jsonAPIHeaders = {
  accept: 'application/vnd.api+json',
  'content-type': 'application/vnd.api+json'
}

// var headersWithAuth = merge({authorization: 'Bearer cGF0LWRvZToxMjc1MDA6nIp2130Iq41NBWNVDo_8ezbTR0M'}, jsonAPIHeaders)

function getServer (callback) {
  var server = new Hapi.Server({
    // easy debug!
    debug: {
      request: ['error'],
      log: ['error']
    }
  })
  server.connection({ host: 'localhost', port: 80 })

  nock('http://localhost:5984')
    // PouchDB sends a request to see if db exists
    .get('/_users/')
    .reply(200, {})
    // mocks for bootstrapping design dock
    .put('/_users')
    .reply(201, {})
    .put('/_users/_design/byId')
    .reply(201, {})

  PouchDB.plugin(require('pouchdb-users'))
  var db = new PouchDB('http://localhost:5984/_users')
  db.installUsersBehavior()
  .then(function () {
    server.register({
      register: hapiAccount,
      options: {
        db: db,
        secret: 'secret',
        admins: {
          // -<password scheme>-<derived key>,<salt>,<iterations>
          // password is "secret"
          admin: '-pbkdf2-a2ca9d3ee921c26d2e9d61e03a0801b11b8725c6,1081b31861bd1e91611341da16c11c16a12c13718d1f712e,10'
        }
      }
    }, function (error) {
      callback(error, server)
    })
  })
  .catch(callback)
}

var putAccountRouteOptions = {
  method: 'PUT',
  url: '/session/account',
  headers: jsonAPIHeaders,
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

getServer(function (error, server) {
  if (error) {
    return test.error(error)
  }

  var couchdbPutUserMock = nock('http://localhost:5984')
    .post('/_users/_bulk_docs', function (body) {
      return Joi.object({
        _id: Joi.any().only('org.couchdb.user:pat').required(),
        name: Joi.any().only('pat').required(),
        type: Joi.any().only('user').required(),
        salt: Joi.string().required(),
        derived_key: Joi.string().required(),
        iterations: Joi.any().only(10).required(),
        password_scheme: Joi.any().only('pbkdf2').required(),
        roles: Joi.array().items(Joi.string().regex(/^id:[0-9a-f]{12}$/)).max(1).min(1)
      }).validate(body.docs[0]).error === null
    })
    .query(true)

  test('PUT /session/account', function (group) {
    // authorizationHeaderNotAllowedErrorTest(server, group, putAccountRouteOptions)
    // couchdbErrorTests(server, group, couchdbPutUserMock, putAccountRouteOptions)

    group.test('User not found', function (t) {
      var couchdb = couchdbPutUserMock
        .reply(201, [{
          id: 'org.couchdb.user:pat',
          rev: '1-234'
        }])

      var accountFixture = require('./fixtures/account.json')

      server.inject(putAccountRouteOptions, function (response) {
        t.doesNotThrow(couchdb.done, 'CouchDB received request')
        delete response.result.meta
        t.is(response.statusCode, 201, 'returns 201 status')
        t.match(response.result.data.id, /^[0-9a-f]{12}$/, 'sets id')
        response.result.data.id = 'abc1234'
        response.result.data.relationships.profile.data.id = 'abc1234-profile'
        t.deepEqual(response.result, accountFixture, 'returns account in right format')
        t.end()
      })
    })

    group.end()
  })
})
