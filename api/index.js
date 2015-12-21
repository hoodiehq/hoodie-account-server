module.exports = accountApi

var addSession = require('./sessions/add')
var findSession = require('./sessions/find')
var removeSession = require('./sessions/remove')

var addAccount = require('./accounts/add')
var findAccount = require('./accounts/find')
var findAllAccounts = require('./accounts/find-all')
var updateAccount = require('./accounts/update')
var removeAccount = require('./accounts/remove')

function accountApi (options) {
  var state = {
    db: options.db,
    secret: options.secret
  }

  return {
    sessions: {
      add: addSession.bind(null, state),
      find: findSession.bind(null, state),
      remove: removeSession.bind(null, state)
    },
    accounts: {
      add: addAccount.bind(null, state),
      find: findAccount.bind(null, state),
      findAll: findAllAccounts.bind(null, state),
      remove: removeAccount.bind(null, state),
      update: updateAccount.bind(null, state)
    }
  }
}
