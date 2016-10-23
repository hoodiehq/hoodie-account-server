var test = require('tap').test

var failAction = require('../../routes/utils/joi-fail-action')

test('fail action', function (t) {
  var source = 0
  var error = { message: 'bad request' }
  var request = { route: { settings: { validate: [] } } }
  request.route.settings.validate[source] = { describe: function () {
    return { meta: undefined }
  } }

  function test (e) {
    t.is(e.message, error.message, 'return status code 400')
    t.end()
  }

  failAction(request, test, source, error)
})
