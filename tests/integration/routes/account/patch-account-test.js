var _ = require('lodash')
var Joi = require('joi')
var lolex = require('lolex')
var nock = require('nock')
var test = require('tap').test

var invalidTypeErrors = require('../../utils/invalid-type-errors.js')
var getServer = require('../../utils/get-server')

var couchdbGetUserMock = nock('http://localhost:5984')
  .get('/_users/org.couchdb.user%3Apat-doe')
  .query(true)

function mockUserFound (docChange) {
  return couchdbGetUserMock
    .reply(200, _.merge({
      _id: 'org.couchdb.user:pat-doe',
      _rev: '1-234',
      password_scheme: 'pbkdf2',
      iterations: 10,
      type: 'user',
      name: 'pat-doe',
      roles: ['id:userid123', 'mycustomrole'],
      derived_key: '4b5c9721ab77dd2faf06a36785fd0a30f0bf0d27',
      salt: 'salt123'
    }, docChange))
}

var routeOptions = {
  method: 'PATCH',
  url: '/session/account',
  headers: {
    accept: 'application/vnd.api+json',
    authorization: 'Bearer cGF0LWRvZToxMjc1MDA6zEZsQ1BuO-W8SthDSrg8KXQ8OlQ',
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
function responseMock () {
  // user document gets fetched 3 times:
  // 1) session.find()
  // 2) account.update()
  // 3) session.add()
  // We might improve that by implementing
  // an API like account.update({session: id}, change)
  mockUserFound()
  mockUserFound()
  return mockUserFound()
    .post('/_users/_bulk_docs', function (body) {
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
      }).validate(body.docs[0]).error

      return error === null
    })
    .query(true)
}

getServer(function (error, server) {
  if (error) {
    return test('test setup', function (t) {
      t.error(error)
      t.end()
    })
  }

  test('PATCH /session/account', function (group) {
    invalidTypeErrors(server, group, routeOptions, 'account')

    group.test('without valid session', function (t) {
      var couch = couchdbGetUserMock
        .reply(404, {error: 'Not Found'})

      server.inject(routeOptions, function (response) {
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
      var couch = mockUserFound()
      var options = _.defaultsDeep({
        payload: {
          data: {
            id: 'foobar'
          }
        }
      }, routeOptions)

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
      var couchdb = responseMock()
        .reply(201, [{
          id: 'org.couchdb.user:pat-doe',
          rev: '2-3456'
        }])
      server.inject(routeOptions, function (response) {
        clock.uninstall()

        t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')

        t.is(response.statusCode, 204, 'returns 204 status')
        t.is(response.headers['x-set-session'], 'cGF0LWRvZToxMjc1MDA6zEZsQ1BuO-W8SthDSrg8KXQ8OlQ', 'returns new session id in x-set-session header')
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
    }, routeOptions)

    server.inject(options, function (response) {
      t.is(response.statusCode, 400, 'returns 400 status')
      t.deepEqual(response.result.errors[0].detail, 'Allowed value for ?include is \'profile\'', 'returns error message')
      t.end()
    })
  })
})
