var _ = require('lodash')
var Joi = require('joi')
var lolex = require('lolex')
var nock = require('nock')
var test = require('tap').test

var invalidTypeErrors = require('../../utils/invalid-type-errors.js')
var getServer = require('../../utils/get-server')

var couchdbMock = nock('http://localhost:5984')

function mockGetUser (username, replier) {
  var name = username || 'pat-doe'
  var reply = replier || function () {
    return [
      200,
      {
        _id: 'org.couchdb.user:' + name,
        _rev: '1-234',
        password_scheme: 'pbkdf2',
        iterations: 10,
        type: 'user',
        name: name,
        roles: ['id:userid123', 'mycustomrole'],
        derived_key: '4b5c9721ab77dd2faf06a36785fd0a30f0bf0d27',
        salt: 'salt123'
      }
    ]
  }

  return couchdbMock
    .get('/_users/org.couchdb.user%3A' + name)
    .query(true)
    .reply(reply)
}

var passwordChangeOptions = {
  method: 'PATCH',
  url: '/session/account',
  headers: {
    accept: 'application/vnd.api+json',
    authorization: 'Session cGF0LWRvZToxMjc1MDA6zEZsQ1BuO-W8SthDSrg8KXQ8OlQ',
    'content-type': 'application/vnd.api+json'
  },
  payload: {
    data: {
      id: 'userid123',
      type: 'account',
      attributes: {
        password: 'newsecret'
      }
    }
  }
}

var usernameChangeOptions = {
  method: 'PATCH',
  url: '/session/account',
  headers: {
    accept: 'application/vnd.api+json',
    authorization: 'Session cGF0LWRvZToxMjc1MDA6zEZsQ1BuO-W8SthDSrg8KXQ8OlQ',
    'content-type': 'application/vnd.api+json'
  },
  payload: {
    data: {
      id: 'userid123',
      type: 'account',
      attributes: {
        username: 'newName'
      }
    }
  }
}

function mockPasswordChange () {
  // user document gets fetched 3 times
  // We might improve that by implementing
  // an API like account.update({session: id}, change)
  // session.find()
  mockGetUser()

  // account.update()
  mockGetUser()

  couchdbMock.put('/_users/org.couchdb.user%3Apat-doe', function (body) {
    var error = Joi.object({
      _id: Joi.any().only('org.couchdb.user:pat-doe').required(),
      _rev: Joi.any().only('1-234').required(),
      name: Joi.any().only('pat-doe').required(),
      type: Joi.any().only('user').required(),
      salt: Joi.string().required(),
      derived_key: Joi.string().required(),
      iterations: Joi.any().only(10).required(),
      password_scheme: Joi.any().only('pbkdf2').required(),
      roles: Joi.array().items(Joi.string())
    }).validate(body).error

    return error === null
  })
  .query(true)
  .reply(201, {
    ok: true,
    id: 'org.couchdb.user:pat-doe',
    rev: '2-3456'
  })

  // session.add()
  mockGetUser()

  return couchdbMock
}

function mockUsernameChange () {
  // user document gets fetched 3 times
  // We might improve that by implementing
  // an API like account.update({session: id}, change)
  // session.find()
  mockGetUser('pat-doe')

  // account.update()
  mockGetUser('pat-doe')

  // account.update(): new doc with new user name
  couchdbMock.put('/_users/org.couchdb.user%3AnewName', function (body) {
    var error = Joi.object().keys({
      _id: Joi.any().only('org.couchdb.user:newName').required(),
      name: Joi.any().only('newName').required(),
      username: Joi.any().forbidden(),
      type: Joi.any().only('user').required(),
      salt: Joi.string().required(),
      derived_key: Joi.string().required(),
      iterations: Joi.any().only(10).required(),
      password_scheme: Joi.any().only('pbkdf2').required(),
      roles: Joi.array().items(Joi.string())
    }).validate(body).error

    return error === null
  })
  .query(true)
  .reply(201, {
    ok: true,
    id: 'org.couchdb.user:newName',
    rev: '2-3456'
  })

  // account.update(): deleted old doc
  couchdbMock.put('/_users/org.couchdb.user%3Apat-doe', function (body) {
    var error = Joi.object().keys({
      _deleted: Joi.boolean().only(true).required(),
      renamedTo: Joi.any().only('newName').required(),
      _id: Joi.any().only('org.couchdb.user:pat-doe').required(),
      _rev: Joi.any().only('1-234').required(),
      name: Joi.any().only('pat-doe').required(),
      type: Joi.any().only('user').required(),
      salt: Joi.string().required(),
      derived_key: Joi.string().required(),
      iterations: Joi.any().only(10).required(),
      password_scheme: Joi.any().only('pbkdf2').required(),
      roles: Joi.array().items(Joi.string())
    }).validate(body).error

    return error === null
  })
  .query(true)
  .reply(201, {
    id: 'org.couchdb.user:pat-doe',
    rev: '2-3456'
  })

  // session.add()
  mockGetUser('newName')

  return couchdbMock
}

getServer(function (error, server) {
  if (error) {
    return test('test setup', function (t) {
      t.error(error)
      t.end()
    })
  }

  test('PATCH /session/account', function (group) {
    invalidTypeErrors(server, group, passwordChangeOptions, 'account')

    group.test('without valid session', function (t) {
      var couch = mockGetUser('pat-doe', function () {
        return [
          404,
          {error: 'Not Found'}
        ]
      })

      server.inject(passwordChangeOptions, function (response) {
        t.is(couch.pendingMocks()[0], undefined, 'all mocks satisfied')

        t.is(response.statusCode, 401, 'returns 401 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Unauthorized', 'returns "Unauthorized" error')
        t.is(response.result.errors[0].detail, 'Session invalid', 'returns "Session invalid" message')

        t.end()
      })
    })

    group.test('No Authorization header sent', function (t) {
      server.inject({
        method: 'PATCH',
        url: '/session/account',
        headers: {}
      }, function (response) {
        t.is(response.statusCode, 401, 'returns 401 status')
        t.is(response.result.error, 'Unauthorized', 'returns "Unauthorized" error')
        t.is(response.result.message, 'Authorization header missing', 'returns "Authorization header missing" error')
        t.end()
      })
    })

    // test prepared for https://github.com/hoodiehq/hoodie-account-server/issues/100
    group.test('data.id is != account.id belonging to session', function (t) {
      var couch = mockGetUser()
      var options = _.defaultsDeep({
        payload: {
          data: {
            id: 'foobar'
          }
        }
      }, passwordChangeOptions)

      server.inject(options, function (response) {
        t.is(couch.pendingMocks()[0], undefined, 'all mocks satisfied')

        t.is(response.statusCode, 409, 'returns 409 status')
        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Conflict', 'returns "Conflict" error')
        t.is(response.result.errors[0].detail, 'data.id must be \'userid123\'', 'returns "data.id must be \'userid123\'" message')

        t.end()
      })
    })

    group.test('changing password', function (t) {
      var clock = lolex.install(0, ['Date'])
      var couchdb = mockPasswordChange()
      server.inject(passwordChangeOptions, function (response) {
        clock.uninstall()

        t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')

        t.is(response.statusCode, 204, 'returns 204 status')
        t.is(response.headers['x-set-session'], 'cGF0LWRvZToxMjc1MDA6zEZsQ1BuO-W8SthDSrg8KXQ8OlQ', 'returns new session id in x-set-session header')
        t.is(response.result, null, 'returns no body')

        t.end()
      })
    })

    group.test('username change', function (t) {
      var clock = lolex.install(0, ['Date'])
      var couchdb = mockUsernameChange()
      server.inject(usernameChangeOptions, function (response) {
        clock.uninstall()

        t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')

        t.is(response.headers['x-set-session'], 'bmV3TmFtZToxMjc1MDA6qEoYxvyylNhd0HhOkAT9A4eUefg', 'returns new session id in x-set-session header')
        t.is(response.statusCode, 204, 'returns 204 status')
        t.is(response.result, null, 'returns no body')

        t.end()
      })
    })

    group.end()
  })

  test('PATCH /session/account?include=profile', {todo: true}, function (t) {
    t.end()
  })

  test('PATCH /session/account?include=foobar', function (t) {
    var options = _.defaultsDeep({
      url: '/session/account?include=foobar'
    }, passwordChangeOptions)

    server.inject(options, function (response) {
      t.is(response.statusCode, 400, 'returns 400 status')
      t.deepEqual(response.result.errors[0].detail, 'Allowed value for ?include is \'profile\'', 'returns error message')
      t.end()
    })
  })
})
