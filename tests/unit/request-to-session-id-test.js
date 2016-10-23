var test = require('tap').test

var requestToSessionID = require('../../routes/utils/request-to-session-id')

test('to session ID', function (t) {
  var request = { headers: { authorization: '' } }
  t.is(requestToSessionID(request), '', 'returns empty string')
  t.end()
})
