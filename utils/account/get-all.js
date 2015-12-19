module.exports = getAllAccounts

var Boom = require('boom')

function getAllAccounts (options, callback) {
  // request.get({
  //   url: '/_users/_all_docs?include_docs=true&startkey=%22org.couchdb.user%3A%22&enkey=%22org.couchdb.user%3A%E9%A6%99%22',
  //   headers: {
  //     cookie: 'AuthSession=' + options.bearerToken
  //   }
  options.db.allDocs({
    include_docs: true,
    startkey: 'org.couchdb.user:',
    // https://wiki.apache.org/couchdb/View_collation#String_Ranges
    endkey: 'org.couchdb.user:\ufff0'
  })
  .then(function (response) {
    callback(null, response)
  })
  .catch(function(error) {
    if (error) {
      return callback(Boom.wrap(fixErrorMessage(error)))
    }

    // if (response.statusCode >= 400) {
    //   return callback(Boom.create(response.statusCode, fixErrorMessage(body.reason)))
    // }
  })
}

function fixErrorMessage (message) {
  if (message === 'Only admins can access _all_docs of system databases.') {
    return 'Only admins can access /users'
  }

  return message
}
