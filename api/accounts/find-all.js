module.exports = findAccount

var findIdInRoles = require('../../utils/find-id-in-roles')
var getAllAccounts = require('../../utils/account/get-all')

function findAccount (state, options) {
  return new Promise(function (resolve, reject) {
    getAllAccounts({
      couchUrl: state.url
    }, function (error, response) {
      if (error) {
        return reject(error)
      }

      resolve(response.rows.map(toAccount.bind(null, options)))
    })
  })
}

function toAccount (options, row) {
  var account = {
    username: row.doc.name,
    id: findIdInRoles(row.doc.roles)
  }

  if (options.include === 'profile') {
    account.profile = row.doc.profile
  }

  return account
}
