module.exports = failAction

var Boom = require('boom')

/**
 * Turn JOI route validations into corresponding Boom errors using
 * Joi’s .meta method
 *
 * Example
 *
 *    validate: {
 *      headers: Joi.object({
 *        authorization: Joi.string().required().meta({ statusCode: 403 })
 *      }).unknown().required()
 *    }
 *
 * A request without an "authorization" header now gets rejected with status 403
 * and the according error message coming from Joi
 */
function failAction (request, reply, source, error) {
  var key = error.data.details[0].path
  var meta = request.route.settings.validate[source].describe().children[key].meta
  var statusCode = meta ? meta[0].statusCode : 400
  reply(Boom.create(statusCode, error.message, error.data))
}
