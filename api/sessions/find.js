module.exports = findSession

var getSession = require('../../utils/session/get')

function findSession (state, id, options) {
  return new Promise(function (resolve, reject) {
    getSession({
      db: state.db,
      secret: state.secret,
      sessionId: id,
      includeProfile: options.include === 'account.profile'
    }, function (error, session) {
      if (error) {
        return reject(error)
      }

      resolve(session)
    })
  })
}
