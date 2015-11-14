module.exports = hapiAccount
hapiAccount.attributes = {
  name: 'account'
}

var plugins = [
  require('./lib/routes/session'),
  require('./lib/routes/account')
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

  server.register(plugins.map(function (plugin) {
    return {
      register: plugin,
      options: options
    }
  }), next)
}
