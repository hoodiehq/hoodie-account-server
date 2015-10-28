module.exports = couchdbErrorTests

function couchdbErrorTests (server, group, couchdbMock, routeOptions) {
  group.test('CouchDB not reachable', function (t) {
    couchdbMock().replyWithError('Ooops')

    server.inject(routeOptions, function (response) {
      t.is(response.statusCode, 500, 'returns 500 status')
      t.is(response.result.error, 'Internal Server Error', '"Internal Server Error" error')
      t.end()
    })
  })

  group.test('CouchDB returns 418 error', function (t) {
    couchdbMock().reply(418, {
      error: 'teapot',
      reason: 'too hot'
    })

    server.inject(routeOptions, function (response) {
      t.is(response.statusCode, 418, 'returns 418 status')
      t.is(response.result.error, 'I\'m a teapot', '"I\'m a teapot" error')
      t.end()
    })
  })

  group.test('CouchDB timeout', function (t) {
    couchdbMock()
      .socketDelay(10001)
      .reply(201)

    server.inject(routeOptions, function (response) {
      t.is(response.statusCode, 500, 'returns 500 status')
      t.is(response.result.error, 'Internal Server Error', '"Internal Server Error" error')
      t.end()
    })
  })
}
