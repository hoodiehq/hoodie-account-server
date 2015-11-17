module.exports = removeSession

var deleteSession = require('../../utils/session/delete')

function removeSession (state, id, options) {
  return new Promise(function (resolve, reject) {
    deleteSession({
      couchUrl: state.url,
      bearerToken: id,
      includeAccount: options.include === 'account',
      includeProfile: options.include === 'account.profile'
    }, function (error, session) {
      if (error) {
        return reject(error)
      }

      resolve(session)
    })
  })
}
