module.exports = toBearerToken

function toBearerToken (request) {
  return request.headers.authorization.substr(7)
}
