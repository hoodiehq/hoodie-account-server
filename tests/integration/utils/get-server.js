module.exports = getServer

var Hapi = require('hapi')
var nock = require('nock')
var PouchDB = require('pouchdb')

var hapiAccount = require('../../../plugin')

function getServer (callback) {
  var server = new Hapi.Server({
    // easy debug!
    // debug: {
    //   request: ['error'],
    //   log: ['error']
    // }
  })
  server.connection({ host: 'localhost', port: 80 })

  nock('http://localhost:5984')
    // PouchDB sends a request to see if db exists
    .get('/_users/')
    .reply(200, {})
    // mocks for bootstrapping design dock
    .put('/_users')
    .reply(201, {})
    .post('/_users/_bulk_docs', function (body) {
      return body.docs[0]._id === '_design/byId'
    })
    .reply(201, [{
      id: '_design/byId',
      rev: '1-234'
    }])

  PouchDB.plugin(require('pouchdb-users'))
  PouchDB.plugin(require('pouchdb-admins'))

  var usersDb = new PouchDB('http://localhost:5984/_users')
  usersDb.installUsersBehavior()
  .then(function () {
    server.register({
      register: hapiAccount,
      options: {
        usersDb: usersDb,
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
