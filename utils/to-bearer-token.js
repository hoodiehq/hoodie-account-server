module.exports = toBearerToken

function toBearerToken (request) {
  if (!request.headers.authorization) {
    return ''
  }
  return request.headers.authorization.substr(7)
}
