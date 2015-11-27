module.exports = getServer

var Hapi = require('hapi')
var nock = require('nock')

var hapiAccount = require('../../../plugin')

function getServer (callback) {
  var server = new Hapi.Server()
  server.connection({ host: 'localhost', port: 80 })

  // mocks for bootstrapping design dock
  nock('http://localhost:5984')
    .put('/_users')
    .reply(201, {})
    .put('/_users/_design/byId')
    .reply(201, {})

  server.register({
    register: hapiAccount,
    options: {
      couchdb: {
        url: 'http://localhost:5984',
        admin: {
          username: 'admin',
          password: 'secret'
        }
      }
    }
  }, function (error) {
    callback(error, server)
  })
}
