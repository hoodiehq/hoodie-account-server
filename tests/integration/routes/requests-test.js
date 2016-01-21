var defaultsDeep = require('lodash/defaultsDeep')
var Joi = require('joi')
var _ = require('lodash')
var nock = require('nock')
var stubTransport = require('nodemailer-stub-transport')
var test = require('tap').test

var getServer = require('../utils/get-server')
var couchdbErrorTests = require('../utils/couchdb-error-tests')
var invalidTypeErrors = require('../utils/invalid-type-errors.js')

var transport = stubTransport()

var postRequestsRouteOptions = {
  method: 'POST',
  url: '/requests',
  headers: {
    accept: 'application/vnd.api+json',
    'content-type': 'application/vnd.api+json'
  },
  payload: {
    data: {
      type: 'request',
      attributes: {
        type: 'passwordreset',
        username: 'pat@example.com'
      }
    }
  }
}

var couchdbGetUserMock = nock('http://localhost:5984')
  .get('/_users/org.couchdb.user%3Apat%40example.com')
  .query(true)

function mockUserFound (docChange) {
  return couchdbGetUserMock
    .reply(200, _.merge({
      _id: 'org.couchdb.user:pat@example.com',
      _rev: '1-234',
      password_scheme: 'pbkdf2',
      iterations: 10,
      type: 'user',
      name: 'pat@example.com',
      roles: ['id:userid123', 'mycustomrole'],
      derived_key: '4b5c9721ab77dd2faf06a36785fd0a30f0bf0d27',
      salt: 'salt123'
    }, docChange))
}

test('POST /requests', function (group) {
  var sentEmails = []
  transport.on('log', function (log) {
    if (log.type === 'envelope') {
      sentEmails.push(JSON.parse(log.message))
      return
    }

    if (log.type === 'message' && !/^Content-Type:/.test(log.message)) {
      sentEmails[sentEmails.length - 1].body = log.message
    }
  })

  getServer({
    notifications: {
      transport: transport,
      from: 'notifications@example.com'
    }
  }, function (error, server) {
    if (error) {
      return test('test setup', function (t) {
        t.error(error)
        t.end()
      })
    }

    group.test('user found', function (t) {
      var couchdb = mockUserFound()
        .post('/_users/_bulk_docs', function (body) {
          var error = Joi.object({
            _id: Joi.any().only('org.couchdb.user:pat@example.com').required(),
            _rev: Joi.any().only('1-234').required(),
            name: Joi.any().only('pat@example.com').required(),
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
        .reply(201, [{
          id: 'org.couchdb.user:pat-doe',
          rev: '2-345'
        }])

      server.inject(postRequestsRouteOptions, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')
        t.is(response.statusCode, 201, 'returns 201 status')
        t.ok(response.result.data.id, 'returns with id')
        t.is(response.result.data.attributes.username, 'pat@example.com', 'returns username attribute')
        t.ok(response.result.data.attributes.messageId, 'returns messageId attribute')

        t.is(sentEmails.length, 1, '1 email sent')
        var email = sentEmails.pop()
        t.is(email.from, 'notifications@example.com', 'sent from notifications@example.com')
        t.deepEqual(email.to, ['pat@example.com'], 'sent to pat@example.com')
        t.ok(/username: pat@example.com\npassword: [0-9a-f]{12}(\n|$)/.test(email.body), 'has new password')

        t.end()
      })
    })

    group.test('user not found', function (t) {
      var couchdb = couchdbGetUserMock
        .reply(404, {
          error: 'not_found',
          reason: 'missing'
        })

      server.inject(postRequestsRouteOptions, function (response) {
        t.is(couchdb.pendingMocks()[0], undefined, 'all mocks satisfied')
        t.is(response.statusCode, 404, 'returns 404 status')

        t.is(sentEmails.length, 0, 'no email sent')

        t.end()
      })
    })

    group.test('username is not a valid email', function (t) {
      var options = defaultsDeep({
        payload: {
          data: {
            attributes: {
              username: 'foo'
            }
          }
        }
      }, postRequestsRouteOptions)

      server.inject(options, function (response) {
        t.is(response.statusCode, 409, 'returns 409 status')

        t.is(response.result.errors.length, 1, 'returns one error')
        t.is(response.result.errors[0].title, 'Conflict', 'returns "Conflict" error')

        // TODO: fix Joi’s standard error messages. `.detail` currently is
        //       child "data" fails because [child "attributes" fails because
        //       [child "username" fails because ["username" must be a valid email]]]
        // t.is(response.result.errors[0].detail, 'username (foo) is invalid email address')
        t.end()
      })
    })

    couchdbErrorTests(server, group, couchdbGetUserMock, postRequestsRouteOptions)
    invalidTypeErrors(server, group, postRequestsRouteOptions)

    group.end()
  })
})

// test('POST /requests without notifications config', function (t) {
//   getServer({
//     notifications: {}
//   }, function (error, server) {
//     if (error) {
//       t.error(error)
//       t.end()
//     }
//
//     server.inject(postRequestsRouteOptions, function (response) {
//       t.is(response.statusCode, 503, 'returns 503 status')
//       t.end()
//     })
//   })
// })
