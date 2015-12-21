module.exports = findUser

function findUser (db, idOrObject) {
  var id = idOrObject
  var username

  if (typeof idOrObject === 'object') {
    id = idOrObject.id
    username = idOrObject.username
  }

  if (username) {
    return db.get('org.couchdb.user:' + username)
  }

  return db.query('byId', {
    key: id,
    include_docs: true
  }).then(function (response) {
    if (response.rows.length === 0) {
      throw db.constructor.Errors.MISSING_DOC
    }

    return response.rows[0].doc
  })
}
