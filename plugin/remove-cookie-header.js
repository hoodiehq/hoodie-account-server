module.exports = removeCookieHeader
removeCookieHeader.attributes = {
  name: 'removeCookie'
}

function removeCookieHeader (server, options, next) {
  server.ext({
    type: 'onRequest',
    method: function (request, reply) {
      delete request.headers['cookie']
      return reply.continue()
    }
  })
  next()
}
