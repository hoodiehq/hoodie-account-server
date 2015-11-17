module.exports = deleteSession

var Boom = require('boom')

var getSession = require('./get')

function deleteSession (options, callback) {
  var request = require('request').defaults({
    json: true,
    baseUrl: options.couchUrl,
    timeout: 10000 // 10 seconds
  })
  var requestOptions = {
    url: '/_session',
    headers: {
      cookie: 'AuthSession=' + options.bearerToken
    }
  }

  if (!options.includeProfile && !options.includeAccount) {
    return request.del(requestOptions, function (error, response, body) {
      if (error) {
        return callback(Boom.wrap(error))
      }

      if (response.statusCode >= 400) {
        return callback(Boom.create(response.statusCode, body.reason))
      }

      callback()
    })
  }

  getSession(options, function (error, session) {
    if (error) {
      return callback(error)
    }

    return request.del(requestOptions, function (error, response, body) {
      if (error) {
        return callback(Boom.wrap(error))
      }

      if (response.statusCode >= 400) {
        return callback(Boom.create(response.statusCode, body.reason))
      }

      callback(null, session)
    })
  })
}
