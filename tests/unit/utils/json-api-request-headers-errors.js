var lodash = require('lodash')

module.exports = jsonAPIRequestHeadersErrors

// TODO: Accept request headers errors
function jsonAPIRequestHeadersErrors (server, group, routeOptions) {
  var routeOpts = lodash.cloneDeep(routeOptions)
  var routeOptsHeaders = routeOpts.headers

  group.test('Content-Type', function (g) {
    g.test('is missing', function (t) {
      delete routeOptsHeaders['content-type']

      server.inject(routeOpts, function (response) {
        t.is(response.statusCode, 415, 'returns 415 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Unsupported Media Type', 'returns "Unsupported Media Type" error')
        t.end()
      })
    })

    g.test('wrong type', function (t) {
      routeOptsHeaders['content-type'] = 'text/json'

      server.inject(routeOpts, function (response) {
        t.is(response.statusCode, 415, 'returns 415 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Unsupported Media Type', 'returns "Unsupported Media Type" error')
        t.end()
      })
    })

    g.test('wrong subtype', function (t) {
      routeOptsHeaders['content-type'] = 'application/json'

      server.inject(routeOpts, function (response) {
        t.is(response.statusCode, 415, 'returns 415 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Unsupported Media Type', 'returns "Unsupported Media Type" error')
        t.end()
      })
    })

    g.test('with media type parameters', function (t) {
      routeOptsHeaders['content-type'] = 'application/vnd.api+json;q=0.9'

      server.inject(routeOpts, function (response) {
        t.is(response.statusCode, 415, 'returns 415 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Unsupported Media Type', 'returns "Unsupported Media Type" error')
        t.end()
      })
    })

    g.end()
  })
}
