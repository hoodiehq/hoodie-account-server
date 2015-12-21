module.exports = removeAccount

var updateAccount = require('./update')

function removeAccount (state, idOrObject, options) {
  return updateAccount(state, idOrObject, {
    _deleted: true
  }, options)
}
