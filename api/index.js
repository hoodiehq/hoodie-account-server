module.exports = accountApi

var _ = require('lodash')

var addSession = require('./session/add')
var findSession = require('./session/find')
var removeSession = require('./session/remove')

function accountApi (options) {
  var state = _.clone(options)

  return {
    sessions: {
      add: addSession.bind(null, state),
      find: findSession.bind(null, state),
      remove: removeSession.bind(null, state)
    }
  }
}
