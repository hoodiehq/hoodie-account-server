module.exports = isValidSessionId

var calculateSessionId = require('couchdb-calculate-session-id')
var decodeSessionId = require('./couchdb-decode-session-id')

function isValidSessionId (secret, salt, sessionId) {
  var session = decodeSessionId(sessionId)
  var name = session.name
  var time = session.time
  var sessionIdCheck = calculateSessionId(name, salt, secret, time)

  return sessionIdCheck === sessionId
}
