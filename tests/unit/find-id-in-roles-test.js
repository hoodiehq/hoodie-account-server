var test = require('tap').test

var findIdInRoles = require('../../api/utils/find-id-in-roles')

test('[]', function (t) {
  var id = findIdInRoles([])
  t.is(id, undefined, 'returns undefined')
  t.end()
})

test('["id:123"]', function (t) {
  var id = findIdInRoles(['id:123'])
  t.is(id, '123', 'returns "123" string')
  t.end()
})

test('["foobar", "id:abc456"]', function (t) {
  var id = findIdInRoles(['foobar', 'id:abc456'])
  t.is(id, 'abc456', 'returns "abc456" string')
  t.end()
})
