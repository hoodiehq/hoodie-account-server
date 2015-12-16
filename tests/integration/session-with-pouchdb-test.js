var Hapi = require('hapi')
var lolex = require('lolex')
var nock = require('nock')
var PouchDB = require('pouchdb')
var test = require('tap').test

var hapiAccount = require('../../plugin')

function getServer (callback) {
  var server = new Hapi.Server()
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
        secret: 'secret'
      }
    }, function (error) {
      callback(error, server)
    })
  })
}

var jsonAPIHeaders = {
  accept: 'application/vnd.api+json',
  'content-type': 'application/vnd.api+json'
}

getServer(function (error, server) {
  if (error) {
    return test.error(error)
  }

  test('PUT /session', function (group) {
    var putSessionRouteOptions = {
      method: 'PUT',
      url: '/session',
      headers: jsonAPIHeaders,
      payload: {
        data: {
          type: 'session',
          attributes: {
            username: 'pat-doe',
            password: 'secret'
          }
        }
      }
    }

    group.test('User Found', {only: true}, function (subGroup) {
      function mockUserFound () {
        return nock('http://localhost:5984')
          // GET users doc
          .get('/_users/org.couchdb.user%3Apat-doe')
          .query(true)
          .reply(200, {
            _id: 'org.couchdb.user:pat-doe',
            _rev: '1-234',
            password_scheme: 'pbkdf2',
            iterations: 10,
            type: 'user',
            name: 'pat-doe',
            roles: ['id:userid123', 'mycustomrole'],
            derived_key: '4b5c9721ab77dd2faf06a36785fd0a30f0bf0d27',
            salt: 'salt123'
          })
      }

      var sessionResponse = require('./fixtures/session-response.json')

      subGroup.test('Valid password', function (t) {
        var clock = lolex.install(0, ['Date'])
        mockUserFound()

        server.inject(putSessionRouteOptions, function (response) {
          delete response.result.meta
          t.is(response.statusCode, 201, 'returns 201 status')
          t.deepEqual(response.result.data.id, sessionResponse.data.id, 'returns the right content')
          t.end()

          clock.uninstall()
          t.end()
        })
      })

      subGroup.test('Invalid password', function (t) {
        var clock = lolex.install(0, ['Date'])
        var couchdb = mockUserFound()
        putSessionRouteOptions.payload.data.attributes.password = 'invalidsecret'

        server.inject(putSessionRouteOptions, function (response) {
          t.doesNotThrow(couchdb.done, 'CouchDB received request')
          t.is(response.statusCode, 401, 'returns 401 status')
          t.is(response.result.errors.length, 1, 'returns one error')
          t.is(response.result.errors[0].title, 'Unauthorized', 'returns "Unauthorized" error')
          t.is(response.result.errors[0].detail, 'Invalid password', 'returns "Invalid password" message')

          clock.uninstall()
          t.end()
        })
      })

      subGroup.end()
    })

    group.end()
  })
})
