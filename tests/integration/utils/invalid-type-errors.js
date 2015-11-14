var lodash = require('lodash')

module.exports = invalidTypeErrors

function invalidTypeErrors (server, group, routeOptions) {
  var routeOpts = lodash.cloneDeep(routeOptions)
  delete routeOpts.payload.data.type

  group.test('type is not provided', function (t) {
    server.inject(routeOpts, function (response) {
      t.is(response.statusCode, 409, 'returns 409 status')
      t.is(response.result.errors.length, 1, 'returns one error')
      t.is(response.result.errors[0].title, 'Conflict', 'returns "Conflict" error')
      t.end()
    })
  })

  group.test('type is not supported', function (t) {
    routeOpts.payload.data.type = 'foo'

    server.inject(routeOpts, function (response) {
      t.is(response.statusCode, 409, 'returns 409 status')
      t.is(response.result.errors.length, 1, 'returns one error')
      t.is(response.result.errors[0].title, 'Conflict', 'returns "Conflict" error')
      t.end()
    })
  })
}
