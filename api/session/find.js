module.exports = findSession

var getSession = require('../../utils/session/get')

function findSession (state, id, options) {
  return new Promise(function (resolve, reject) {
    getSession({
      couchUrl: state.url,
      bearerToken: id,
      includeProfile: options.include === 'account.profile'
    }, function (error, session) {
      if (error) {
        return reject(error)
      }

      resolve(session)
    })
  })
}
