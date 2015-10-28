var nock = require('nock')
var test = require('tap').test

var getServer = require('../utils/get-server')
// var couchdbErrorTests = require('../utils/couchdb-error-tests')

getServer(function (error, server) {
  if (error) {
    return test.fail(error)
  }

  test('POST /requests password reset', function (group) {
    var postRequestRouteOptions = {
      method: 'POST',
      url: '/requests',
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
          return body.reset_token === '9aef3ffae9597ce60dfec0fee200094c'
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

    /* missing tests:
      * User doesn't exist
      * User exists but no email
      * Send email notification with url
      * errors on trying to create token
    */
    group.end()
  })

  test('POST /requests update password with token', function (group) {
    var postSetPasswordRequestRouteOptions = {
      method: 'POST',
      url: '/requests',
      payload: {
        type: 'setpassword',
        username: 'john',
        token: '9aef3ffae9597ce60dfec0fee200094c',
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
          type: 'user',
          email: 'john@email.com',
          roles: []
        })
        .get('/uuids')
        .reply(200, {
          uuids: ['9aef3ffae9597ce60dfec0fee200094c']
        })
        .put('/_users/org.couchdb.user%3Ajohn', function (body) {
          return body.reset_token === '9aef3ffae9597ce60dfec0fee200094c'
        })
        .reply(200)
    }
    group.test('Sets password for user with correct token', function (t) {
      server.inject(postSetPasswordRequestRouteOptions, function (response) {
        t.is(response.result.msg, 'password updated')
      })

    });

    group.end();
  });
})
