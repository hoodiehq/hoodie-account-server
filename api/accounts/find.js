module.exports = findAccount

var findUserDoc = require('../utils/find-user-by-username-or-id')
var toAccount = require('../utils/doc-to-account')

function findAccount (state, idOrObject, options) {
  if (!options) {
    options = {}
  }
  return findUserDoc(state.db, idOrObject)

  .then(function (doc) {
    return toAccount(doc, {
      includeProfile: options.include === 'profile'
    })
  })
}
