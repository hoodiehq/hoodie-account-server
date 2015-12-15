// var Hapi = require('hapi')
var nock = require('nock')
var PouchDB = require('pouchdb')
var test = require('tap').test

// var hapiAccount = require('../../plugin')

test('PouchDB foo', function (t) {
  // nock.recorder.rec()
  nock('http://localhost:5984')
    .get('/mydb/')
    .reply(200, {
      db_name: 'mydb',
      doc_count: 1,
      doc_del_count: 0,
      update_seq: 1,
      purge_seq: 0,
      compact_running: false,
      disk_size: 4185,
      data_size: 198,
      instance_start_time: '1450192959683254',
      disk_format_version: 6,
      committed_update_seq: 1
    }, {
      server: 'CouchDB/1.6.1 (Erlang OTP/17)',
      date: 'Tue, 15 Dec 2015 15:26:19 GMT',
      'content-type': 'application/json',
      'content-length': '227',
      'cache-control': 'must-revalidate'
    })
    .get('/mydb/mydoc')
    // https://github.com/pgte/nock/issues/426#issuecomment-164819712
    .query(true)
    .reply(200, {
      _id: 'mydoc',
      _rev: '1-967a00dff5e02add41819138abb3284d'
    }, {
      server: 'CouchDB/1.6.1 (Erlang OTP/17)',
      etag: '1-967a00dff5e02add41819138abb3284d',
      date: 'Tue, 15 Dec 2015 15:26:19 GMT',
      'content-type': 'application/json',
      'content-length': '60',
      'cache-control': 'must-revalidate'
    })

  var db = new PouchDB('http://localhost:5984/mydb')

  db.get('mydoc')
    .then(t.end)
    .catch(function (error) {
      console.log('error')
      console.log(error)
    })
})

// function getServer (callback) {
//   var server = new Hapi.Server()
//   server.connection({ host: 'localhost', port: 80 })
//
//   // mocks for bootstrapping design dock
//   nock('http://localhost:5984')
//     .put('/_users')
//     .reply(201, {})
//     .put('/_users/_design/byId')
//     .reply(201, {})
//
//   PouchDB.plugin(require('pouchdb-users'))
//   var db = new PouchDB('http://localhost:5984/_users')
//   db.installUsersBehavior()
//   .then(function () {
//     server.register({
//       register: hapiAccount,
//       options: {
//         db: db,
//         secret: 'secret'
//       }
//     }, function (error) {
//       callback(error, server)
//     })
//   })
// }
//
// var jsonAPIHeaders = {
//   accept: 'application/vnd.api+json',
//   'content-type': 'application/vnd.api+json'
// }
//
// getServer(function (error, server) {
//   if (error) {
//     return test.error(error)
//   }
//
//   test('PUT /session', function (group) {
//     var putSessionRouteOptions = {
//       method: 'PUT',
//       url: '/session',
//       headers: jsonAPIHeaders,
//       payload: {
//         data: {
//           type: 'session',
//           attributes: {
//             username: 'pat',
//             password: 'secret'
//           }
//         }
//       }
//     }
//
//     group.test('Session was created', {only: true}, function (t) {
//       nock('http://localhost:5984')
//         .get('/_users/org.couchdb.user:pat')
//         .reply(200, {
//           _id: 'org.couchdb.user:pat',
//           _rev: '1-259fa583b678c400537fd577a1cb09be',
//           password_scheme: 'pbkdf2',
//           iterations: 10,
//           type: 'user',
//           name: 'pat',
//           roles: [],
//           derived_key: 'e2d9816e4785e0d8d9b4f56fd33b313f76e758cc',
//           salt: '2cca0b4cc89bdedf714a3651ab90b6ad'
//         })
//
//       var sessionResponse = require('./fixtures/session-response.json')
//
//       server.inject(putSessionRouteOptions, function (response) {
//         delete response.result.meta
//         t.is(response.statusCode, 201, 'returns 201 status')
//         t.deepEqual(response.result, sessionResponse, 'returns the right content')
//         t.end()
//       })
//     })
//
//     group.end()
//   })
// })
