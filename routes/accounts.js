module.exports = accountRoutes
module.exports.attributes = {
  name: 'account-routes-accounts'
}

var getApi = require('../api')
var joiFailAction = require('../utils/joi-fail-action')
var serialise = require('../utils/account/serialise')
var toBearerToken = require('../utils/to-bearer-token')
var validations = require('../utils/validations')

function accountRoutes (server, options, next) {
  var prefix = options.prefix || ''
  var api = getApi({
    db: options.db,
    secret: options.secret,
    admins: options.admins
  })
  var accounts = api.accounts

  var postAccountsRoute = {
    method: 'POST',
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
      var username = request.payload.data.attributes.username
      var password = request.payload.data.attributes.password
      var profile = request.payload.data.attributes.profile

      return accounts.add({
        username: username,
        password: password,
        profile: profile
      }, {
        bearerToken: sessionId,
        include: request.query.include
      })

      .then(function (account) {
        return serialise({
          baseUrl: server.info.uri + prefix,
          include: request.query.include,
          admin: true
        }, account)
      })

      .then(function (json) {
        reply(json).code(201)
      })

      .catch(reply)
    }
  }

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
        db: options.db,
        bearerToken: sessionId,
        include: request.query.include
      })

      .then(function (accounts) {
        return serialise({
          baseUrl: server.info.uri + prefix,
          include: request.query.include
        }, accounts)
      })

      .then(reply)

      .catch(reply)
    }
  }

  var getAccountRoute = {
    method: 'GET',
    path: prefix + '/accounts/{id}',
    config: {
      auth: false,
      validate: {
        headers: validations.bearerTokenHeader,
        failAction: joiFailAction
      }
    },
    handler: function (request, reply) {
      var sessionId = toBearerToken(request)

      return accounts.find(request.params.id, {
        bearerToken: sessionId,
        include: request.query.include
      })

      .then(function (account) {
        return serialise({
          baseUrl: server.info.uri + prefix,
          include: request.query.include,
          admin: true
        }, account)
      })

      .then(reply)

      .catch(reply)
    }
  }

  var patchAccountRoute = {
    method: 'PATCH',
    path: prefix + '/accounts/{id}',
    config: {
      auth: false,
      validate: {
        headers: validations.bearerTokenHeader,
        failAction: joiFailAction
      }
    },
    handler: function (request, reply) {
      var sessionId = toBearerToken(request)
      var username = request.payload.data.attributes.username
      var password = request.payload.data.attributes.password
      var profile = request.payload.data.attributes.profile

      return accounts.update(request.params.id, {
        username: username,
        password: password,
        profile: profile
      }, {
        bearerToken: sessionId,
        include: request.query.include
      })

      .then(function (account) {
        return serialise({
          baseUrl: server.info.uri + prefix,
          include: request.query.include,
          admin: true
        }, account)
      })

      .then(function (json) {
        reply(json).code(201)
      })

      .catch(reply)
    }
  }

  var deleteAccountRoute = {
    method: 'DELETE',
    path: prefix + '/accounts/{id}',
    config: {
      auth: false,
      validate: {
        headers: validations.bearerTokenHeader,
        failAction: joiFailAction
      }
    },
    handler: function (request, reply) {
      var sessionId = toBearerToken(request)

      return accounts.remove(request.params.id, {
        bearerToken: sessionId
      })

      .then(function (/* json */) {
        reply().code(204)
      })

      .catch(reply)
    }
  }

  server.route([
    postAccountsRoute,
    getAccountsRoute,
    getAccountRoute,
    patchAccountRoute,
    deleteAccountRoute
  ])

  next()
}
