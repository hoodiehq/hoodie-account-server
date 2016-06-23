module.exports = authorizationHeaderNotAllowedError

var merge = require('lodash/merge')

function authorizationHeaderNotAllowedError (server, group, routeOptions) {
  var options = merge({}, routeOptions, {
    headers: {
      authorization: 'Session sessionid123'
    }
  })

  group.test('Authorization header provided', function (t) {
    server.inject(options, function (response) {
      t.is(response.statusCode, 403, 'returns 403 status')
      t.is(response.result.errors.length, 1, 'returns one error')
      t.is(response.result.errors[0].title, 'Forbidden', 'returns "Forbidden" error')
      t.is(response.result.errors[0].detail, 'Authorization header not allowed', 'returns "Authorization header not allowed" message')
      t.end()
    })
  })
}
