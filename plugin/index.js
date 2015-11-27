module.exports = hapiAccount
hapiAccount.attributes = {
  name: 'account'
}

var async = require('async')

var couchdbPush = require('couchdb-push')

var routePlugins = [
  require('../routes/session'),
  require('../routes/account'),
  require('../routes/accounts')
]

function hapiAccount (server, options, next) {
  var couchdbUrl = options.couchdb.url + '/_users'
  if (options.admin) {
    var username = encodeURIComponent(options.admin.username)
    var password = encodeURIComponent(options.admin.password)
    couchdbUrl = couchdbUrl.replace('://', '://' + username + ':' + password + '@')
  }
  var usersDesignDoc = require.resolve('./couchdb/users-design-doc.js')
  var plugins = [{
    register: require('@gar/hapi-json-api'),
    options: {}
  }].concat(routePlugins.map(function (plugin) {
    return {
      register: plugin,
      options: options
    }
  }))

  async.parallel([
    couchdbPush.bind(null, couchdbUrl, usersDesignDoc),
    server.register.bind(server, plugins)
  ], next)
}
