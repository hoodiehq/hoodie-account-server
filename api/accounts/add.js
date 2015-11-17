module.exports = addAccount

var createAccount = require('../../utils/account/create')

function addAccount (state, options) {
  return new Promise(function (resolve, reject) {
    createAccount({
      couchUrl: state.url,
      username: options.username,
      password: options.password,
      includeProfile: options.include === 'account.profile'
    }, function (error, session) {
      if (error) {
        return reject(error)
      }

      resolve(session)
    })
  })
}
