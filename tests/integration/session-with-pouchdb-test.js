var Hapi = require('hapi')
var nock = require('nock')
var PouchDB = require('pouchdb').defaults({
  db: require('memdown')
})
var test = require('tap').test

var hapiAccount = require('../../plugin')

function getServer (callback) {
  var server = new Hapi.Server()
  server.connection({ host: 'localhost', port: 80 })

  // mocks for bootstrapping design dock
  nock('http://localhost:5984')
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
            username: 'pat',
            password: 'secret'
          }
        }
      }
    }
    function getUserResponseMock () {
      return nock('http://localhost:5984').get('/_users/org.couchdb.user:pat', {
        _id: 'org.couchdb.user:pat',
        _rev: '1-259fa583b678c400537fd577a1cb09be',
        password_scheme: 'pbkdf2',
        iterations: 10,
        type: 'user',
        name: 'pat',
        roles: [],
        derived_key: 'e2d9816e4785e0d8d9b4f56fd33b313f76e758cc',
        salt: '2cca0b4cc89bdedf714a3651ab90b6ad'
      })
    }

    group.test('Session was created', {only: true}, function (t) {
      getUserResponseMock().reply(201, {
        ok: true,
        name: 'mycustomrole',
        roles: [
          'id:abc1234', 'mycustomrole'
        ]
      }, {
        'Set-Cookie': ['AuthSession=sessionid123; Version=1; Expires=Tue, 08-Sep-2015 00:35:52 GMT; Max-Age=1209600; Path=/; HttpOnly']
      })

      var sessionResponse = require('./fixtures/session-response.json')

      server.inject(putSessionRouteOptions, function (response) {
        delete response.result.meta
        t.is(response.statusCode, 201, 'returns 201 status')
        t.deepEqual(response.result, sessionResponse, 'returns the right content')
        t.end()
      })
    })

    group.end()
  })
})
