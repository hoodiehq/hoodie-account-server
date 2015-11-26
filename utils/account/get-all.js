module.exports = getAllAccounts

var Boom = require('boom')

function getAllAccounts (options, callback) {
  var request = require('request').defaults({
    json: true,
    baseUrl: options.couchUrl,
    timeout: 10000 // 10 seconds
  })

  request.get({
    url: '/_users/_all_docs?startkey=%22org.couchdb.user%3A%22&enkey=%22org.couchdb.user%3A%E9%A6%99%22',
    headers: {
      cookie: 'AuthSession=' + options.bearerToken
    }
  }, function (error, response, body) {
    if (error) {
      return callback(Boom.wrap(error))
    }

    if (response.statusCode >= 400) {
      return callback(Boom.create(response.statusCode, fixErrorMessage(body.reason)))
    }
    callback(null, body)
  })
}

function fixErrorMessage (message) {
  if (message === 'Only admins can access _all_docs of system databases.') {
    return 'Only admins can access /users'
  }

  return message
}
