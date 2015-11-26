module.exports = accountRoutes
module.exports.attributes = {
  name: 'account-routes-accounts'
}

var getApi = require('../api')
var joiFailAction = require('../utils/joi-fail-action')
var serialiseAccount = require('../utils/account/serialise')
var toBearerToken = require('../utils/to-bearer-token')
var validations = require('../utils/validations')

function accountRoutes (server, options, next) {
  var couchUrl = options.couchdb.url
  var prefix = options.prefix || ''
  var api = getApi({ url: couchUrl })
  var accounts = api.accounts
  var serialise = serialiseAccount.bind(null, {
    baseUrl: server.info.uri + prefix
  })

  var getAccountsRoute = {
    method: 'GET',
    path: prefix + '/accounts',
    config: {
      auth: false,
      validate: {
        headers: validations.bearerTokenHeader,
        failAction: joiFailAction
      }
    },
    handler: function (request, reply) {
      var sessionId = toBearerToken(request)

      return accounts.findAll({
        bearerToken: sessionId,
        include: request.query.include
      })

      .then(function (accounts) {
        return accounts.map(serialise)
      })

      .then(reply)

      .catch(reply)
    }
  }

  server.route([
    getAccountsRoute
  ])

  next()
}
