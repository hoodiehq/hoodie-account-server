module.exports = removeAccount

var deleteAccount = require('../../utils/account/delete')

function removeAccount (state, idOrObject, options) {
  var id
  var username
  if (typeof idOrObject === 'string') {
    id = idOrObject
  } else {
    id = idOrObject.id
    username = idOrObject.username
  }
  return new Promise(function (resolve, reject) {
    deleteAccount({
      couchUrl: state.url,
      id: id,
      username: username,
      bearerToken: options.bearerToken,
      includeProfile: options.include === 'account.profile'
    }, function (error) {
      if (error) {
        return reject(error)
      }

      resolve()
    })
  })
}
