module.exports = hapiAccount
hapiAccount.attributes = {
  name: 'account'
}

var routePlugins = [
  require('../routes/session'),
  require('../routes/account'),
  require('../routes/accounts')
]

function hapiAccount (server, options, next) {
  server.register({
    register: require('@gar/hapi-json-api'),
    options: {}
  }, function (error) {
    if (error) {
      throw error
    }
  })

  server.register(routePlugins.map(function (plugin) {
    return {
      register: plugin,
      options: options
    }
  }), next)
}
