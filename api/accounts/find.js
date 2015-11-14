module.exports = findAccount

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
        id: doc.roles[0].substr(3)
      }
      resolve(account)
    })
  })
}
