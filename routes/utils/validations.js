var Joi = require('joi')

var validations = module.exports = {}

validations.sessionIdHeader = Joi.object({
  authorization: Joi.string().required().regex(/^Session [a-zA-Z0-9_\-]+$/)
}).unknown().required().meta({
  statusCode: 401,
  message: 'Authorization header missing'
})

validations.sessionIdHeaderForbidden = Joi.object({
  authorization: Joi.forbidden()
}).unknown().required().meta({
  statusCode: 403,
  message: 'Authorization header not allowed'
})
validations.sessionQuery = Joi.object({
  include: Joi.any().only(['account', 'account.profile'])
}).unknown().meta({
  statusCode: 400,
  message: 'Allowed values for ?include are \'account\', \'account.profile\''
})

validations.accountQuery = Joi.object({
  include: Joi.any().only(['profile'])
}).unknown().meta({
  statusCode: 400,
  message: 'Allowed value for ?include is \'profile\''
})

validations.profileQuery = Joi.object({
  include: Joi.forbidden()
}).unknown().meta({
  statusCode: 400,
  message: '?include not allowed'
})

validations.requestQuery = Joi.object({
  include: Joi.forbidden()
}).unknown().meta({
  statusCode: 400,
  message: '?include not allowed'
})

validations.accountPayload = Joi.object({
  data: Joi.object({
    type: Joi.any().required().only(['account'])
  }).unknown()
}).unknown().required().meta({
  statusCode: 409,
  message: 'data.type must be \'account\''
})

validations.sessionPayload = Joi.object({
  data: Joi.object({
    type: Joi.any().required().only(['session'])
  }).unknown()
}).unknown().required().meta({
  statusCode: 409,
  message: 'data.type must be \'session\''
})

validations.requestPayload = Joi.object({
  data: Joi.object({
    type: Joi.any().required().only(['request']),
    attributes: Joi.object({
      type: Joi.any().required().only(['passwordreset']),
      username: Joi.string().required().email()
    })
  })
}).unknown().required().meta({
  statusCode: 409,
  message: 'data.type must be \'request\''
})

validations.profilePayload = Joi.object({
  data: Joi.object({
    type: Joi.any().required().only(['profile'])
  }).unknown()
}).unknown().required().meta({
  statusCode: 409,
  message: 'data.type must be \'profile\''
})
