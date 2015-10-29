var Boom = require('boom')

/* NOTES:
  How do send email. Do I use another hoodie api or just use nodemailer
*/

module.exports = function (server, options, next) {
  var couchUrl = options.couchdb || options.adapter.location
  var prefix = options.prefix || ''

  var request = require('request').defaults({
    json: true,
    baseUrl: couchUrl,
    timeout: 10000 // 10 seconds
  })

  function fetchUserDoc (userId, cb) {
    request.get({
      url: '/_users/' + encodeURIComponent(userId)
    }, function (err, resp, body) {
      cb(err, resp, body)
    })
  }

  function createPasswordReset (doc, cb) {
    request.get({
      url: '/uuids'
    }, function (err, resp, body) {
      if (err) {
        return cb(err)
      }
      doc.resetTimeStamp = new Date()
      doc.resetToken = body.uuids[0]
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
  function validateToken (doc, token, cb) {
    if (!doc.resetToken || !doc.resetTimeStamp) {
      return cb('missing reset token')
    }

    if (doc.resetToken !== token) {
      return cb('Incorrect password token supplied.')
    }
    cb(null, doc)
  }

  server.route([{
    method: 'POST',
    path: prefix + '/requests',
    handler: function (req, reply) {
      var headers = req.headers
      var username = req.payload.username
      var userId = 'org.couchdb.user:' + username
      var bearerToken = headers.authorization.substr(7)

      // set auth once for all requests
      request = request.defaults({
        headers: {
          cookie: 'AuthSession=' + bearerToken
        }
      })

      fetchUserDoc(userId,
       function (error, response, body) {
         if (error) {
           return reply(Boom.wrap(error))
         }

         if (response.statusCode === 404) {
           return reply(Boom.notFound())
         }

         if (!body.email) {
           return reply(Boom.notFound('User does not have a stored email address.'))
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
  }, {
    method: 'POST',
    path: prefix + '/passwordupdate',
    handler: function (req, reply) {
      var headers = req.headers
      var username = req.payload.username
      var password = req.payload.password
      var userId = 'org.couchdb.user:' + username
      var token = headers.authorization.substr(6)

      // set auth once for all requests
      // not sure how we set auth here
      /* request = request.defaults({
        headers: {
          cookie: 'AuthSession=' + bearerToken
        }
      }); */

      fetchUserDoc(userId,
       function (error, response, body) {
         if (error) {
           return reply(Boom.wrap(error))
         }

         if (response.statusCode === 404) {
           return reply(Boom.notFound())
         }

         if (response.statusCode >= 400) {
           return reply(Boom.create(response.statusCode, body.reason))
         }

         validateToken(body, token, function (err, doc) {
           if (err) {
             return reply(Boom.badRequest(err))
           }

           doc.password = password
           delete doc.resetToken
           delete doc.resetTimeStamp

           saveUserDoc(doc, function (err, username) {
             if (err) {
               return reply(Boom.create(err.statusCode, err.reason))
             }

             reply({
               username: username,
               msg: 'Password has been updated.'
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
