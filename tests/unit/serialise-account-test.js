var test = require('tap').test

var serialiseAccount = require('../../routes/utils/serialise-account')

test('serialiseMany : with string profile', function (t) {
  var options = { include: 'profile', baseUrl: 'test-baseUrl' }
  var data = { id: 'test-id', profile: false }
  var result = serialiseAccount(options, [data]).included[0]
  t.deepEqual(result.attributes, {}, 'returns empty object')
  t.end()
})
