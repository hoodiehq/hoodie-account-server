module.exports = hapiAccount
hapiAccount.attributes = {
  name: 'account-api'
}

var plugins = [
  require('./lib/routes/session'),
  require('./lib/routes/account'),
  require('./lib/routes/requests')
]

function hapiAccount (server, options, next) {
  server.register(plugins.map(function (plugin) {
    return {
      register: plugin,
      options: options
    }
  }), next)
}
