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
          admin: '-pbkdf2-a2ca9d3ee921c26d2e9d61e03a0801b11b8725c6,1081b31861bd1e91611341da16c11c16a12c13718d1f712e,10'
        }
      }
    }, function (error) {
      callback(error, server)
    })
  })
  .catch(callback)
}