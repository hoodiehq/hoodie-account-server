module.exports = findAccount

var findIdInRoles = require('../../utils/find-id-in-roles')
var getAccount = require('../../utils/account/get')

function findAccount (state, username, options) {
  return new Promise(function (resolve, reject) {
    getAccount({
      couchUrl: state.url,
      username: username,
      includeProfile: options.include === 'profile'
    }, function (error, doc) {
      if (error) {
        return reject(error)
      }

      var account = {
        username: doc.name,
        id: findIdInRoles(doc.roles)
      }
      resolve(account)
    })
  })
}
