var test = require('tap').test

var errors = require('../../routes/utils/errors')

var parse = errors.parse
var hoodieError = errors.hoodieError
var accountIdConflict = errors.accountIdConflict

test('Error parse: Only admins can access _all_docs of system databases.', function (t) {
  var error = { message: 'Only admins can access _all_docs of system databases.' }

  t.is(parse(error).message, 'Only admins can access /users', 'returns valid error string')
  t.end()
})

test('Error parse: Forbidden by design doc validate_doc_update function', function (t) {
  var error = { message: 'Forbidden by design doc validate_doc_update function' }

  t.is(parse(error).message, 'Only admins can access /users', 'returns valid error string')
  t.end()
})

test('hoodie error handler', function (t) {
  var invalidOptions = { message: 'slash' }
  var validOptions = { name: 'axl', message: 'axl' }

  t.is(hoodieError(invalidOptions).message, 'slash', 'returns valid error name with invalidOptions')
  t.is(hoodieError(validOptions).message, 'axl', 'returns valid error message with validOptions')

  t.end()
})

test('account ID conflict', function (t) {
  t.is(accountIdConflict('duff').message, 'data.id must be \'duff\'', 'return conflict error message')

  t.end()
})
