module.exports = couchdbErrorTests

function couchdbErrorTests (group, couchdbMock, routeOptions) {
  // skipped, see https://github.com/pouchdb/pouchdb/issues/4658
  group.test('CouchDB not reachable', {skip: true}, function (t) {
    couchdbMock().replyWithError('Ooops')

    this.server.inject(routeOptions, function (response) {
      t.is(response.statusCode, 500, 'returns 500 status')
      t.is(response.result.errors.length, 1, 'returns one error')
      t.is(response.result.errors[0].title, 'Internal Server Error', 'returns "Internal Server Error" error')
      t.end()
    })
  })

  // skipped, see https://github.com/pouchdb/pouchdb/issues/4658
  group.test('CouchDB timeout', {skip: true}, function (t) {
    couchdbMock()
      .socketDelay(10001)
      .reply(201)

    this.server.inject(routeOptions, function (response) {
      t.is(response.statusCode, 500, 'returns 500 status')
      t.is(response.result.errors.length, 1, 'returns one error')
      t.is(response.result.errors[0].title, 'Internal Server Error', 'returns "Internal Server Error" error')
      t.end()
    })
  })

  group.test('CouchDB Server Error', {skip: true}, function (t) {
    couchdbMock().reply(500, 'Ooops')

    this.server.inject(routeOptions, function (response) {
      t.is(response.statusCode, 500, 'returns 500 status')
      t.is(response.result.errors.length, 1, 'returns one error')
      t.is(response.result.errors[0].title, 'Internal Server Error', 'returns "Internal Server Error" error')
      t.end()
    })
  })
}
