module.exports = findAccount

var findIdInRoles = require('../../utils/find-id-in-roles')
var getAccount = require('../../utils/account/get')

function findAccount (state, idOrObject, options) {
  var id
  var username
  if (typeof idOrObject === 'string') {
    id = idOrObject
  } else {
    id = idOrObject.id
    username = idOrObject.username
  }
  return new Promise(function (resolve, reject) {
    getAccount({
      couchUrl: state.url,
      id: id,
      username: username,
      bearerToken: options.bearerToken
    }, function (error, doc) {
      if (error) {
        return reject(error)
      }

      var account = {
        username: doc.name,
        id: findIdInRoles(doc.roles)
      }

      if (options.include === 'profile') {
        account.profile = doc.profile
      }

      resolve(account)
    })
  })
}
