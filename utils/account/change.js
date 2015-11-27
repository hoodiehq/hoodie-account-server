module.exports = changeAccount

var Boom = require('boom')
var merge = require('lodash.merge')

function changeAccount (options, callback) {
  var change = options.change
  var request = require('request').defaults({
    json: true,
    baseUrl: options.couchUrl,
    timeout: 10000 // 10 seconds
  })
  var requestDesignDoc = !options.username

  var getOptions
  if (requestDesignDoc) {
    getOptions = {
      url: '/_users/_design/byId/_view/byId?key=' + options.id + '&include_docs=true',
      headers: {
        cookie: 'AuthSession=' + options.bearerToken
      }
    }
  } else {
    getOptions = {
      url: '/_users/org.couchdb.user:' + encodeURIComponent(options.username),
      headers: {
        cookie: 'AuthSession=' + options.bearerToken
      }
    }
  }

  request.get(getOptions, function (error, response, body) {
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
      body = body.rows[0].doc
    }

    delete change._id
    delete change.type
    delete change.name
    delete change.iterations
    delete change.password_scheme
    delete change.salt
    delete change.derived_key
    delete change._rev

    if (change.username) {
      request.del({
        url: '/_users/org.couchdb.user:' + encodeURIComponent(body.name) + '?rev=' + body._rev,
        headers: {
          cookie: 'AuthSession=' + options.bearerToken
        }
      }, function (error) {
        if (error) {
          // TODO make this all a sequence, delete before create new doc
          throw error
        }
      })

      body._id = 'org.couchdb.user:' + change.username
      body.name = change.username
      delete body._rev
    }

    merge(body, change)

    request.put({
      url: '/_users/org.couchdb.user:' + encodeURIComponent(body.name),
      headers: {
        cookie: 'AuthSession=' + options.bearerToken
      },
      body: body
    }, function (error, putResponse, putResponseBody) {
      if (error) {
        return callback(Boom.wrap(error))
      }

      if (putResponse.statusCode >= 400) {
        return callback(Boom.create(putResponse.statusCode, putResponseBody.reason))
      }

      callback(null, body)
    })
  })
}
