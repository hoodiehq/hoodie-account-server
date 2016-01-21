module.exports = updateAccount

var _ = require('lodash')

var findUserDoc = require('../utils/find-user-by-username-or-id')
var toAccount = require('../utils/doc-to-account')

function updateAccount (state, idOrObject, change, options) {
  if (!options) {
    options = {}
  }
  return findUserDoc(state.db, idOrObject)

  .then(function (doc) {
    return state.db.put(_.merge(doc, change))

    .then(function (response) {
      doc._rev = response.rev
      return doc
    })

    .catch(function (error) {
      throw error
    })
  })

  .then(function (doc) {
    return toAccount(doc, {
      includeProfile: options.include === 'profile'
    })
  })
}
