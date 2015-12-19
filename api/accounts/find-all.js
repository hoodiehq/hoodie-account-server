module.exports = findAllAccount

var findIdInRoles = require('../../utils/find-id-in-roles')
var getAllAccounts = require('../../utils/account/get-all')

function findAllAccount (state, options) {
  return new Promise(function (resolve, reject) {
    getAllAccounts({
      db: options.db,
      bearerToken: options.bearerToken
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
