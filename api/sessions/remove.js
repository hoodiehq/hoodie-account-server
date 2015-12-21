module.exports = removeSession

var findSession = require('./find')

function removeSession (state, id, options) {
  return findSession(state, id, options)

  .then(function (session) {
    if (options.include) {
      return session
    }
  })
}
