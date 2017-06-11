module.exports = authorizationHeaderNotAllowedError

var cloneDeep = require('lodash/cloneDeep')

function authorizationHeaderNotAllowedError (group, routeOptions) {
  group.test('Authorization header provided', function (t) {
    var options = cloneDeep(routeOptions)
    options.headers.authorization = 'Session sessionid123'

    this.server.inject(options, function (response) {
      t.is(response.statusCode, 403, 'returns 403 status')
      t.is(response.result.errors.length, 1, 'returns one error')
      t.is(response.result.errors[0].title, 'Forbidden', 'returns "Forbidden" error')
      t.is(response.result.errors[0].detail, 'Authorization header not allowed', 'returns "Authorization header not allowed" message')
      t.end()
    })
  })
}
