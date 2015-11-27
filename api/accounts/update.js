module.exports = updateAccount

var changeAccount = require('../../utils/account/change')
var findIdInRoles = require('../../utils/find-id-in-roles')

function updateAccount (state, idOrObject, changedProperties, options) {
  var id
  var username
  if (typeof idOrObject === 'string') {
    id = idOrObject
  } else {
    id = idOrObject.id
    username = idOrObject.username
  }
  return new Promise(function (resolve, reject) {
    changeAccount({
      id: id,
      couchUrl: state.url,
      username: username,
      change: changedProperties,
      bearerToken: options.bearerToken,
      includeProfile: options.include === 'account.profile'
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
