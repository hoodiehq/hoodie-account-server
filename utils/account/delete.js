module.exports = deleteAccount

var Boom = require('boom')

function deleteAccount (options, callback) {
  var request = require('request').defaults({
    json: true,
    baseUrl: options.couchUrl,
    timeout: 10000 // 10 seconds
  })

  if (!options.username) {
    return request.get({
      url: '/_users/_design/byId/_view/byId?key=' + options.id,
      headers: {
        cookie: 'AuthSession=' + options.bearerToken
      }
    }, function (error, response, body) {
      if (error) {
        return callback(Boom.wrap(error))
      }

      if (response.statusCode >= 400) {
        return callback(Boom.create(response.statusCode, body.reason))
      }

      if (body.rows.length === 0) {
        return callback(Boom.notFound())
      }
      options.username = body.rows[0].id.substr('org.couchdb.user:'.length)
      return sendDeleteRequest(request, options, callback)
    })
  }

  sendDeleteRequest(request, options, callback)
}

function sendDeleteRequest (request, options, callback) {
  request.del({
    url: '/_users/org.couchdb.user:' + encodeURIComponent(options.username),
    headers: {
      cookie: 'AuthSession=' + options.bearerToken
    }
  }, function (error, response, body) {
    if (error) {
      return callback(Boom.wrap(error))
    }

    if (response.statusCode >= 400) {
      return callback(Boom.create(response.statusCode, body.reason))
    }

    callback()
  })
}
