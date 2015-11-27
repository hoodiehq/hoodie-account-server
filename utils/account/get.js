module.exports = getAccount

var Boom = require('boom')

function getAccount (options, callback) {
  var request = require('request').defaults({
    json: true,
    baseUrl: options.couchUrl,
    timeout: 10000 // 10 seconds
  })
  var requestDesignDoc = !options.username

  if (requestDesignDoc) {
    options = {
      url: '/_users/_design/byId/_view/byId?key=' + options.id + '&include_docs=true',
      headers: {
        cookie: 'AuthSession=' + options.bearerToken
      }
    }
  } else {
    options = {
      url: '/_users/org.couchdb.user:' + encodeURIComponent(options.username),
      headers: {
        cookie: 'AuthSession=' + options.bearerToken
      }
    }
  }

  request.get(options, function (error, response, body) {
    if (error) {
      return callback(Boom.wrap(error))
    }

    if (response.statusCode >= 400) {
      return callback(Boom.create(response.statusCode, body.reason))
    }

    if (requestDesignDoc) {
      if (body.rows.length === 0) {
        return callback(Boom.notFound())
      }
      callback(null, body.rows[0].doc)
      return
    }

    callback(null, body)
  })
}
