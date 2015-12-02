[back to hoodie-server-account](../README.md)

# CouchDB Account API

After registering the hapi plugin, the account API becomes available at
`server.plugins.account.api`. It can also be directly required using

```js
var api = require ('hoodie-server-account/api')({
  url: couchdbUrl
})
```

All methods return promises

```js
api.sessions.add({username: 'pat', password: 'secret'/*, [jsonApiOptions] */})
api.sessions.find(sessionId /*, jsonApiOptions */)
api.sessions.remove(sessionId /*, jsonApiOptions */)

api.accounts.add({username: 'pat', password: 'secret'/*, [jsonApiOptions] */})
api.accounts.find(accountId /*, jsonApiOptions */)
api.accounts.findAll(/* jsonApiOptions */)
api.accounts.update(accountId, {password: 'newsecret'} /*, jsonApiOptions */)
api.accounts.remove(accountId /*, jsonApiOptions */)

api.profiles.find(profileId /*, jsonApiOptions */)
api.profiles.update(profileId, {fullname: 'Pat Hook'})

api.requests.add({type: 'passwordreset', contact: 'pat@example.com'/*, [jsonApiOptions] */})
api.requests.find(requestId /*, jsonApiOptions */)
api.requests.findAll(/* jsonApiOptions */)
api.requests.remove(requestId /*, update, jsonApiOptions*/)
```
