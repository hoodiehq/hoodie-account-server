[back to hapi-couchdb-account](..)

# CouchDB Account API

After registering the hapi plugin, the account API becomes available at
`server.plugins.account.api`. It can also be directly required using

```js
var api = require ('hapi-couchdb-account-api/api')({
  url: couchdbUrl
})
```

All methods return promises

```js
api.sessions.add({username: 'pat', password: 'secret'/*, [jsonApiOptions] */})
api.sessions.find(id /*, jsonApiOptions */)
api.sessions.remove(id /*, jsonApiOptions */)

api.accounts.add({username: 'pat', password: 'secret'/*, [jsonApiOptions] */})
api.accounts.find(id /*, jsonApiOptions */)
api.accounts.findAll(/* jsonApiOptions */)
api.accounts.update(id, {password: 'newsecret'} /*, jsonApiOptions */)
api.accounts.remove(id /*, jsonApiOptions */)

api.profiles.find(id /*, jsonApiOptions */)
api.profiles.update(id, {fullname: 'Pat Hook'})

api.requests.add({type: 'passwordreset', contact: 'pat@example.com'/*, [jsonApiOptions] */})
api.requests.find(id /*, jsonApiOptions */)
api.requests.findAll(/* jsonApiOptions */)
api.requests.remove(id /*, update, jsonApiOptions*/)
```
