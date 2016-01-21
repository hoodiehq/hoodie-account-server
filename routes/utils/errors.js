module.exports = {
  parse: parse
}

function hoodieError (options) {
  var error = new Error(options.message)
  error.name = options.name || error.name
  error.status = options.status

  return error
}

module.exports.INVALID_SESSION = hoodieError({
  name: 'Unauthorized',
  message: 'Session invalid',
  status: 401
})

module.exports.FORBIDDEN_ADMIN_ACCOUNT = hoodieError({
  name: 'Forbidden',
  message: 'Admins have no account',
  status: 403
})

function parse (error) {
  if (error.message === 'Name or password is incorrect.') {
    error.message = 'Invalid password'
  }

  if (error.message === 'Only admins can access _all_docs of system databases.') {
    error.message = 'Only admins can access /users'
  }

  if (error.message === 'Forbidden by design doc validate_doc_update function') {
    error.message = 'Only admins can access /users'
  }

  return error
}
