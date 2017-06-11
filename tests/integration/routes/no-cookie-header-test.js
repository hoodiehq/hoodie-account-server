var test = require('tap').test

var getServer = require('../utils/get-server')

var routeOptions = {
  method: 'GET',
  url: '/',
  headers: {
    cookie: 'testCookie'
  }
}

var routePOSTOptions = {
  method: 'POST',
  url: '/',
  headers: {
    cookie: 'testCookie'
  }
}

test('Recieve no cookie on GET Request', function (group) {
  group.beforeEach(getServer)

  group.test('GET no cookie', function (t) {
    this.server.inject(routeOptions, function (response) {
      t.is(response.raw.req.headers.cookie, undefined, 'Header Cookie on GET Request should be null')
      t.end()
    })
  })

  group.end()
})

test('Recieve no cookie on POST Request', function (group) {
  group.beforeEach(getServer)

  group.test('POST no cookie', function (t) {
    this.server.inject(routePOSTOptions, function (response) {
      t.is(response.raw.req.headers.cookie, undefined, 'Header Cookie on GET Request should be null')
      t.end()
    })
  })

  group.end()
})
