module.exports = deleteAccount

var Boom = require('boom')

function deleteAccount (options, callback) {
  var request = require('request').defaults({
    json: true,
    baseUrl: options.couchUrl,
    timeout: 10000 // 10 seconds
  })

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
