module.exports = createAccount

var Boom = require('boom')
var randomstring = require('randomstring')

function createAccount (state, options, callback) {
  var request = require('request').defaults({
    json: true,
    baseUrl: state.url,
    timeout: 10000 // 10 seconds
  })

  var accountKey = 'org.couchdb.user:' + encodeURIComponent(options.username)
  var accountId = randomstring.generate({
    length: 12,
    charset: 'hex'
  })

  var requestOptions = {
    url: '/_users/' + accountKey,
    body: {
      type: 'user',
      roles: [
        'id:' + accountId
      ],
      name: options.username,
      password: options.password
    }
  }

  if (state.admin) {
    requestOptions.auth = {
      user: state.admin.username,
      pass: state.admin.password
    }
  }
  request.put(requestOptions, function (error, response, body) {
    if (error) {
      return callback(Boom.wrap(error))
    }

    if (response.statusCode >= 400) {
      return callback(Boom.create(response.statusCode, body.reason))
    }

    var account = {
      id: accountId,
      username: options.username
    }

    callback(null, account)
  })
}
