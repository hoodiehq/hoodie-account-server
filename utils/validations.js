var Joi = require('joi')

var validations = module.exports = {}

validations.bearerTokenHeader = Joi.object({
  authorization: Joi.string().required().regex(/^Bearer [a-z0-9\-]+$/).meta({
    statusCode: 403
  })
}).unknown().required()

validations.bearerTokenHeaderForbidden = Joi.object({
  authorization: Joi.forbidden().meta({
    statusCode: 403
  })
}).unknown().required()

validations.sessionQuery = Joi.object({
  include: Joi.any().only(['account', 'account.profile']).meta({
    statusCode: 403
  })
}).unknown()
