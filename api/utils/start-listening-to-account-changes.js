module.exports = startListeningToAccountChanges

var toAccount = require('./doc-to-account')

function startListeningToAccountChanges (state) {
  state.db.changes({
    since: 'now',
    live: true,
    include_docs: true
  })

  .on('change', function (change) {
    var isNew = parseInt(change.doc._rev, 10) === 1
    var eventName = isNew ? 'add' : 'update'

    if (change.deleted) {
      eventName = 'remove'
    }

    var account = toAccount(change.doc, {
      includeProfile: true
    })

    state.accountsEmitter.emit('change', eventName, account)
    state.accountsEmitter.emit(eventName, account)
  })
}
