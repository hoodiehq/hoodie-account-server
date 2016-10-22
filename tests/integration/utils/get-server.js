module.exports = getServer

var defaults = require('lodash/defaultsDeep')
var Hapi = require('hapi')
var nock = require('nock')
var PouchDB = require('pouchdb-core').defaults({
  prefix: 'http://localhost:5984/'
})

PouchDB.plugin(require('pouchdb-admins'))
  .plugin(require('pouchdb-errors'))
  .plugin(require('pouchdb-mapreduce'))
  .plugin(require('pouchdb-adapter-http'))

var hapiAccount = require('../../../plugin')

function getServer (options, callback) {
  if (!callback) {
    callback = options
    options = {}
  }
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
    .query({})
    .reply(200, {db_name: '_users'})
    // design docs
    .post('/_users/_bulk_docs')
    .reply(201, [
      {
        ok: true,
        id: '_design/byId',
        rev: '1-234'
      },
      {
        ok: true,
        id: '_design/byToken',
        rev: '1-234'
      }
    ])

  server.register({
    register: hapiAccount,
    options: defaults({
      PouchDB: PouchDB,
      secret: 'secret',
      admins: {
        // -<password scheme>-<derived key>,<salt>,<iterations>
        // password is "secret"
        admin: '-pbkdf2-a2ca9d3ee921c26d2e9d61e03a0801b11b8725c6,1081b31861bd1e91611341da16c11c16a12c13718d1f712e,10'
      },
      notifications: {}
    }, options)
  }, function (error) {
    callback(error, server)
  })
}
