var Boom = require('boom')

/* NOTES:
  * What Auth do we use against CouchDB to get/set user doc? (user not logged in)
  * What url do we send to the user? (how do configure url)
  * Could we use promises? I think it will clean the code up nicely
*/
module.exports = function (server, options, next) {
  var couchUrl = options.couchdb || options.adapter.location
  var prefix = options.prefix || ''

  var request = require('request').defaults({
    json: true,
    baseUrl: couchUrl,
    timeout: 10000 // 10 seconds
  })

  function createPasswordReset (doc, cb) {
    request.get({
      url: '/uuids'
    }, function (err, resp, body) {
      if (err) {
        return cb(err)
      }
      doc.reset_time_stamp = new Date()
      doc.reset_token = body.uuids[0]
      cb(null, doc)
    })
  };

  function saveUserDoc (doc, cb) {
    request.put({
      url: '/_users/' + encodeURIComponent(doc._id),
      body: doc
    }, function (error, response, body) {
      if (error) {
        return cb(error)
      }

      if (response.statusCode >= 400) {
        // Note that PouchDB Server does not return a 409 as it should in case of conflict
        // but a 403: https://github.com/pouchdb/express-pouchdb/issues/240
        return cb({statusCode: response.statusCode, reason: body.reason})
      }

      cb(null, doc.name)
    })
  }

  server.route([{
    method: 'POST',
    path: prefix + '/requests',
    handler: function (req, reply) {
      var username = req.payload.username
      // TODO: this fails due to
      // https://github.com/pouchdb/express-pouchdb/issues/240
      var userId = 'org.couchdb.user:' + username
      request.get({
        url: '/_users/' + encodeURIComponent(userId),
        headers: {
          // cookie: 'AuthSession=' + bearerToken
        }
      }, function (error, response, body) {
        if (error) {
          return reply(Boom.wrap(error))
        }

        if (response.statusCode >= 400) {
          return reply(Boom.create(response.statusCode, body.reason))
        }

        createPasswordReset(body, function (err, doc) {
          if (err) {
            return reply(Boom.wrap(err))
          }

          saveUserDoc(doc, function (err, username) {
            if (err) {
              return reply(Boom.create(err.statusCode, err.reason))
            }

            reply({
              username: username,
              msg: 'email sent.'
            })
          })
        })
      })
    }
  }])

  next()
}

module.exports.attributes = {
  name: 'account-api-request'
}
