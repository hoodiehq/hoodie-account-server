module.exports = accountApi

var _ = require('lodash')

var addSession = require('./sessions/add')
var findSession = require('./sessions/find')
var removeSession = require('./sessions/remove')

var addAccount = require('./accounts/add')
var findAccount = require('./accounts/find')
var findAllAccounts = require('./accounts/find-all')
var removeAccount = require('./accounts/remove')

function accountApi (options) {
  var state = _.clone(options)

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
      remove: removeAccount.bind(null, state)
    }
  }
}
