module.exports = requestRoutes
module.exports.attributes = {
  name: 'account-routes-requests'
}

var Boom = require('boom')
var nodemailer = require('nodemailer')
var randomstring = require('randomstring')

var errors = require('./utils/errors')
var joiFailAction = require('./utils/joi-fail-action')
var validations = require('./utils/validations')

function requestRoutes (server, options, next) {
  var api = server.plugins.account.api

  var postRequestsRoute = {
    method: 'POST',
    path: '/requests',
    config: {
      auth: false,
      validate: {
        payload: validations.requestPayload,
        query: validations.requestQuery,
        failAction: joiFailAction
      }
    },
    handler: function (request, reply) {
      if (!options.notifications.transport) {
        reply(Boom.create(503, 'Config missing: account.notifications.transport'))
        return
      }

      var username = request.payload.data.attributes.username
      var newPassword = randomstring.generate({
        length: 12,
        charset: 'hex'
      })
      var requestId = randomstring.generate({
        length: 12,
        charset: 'hex'
      })

      api.accounts.update({username: username}, {password: newPassword})

      .then(function (account) {
        var transportConfig = options.notifications.transport
        var transporter = nodemailer.createTransport(transportConfig)

        return transporter.sendMail({
          from: options.notifications.from,
          to: account.username,
          subject: 'Password reset',
          text: `Hello there,

you can now sign in with
username: ${account.username}
password: ${newPassword}`
        })

        .then(function (result) {
          return {
            data: {
              type: 'request',
              id: requestId,
              attributes: {
                username: username,
                messageId: result.messageId,
                createdAt: new Date().toISOString()
              }
            }
          }
        })
      })

      .then(function (json) {
        reply(json).code(201)
      })

      .catch(function (error) {
        error = errors.parse(error)
        reply(Boom.create(error.status || 400, error.message))
      })
    }
  }

  server.route([
    postRequestsRoute
  ])

  next()
}
