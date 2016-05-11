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
    var username = change.username

    if (username) {
      // changing the username requires 2 operations:
      // 1) create a new doc (with the new name)
      // 2) delete the old doc

      var oldDoc = doc

      // the new doc will NOT include the username or the _rev
      doc = _.merge(
        _.omit(doc, ['username', '_rev']),
        _.omit(change, 'username'),
        {_id: 'org.couchdb.user:' + username, name: username}
      )

      // 1) add the new doc
      return state.db.put(doc)

      .then(function (response) {
        doc._rev = response.rev

        // delete the old doc and add the renamedTo field
        var deletedDoc = _.defaultsDeep({
          _deleted: true,
          renamedTo: username
        }, oldDoc)

        // 2) delete the old doc
        return state.db.put(deletedDoc)
      })

      .then(() => doc)
    }

    return state.db.put(_.merge(doc, change))

    .then(function (response) {
      doc._rev = response.rev
      return doc
    })
  })

  .then(function (doc) {
    return toAccount(doc, {
      includeProfile: options.include === 'profile'
    })
  })
}
