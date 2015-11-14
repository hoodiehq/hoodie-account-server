module.exports = removeAccount

var deleteAccount = require('../../utils/account/delete')

function removeAccount (state, username, options) {
  return new Promise(function (resolve, reject) {
    deleteAccount({
      couchUrl: state.url,
      username: username,
      bearerToken: options.bearerToken,
      includeProfile: options.include === 'account.profile'
    }, function (error, session) {
      if (error) {
        return reject(error)
      }

      resolve(session)
    })
  })
}
