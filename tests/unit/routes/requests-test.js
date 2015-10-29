var nock = require('nock')
var test = require('tap').test

var getServer = require('../utils/get-server')

getServer(function (error, server) {
  if (error) {
    return test.fail(error)
  }

  test('POST /requests password reset', function (group) {
    var postRequestRouteOptions = {
      method: 'POST',
      url: '/requests',
      headers: {
        authorization: 'Bearer 123'
      },
      payload: {
        type: 'createresetpassword',
        username: 'john'
      }
    }
    function postRequestResponseMock () {
      return nock('http://localhost:5984')
        // mock valid response to sign in request
        .get('/_users/org.couchdb.user%3Ajohn')
        .reply(200, {
          _id: 'org.couchdb.user:john',
          _rev: '1-abc',
          name: 'john',
          type: 'user',
          email: 'john@email.com',
          roles: []
        })
        .get('/uuids')
        .reply(200, {
          uuids: ['9aef3ffae9597ce60dfec0fee200094c']
        })
        .put('/_users/org.couchdb.user%3Ajohn', function (body) {
          return body.resetToken === '9aef3ffae9597ce60dfec0fee200094c'
        })
        .reply(200)
    }

    group.test('Creates token and timestamp for username', function (t) {
      t.plan(1)
      postRequestResponseMock()

      server.inject(postRequestRouteOptions, function (response) {
        t.is(response.result.msg, 'email sent.')
      })
    })

    function postMissingUserResponseMock () {
      return nock('http://localhost:5984')
        // mock valid response to sign in request
        .get('/_users/org.couchdb.user%3Ajohn')
        .reply(404)
    }

    group.test('sends error if user does not exist', function (t) {
      t.plan(1)
      postMissingUserResponseMock()
      server.inject(postRequestRouteOptions, function (response) {
        t.is(response.statusCode, 404)
      })
    })

    function postMissingEmailUserResponseMock () {
      return nock('http://localhost:5984')
        // mock valid response to sign in request
        .get('/_users/org.couchdb.user%3Ajohn')
        .reply(200, {
          _id: 'org.couchdb.user:john',
          _rev: '1-abc',
          name: 'john',
          type: 'user',
          roles: []
        })
    }

    group.test('sends error if no email for user', function (t) {
      t.plan(2)
      postMissingEmailUserResponseMock()
      server.inject(postRequestRouteOptions, function (response) {
        t.is(response.statusCode, 404)
        t.is(response.result.message, 'User does not have a stored email address.')
      })
    })

    /* missing tests:
      * Send email notification with url
    */
    group.end()
  })

  test('POST /requests update password with token', function (group) {
    var postSetPasswordRequestRouteOptions = {
      method: 'POST',
      url: '/passwordupdate',
      headers: {
        authorization: 'Token 9aef3ffae9597ce60dfec0fee200094c'
      },
      payload: {
        username: 'john',
        password: 'this-is-my-password'
      }
    }
    function postSetPasswordRequestResponseMock () {
      return nock('http://localhost:5984')
        // mock valid response to sign in request
        .get('/_users/org.couchdb.user%3Ajohn')
        .reply(200, {
          _id: 'org.couchdb.user:john',
          _rev: '1-abc',
          name: 'john',
          resetToken: '9aef3ffae9597ce60dfec0fee200094c',
          resetTimeStamp: new Date(),
          type: 'user',
          email: 'john@email.com',
          roles: []
        })
        .put('/_users/org.couchdb.user%3Ajohn', function (body) {
          return body.password === 'this-is-my-password'
        })
        .reply(200)
    }

    group.test('Sets password for user with correct token', function (t) {
      t.plan(1)
      postSetPasswordRequestResponseMock()

      server.inject(postSetPasswordRequestRouteOptions, function (response) {
        t.is(response.result.msg, 'Password has been updated.')
      })
    })

    function postSetPasswordBadTokenRequestResponseMock () {
      return nock('http://localhost:5984')
        // mock valid response to sign in request
        .get('/_users/org.couchdb.user%3Ajohn')
        .reply(200, {
          _id: 'org.couchdb.user:john',
          _rev: '1-abc',
          name: 'john',
          resetToken: '123123',
          resetTimeStamp: new Date(),
          type: 'user',
          email: 'john@email.com',
          roles: []
        })
        .put('/_users/org.couchdb.user%3Ajohn', function (body) {
          return body.password === 'this-is-my-password'
        })
        .reply(200)
    }

    group.test('sends error if token does not match', function (t) {
      t.plan(2)
      postSetPasswordBadTokenRequestResponseMock()

      server.inject(postSetPasswordRequestRouteOptions, function (response) {
        t.is(response.result.message, 'Incorrect password token supplied.')
        t.is(response.statusCode, 400)
      })
    })

    group.end()
  })
})
