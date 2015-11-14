module.exports = getServer

var Hapi = require('hapi')

var hapiAccount = require('../../../plugin')

function getServer (callback) {
  var server = new Hapi.Server()
  server.connection({ host: 'localhost', port: 80 })

  server.register({
    register: hapiAccount,
    options: {
      adapter: {
        name: 'couchdb',
        location: 'http://localhost:5984',
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
