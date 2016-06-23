module.exports = toSessionId

function toSessionId (request) {
  if (!request.headers.authorization) {
    return ''
  }

  return request.headers.authorization.substr(8)
}
