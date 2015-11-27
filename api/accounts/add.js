module.exports = addAccount

var createAccount = require('../../utils/account/create')

function addAccount (state, properties, options) {
  if (!options) {
    options = {}
  }
  return new Promise(function (resolve, reject) {
    createAccount(state, {
      username: properties.username,
      password: properties.password,
      roles: properties.roles,
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
