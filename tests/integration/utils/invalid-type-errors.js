var cloneDeep = require('lodash/cloneDeep')

module.exports = invalidTypeErrors

function invalidTypeErrors (group, routeOptions, type) {
  group.test('type is not provided', function (t) {
    var options = cloneDeep(routeOptions)
    delete options.payload.data.type

    this.server.inject(options, function (response) {
      t.is(response.statusCode, 409, 'returns 409 status')
      t.is(response.result.errors.length, 1, 'returns one error')
      t.is(response.result.errors[0].title, 'Conflict', 'returns "Conflict" error')
      t.is(response.result.errors[0].detail, 'data.type must be \'' + type + '\'', 'returns "Conflict" error')
      t.end()
    })
  })

  group.test('type is not supported', function (t) {
    var options = cloneDeep(routeOptions)
    options.payload.data.type = 'foo'

    this.server.inject(options, function (response) {
      t.is(response.statusCode, 409, 'returns 409 status')
      t.is(response.result.errors.length, 1, 'returns one error')
      t.is(response.result.errors[0].title, 'Conflict', 'returns "Conflict" error')
      t.is(response.result.errors[0].detail, 'data.type must be \'' + type + '\'', 'returns "Conflict" error')
      t.end()
    })
  })
}
