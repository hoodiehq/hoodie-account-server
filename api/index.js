module.exports = accountApi

var EventEmitter = require('events').EventEmitter

var addSession = require('./sessions/add')
var findSession = require('./sessions/find')
var removeSession = require('./sessions/remove')

var addAccount = require('./accounts/add')
var findAccount = require('./accounts/find')
var findAllAccounts = require('./accounts/find-all')
var updateAccount = require('./accounts/update')
var removeAccount = require('./accounts/remove')
var accountsOn = require('./accounts/on')

var startListeningToAccountChanges = require('./utils/start-listening-to-account-changes')

function accountApi (options) {
  var accountsEmitter = new EventEmitter()
  var state = {
    db: options.db,
    secret: options.secret,
    accountsEmitter: accountsEmitter
  }

  accountsEmitter.once('newListener', startListeningToAccountChanges.bind(null, state))

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
      update: updateAccount.bind(null, state),
      on: accountsOn.bind(null, state)
    }
  }
}
