module.exports = failAction

var _ = require('lodash')
var Boom = require('boom')

/**
 * Turns JOI route validations into corresponding Boom errors using
 * Joi’s .meta method
 *
 * Example
 *
 *    validate: {
 *      headers: Joi.object({
 *        authorization: Joi.string().required()
 *      }).unknown().required().meta({
 *        statusCode: 403})
 *      })
 *    }
 *
 * A request without an "authorization" header now gets rejected with status 403
 * and the according error message coming from Joi
 */
function failAction (request, reply, source, error) {
  var meta = request.route.settings.validate[source].describe().meta
  var statusCode = _.get(meta, '[0].statusCode') || 400
  var message = _.get(meta, '[0].message') || error.message

  reply(Boom.create(statusCode, message, error.data))
}
