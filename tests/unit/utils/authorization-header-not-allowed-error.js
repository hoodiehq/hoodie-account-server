var lodash = require('lodash')

module.exports = authorizationHeaderNotAllowedError

function authorizationHeaderNotAllowedError (server, group, routeOptions, headersWithAuth) {
  var routeOpts = lodash.cloneDeep(routeOptions)
  routeOpts.headers = headersWithAuth

  group.test('Authorization header provided', function (t) {
    server.inject(routeOpts, function (response) {
      t.is(response.statusCode, 403, 'returns 403 status')
      t.is(response.result.errors.length, 1, 'returns one error')
      t.is(response.result.errors[0].title, 'Forbidden', 'returns "Forbidden" error')
      t.end()
    })
  })
}
