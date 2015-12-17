module.exports = removeSession

var getSession = require('../../utils/session/get')

function removeSession (state, id, options) {
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

      if (options.include) {
        return resolve(session)
      }

      resolve()
    })
  })
}
