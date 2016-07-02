[back to hoodie-account-server](../README.md)

# hoodie-account-server/api

`@hoodie/account-server/api` is a JavaScript API for all things account
using a PouchDB instance for persistence.

After registering the `@hoodie/account-server` hapi plugin, the account API
becomes available at `server.plugins.account.api`. It can also be directly
required using

```js
var api = require ('@hoodie/account-server/api')(options)
```

## Example

```js
var AccountApi = require('@hoodie/account-server/api')
var PouchDB = require('pouchdb')

PouchDB.plugin(require('pouchdb-users'))

var db = new PouchDB('http://localhost:5984/_users')

db.installUsersBehavior().then(function () {
  var api = new AccountApi({
    db: db,
    secret: 'secret123'
  })

  api.accounts.findAll().then(logAccountStats)
  api.accounts.on('change', logAccountChange)
})
```

## API

`@hoodie/account-server/api` is a subset of [hoodie-account-client/admin](https://github.com/hoodiehq/hoodie-account-client/tree/master/admin).
If you see any inconsistencies, please [create an issue](https://github.com/hoodiehq/hoodie-account-server/issues/new?title=API+inconsistency)

- [Constructor](#constructor)
- [api.sessions.add()](#apisessionsadd)
- [api.sessions.find()](#apisessionsfind)
- [api.sessions.findAll()](#apisessionsfindall)
- [api.sessions.remove()](#apisessionsremove)
- [api.sessions.removeAll()](#apisessionsremoveall)
- [api.accounts.add()](#apiaccountsadd)
- [api.accounts.find()](#apiaccountsfind)
- [api.accounts.findAll()](#apiaccountsfindall)
- [api.accounts.update()](#apiaccountsupdate)
- [api.accounts.updateAll()](#apiaccountsupdateall)
- [api.accounts.remove()](#apiaccountsremove)
- [api.accounts.removeAll()](#apiaccountsremoveall)
- [api.requests.add()](#apirequestsadd)
- [api.requests.find()](#apirequestsfind)
- [api.requests.findAll()](#apirequestsfindall)
- [api.requests.remove()](#apirequestsremove)
- [api.requests.removeAll()](#apirequestsremoveall)
- [api.account()](#apiaccount)
- [api.account().profile.find()](#apiaccountprofilefind)
- [api.account().profile.update()](#apiaccountprofileupdate)
- [api.account().tokens.add()](#apiaccounttokensadd)
- [api.account().tokens.find()](#apiaccounttokensfind)
- [api.account().tokens.findAll()](#apiaccounttokensfindall)
- [api.account().tokens.remove()](#apiaccounttokensremove)
- [api.account().roles.add()](#apiaccountrolesadd)
- [api.account().roles.findAll()](#apiaccountrolesfindall)
- [api.account().roles.remove()](#apiaccountrolesremove)
- [Events](#events)

### Constructor

```js
new AccountApi(options)
```

<table>
  <thead>
    <tr>
      <th>Argument</th>
      <th>Type</th>
      <th>Description</th>
      <th>Required</th>
    </tr>
  </thead>
  <tr>
    <th align="left"><code>options.db</code></th>
    <td>Object</td>
    <td>
      PouchDB instance with
      <a href="https://github.com/hoodiehq/pouchdb-users">pouchdb-users</a>
      plugin
    </td>
    <td>Yes</td>
  </tr>
  <tr>
    <th align="left"><code>options.secret</code></th>
    <td>String</td>
    <td>
      Server secret, like CouchDB’s <code>couch_httpd_auth.secret</code>
    </td>
    <td>Yes</td>
  </tr>
</table>

Returns an `api` instance.

Examples

```js
var PouchDB = require('pouchdb')
PouchDB.plugin(require('pouchdb-users'))
var db = new PouchDB('http://localhost:5984/_users')
db.useAsAuthenticationDB().then(function () {
  var api = new AccountApi({
    db: db,
    secret: 'secret123',
    admins: {
      kim: '-pbkdf2-e079757b4cb58ae17467c8befe725778ce97e422,0aef36ccafa33f3e81ae897baf23f85c,10'
    }
  })
})
```

### api.sessions.add()

Admins can create a session for any user.

```js
admin.sessions.add(options)
```

<table>
  <thead>
    <tr>
      <th>Argument</th>
      <th>Type</th>
      <th>Description</th>
      <th>Required</th>
    </tr>
  </thead>
  <tr>
    <th align="left"><code>options.username</code></th>
    <td>String</td>
    <td>-</td>
    <td>Yes</td>
  </tr>
  <tr>
    <th align="left"><code>options.auth</code></th>
    <td>Object</td>
    <td>Object with property <code>password</code>, a String that will be validated in the user document. If not included, admin access is assumed (no authentication)</td>
    <td>No</td>
  </tr>
</table>

Resolves with `sessionProperties`

```js
{
  id: 'session123',
  // account is always included
  account: {
    id: 'account456',
    username: 'pat@example.com'
  }
}
```

Rejects with:

<table>
  <tr>
    <th align="left"><code>UnauthenticatedError</code></th>
    <td>Session is invalid</td>
  </tr>
  <tr>
    <th align="left"><code>UnconfirmedError</code></th>
    <td>Account has not been confirmed yet</td>
  </tr>
  <tr>
    <th align="left"><code>NotFoundError</code></th>
    <td>Account could not be found</td>
  </tr>
  <tr>
    <th align="left"><code>Error</code></th>
    <td><em>A custom error set on the account object, e.g. the account could be blocked due to missing payments</em></td>
  </tr>
  <tr>
    <th align="left"><code>ConnectionError</code></th>
    <td>Could not connect to server</td>
  </tr>
</table>

Example

```js
admin.sessions.add({
  username: 'pat'
}).then(function (sessionProperties) {
  var sessionId = sessionProperties.id
  var username = sessionProperties.account.username
}).catch(function (error) {
  console.error(error)
})
```

### api.sessions.find()

```js
admin.sessions.find(sessionId)
```

<table>
  <thead>
    <tr>
      <th>Argument</th>
      <th>Type</th>
      <th>Description</th>
      <th>Required</th>
    </tr>
  </thead>
  <tr>
    <th align="left"><code>sessionId</code></th>
    <td>String</td>
    <td>-</td>
    <td>Yes</td>
  </tr>
</table>

Resolves with `sessionProperties`

```js
{
  id: 'session123',
  // account is always included
  account: {
    id: 'account456',
    username: 'pat@example.com'
    // admin accounts have no profile
  }
}
```

Rejects with:

<table>
  <tr>
    <th align="left"><code>UnauthenticatedError</code></th>
    <td>Session is invalid</td>
  </tr>
  <tr>
    <th align="left"><code>NotFoundError</code></th>
    <td>Session could not be found</td>
  </tr>
  <tr>
    <th align="left"><code>ConnectionError</code></th>
    <td>Could not connect to server</td>
  </tr>
</table>

Example

```js
admin.sessions.find('abc4567').then(function (sessionProperties) {
  console.log('Session is valid.')
}).catch(function (error) {
  if (error.name === 'NotFoundError') {
    console.log('Session is invalid')
    return
  }

  console.error(error)
})
```


### api.sessions.findAll()

---

🐕 **TO BE DONE**: [#27](https://github.com/hoodiehq/hoodie-account-server/issues/27)

---

```js
admin.sessions.findAll(options)
```

<table>
  <thead>
    <tr>
      <th>Argument</th>
      <th>Type</th>
      <th>Description</th>
      <th>Required</th>
    </tr>
  </thead>
  <tr>
    <th align="left"><code>options.include</code></th>
    <td>String</td>
    <td>
      If set to <code>"account.profile"</code>, the <code>profile: {...}</code>
      property will be added to the response.
    </td>
    <td>No</td>
  </tr>
  <tr>
    <th align="left"><code>options.sort</code></th>
    <td>String or String[]</td>
    <td>
      string of comma-separated list of attributes to sort by, or array of strings, see
      <a href="http://jsonapi.org/format/#fetching-sorting">JSON API: Sorting</a>
    </td>
    <td>No</td>
  </tr>
  <tr>
    <th align="left"><code>options.fields</code></th>
    <td>Object</td>
    <td>
      Map of fields to include in response by type, see
      <a href="http://jsonapi.org/format/#fetching-sparse-fieldsets">JSON API: Sparse Fieldset</a>
    </td>
    <td>No</td>
  </tr>
  <tr>
    <th align="left"><code>options.page.offset</code></th>
    <td>Number</td>
    <td>
      see <a href="http://jsonapi.org/format/#fetching-pagination">JSON API: Pagination</a>
    </td>
    <td>No</td>
  </tr>
  <tr>
    <th align="left"><code>options.page.limit</code></th>
    <td>Number</td>
    <td>
      see <a href="http://jsonapi.org/format/#fetching-pagination">JSON API: Pagination</a>
    </td>
    <td>No</td>
  </tr>
</table>

Resolves with Array of `sessionProperties`

```js
[{
  id: 'session123',
  account: {
    id: 'account456',
    username: 'pat@example.com'
  }
}, {
  id: 'session456',
  account: {
    id: 'account789',
    username: 'sam@example.com'
  }
}]
```

Rejects with:

<table>
  <tr>
    <th align="left"><code>UnauthenticatedError</code></th>
    <td>Session is invalid</td>
  </tr>
  <tr>
    <th align="left"><code>ConnectionError</code></th>
    <td>Could not connect to server</td>
  </tr>
</table>

Example

```js
admin.sessions.findAll()
  .then(function (sessions) {})
  .catch(function (error) {
    console.error(error)
  })
```

### api.sessions.remove()

```js
admin.sessions.remove(sessionId)
```

<table>
  <thead>
    <tr>
      <th>Argument</th>
      <th>Type</th>
      <th>Description</th>
      <th>Required</th>
    </tr>
  </thead>
  <tr>
    <th align="left"><code>sessionId</code></th>
    <td>String</td>
    <td>-</td>
    <td>Yes</td>
  </tr>
</table>

Resolves with `sessionProperties`

```js
{
  id: 'session123',
  account: {
    id: 'account456',
    username: 'pat@example.com'
  }
}
```

Rejects with:

<table>
  <tr>
    <th align="left"><code>UnauthenticatedError</code></th>
    <td>Session is invalid</td>
  </tr>
  <tr>
    <th align="left"><code>NotFoundError</code></th>
    <td>Session could not be found</td>
  </tr>
  <tr>
    <th align="left"><code>ConnectionError</code></th>
    <td>Could not connect to server</td>
  </tr>
</table>

Example

```js
admin.sessions.remove('abc4567')
  .then(function (sessionProperties) {})
  .catch(function (error) {
    console.error(error)
  })
```

---

**NOTE**: [#27](https://github.com/hoodiehq/hoodie-account-server/issues/27)
Deleting a Session does not really have an effect today, as no session state
is kept, and sessions are hash based

---

### api.sessions.removeAll()

---

🐕 **TO BE DONE**: [#27](https://github.com/hoodiehq/hoodie-account-server/issues/27)

---

```js
admin.sessions.removeAll(options)
```

<table>
  <thead>
    <tr>
      <th>Argument</th>
      <th>Type</th>
      <th>Description</th>
      <th>Required</th>
    </tr>
  </thead>
  <tr>
    <th align="left"><code>options.sort</code></th>
    <td>String or String[]</td>
    <td>
      string of comma-separated list of attributes to sort by, or array of strings, see
      <a href="http://jsonapi.org/format/#fetching-sorting">JSON API: Sorting</a>
    </td>
    <td>No</td>
  </tr>
  <tr>
    <th align="left"><code>options.fields</code></th>
    <td>Object</td>
    <td>
      Map of fields to include in response by type, see
      <a href="http://jsonapi.org/format/#fetching-sparse-fieldsets">JSON API: Sparse Fieldset</a>
    </td>
    <td>No</td>
  </tr>
  <tr>
    <th align="left"><code>options.page.offset</code></th>
    <td>Number</td>
    <td>
      see <a href="http://jsonapi.org/format/#fetching-pagination">JSON API: Pagination</a>
    </td>
    <td>No</td>
  </tr>
  <tr>
    <th align="left"><code>options.page.limit</code></th>
    <td>Number</td>
    <td>
      see <a href="http://jsonapi.org/format/#fetching-pagination">JSON API: Pagination</a>
    </td>
    <td>No</td>
  </tr>
</table>

Resolves with Array of `sessionProperties`

```js
[{
  id: 'session123',
  account: {
    id: 'account456',
    username: 'pat@example.com'
  }
}, {
  id: 'session456',
  account: {
    id: 'account789',
    username: 'sam@example.com'
  }
}]
```

Rejects with:

<table>
  <tr>
    <th align="left"><code>UnauthenticatedError</code></th>
    <td>Session is invalid</td>
  </tr>
  <tr>
    <th align="left"><code>ConnectionError</code></th>
    <td>Could not connect to server</td>
  </tr>
</table>

Example

```js
admin.sessions.removeAll()
  .then(function (sessions) {})
  .catch(function (error) {
    if (error.name === 'NotFoundError') {
      console.log('Session is invalid')
      return
    }

    console.error(error)
  })
```

### api.accounts.add()

```js
admin.accounts.add(object)
```

<table>
  <thead>
    <tr>
      <th>Argument</th>
      <th>Type</th>
      <th>Required</th>
    </tr>
  </thead>
  <tr>
    <th align="left"><code>accountProperties.username</code></th>
    <td>String</td>
    <td>Yes</td>
  </tr>
  <tr>
    <th align="left"><code>accountProperties.password</code></th>
    <td>String</td>
    <td>Yes</td>
  </tr>
</table>

Resolves with `accountProperties`:

```json
{
  "id": "account123",
  "username": "pat",
  "createdAt": "2016-01-01T00:00.000Z",
  "updatedAt": "2016-01-01T00:00.000Z",
  "profile": {
    "fullname": "Dr. Pat Hook"
  }
}
```

Rejects with:

<table>
  <tr>
    <th align="left"><code>UnauthenticatedError</code></th>
    <td>Session is invalid</td>
  </tr>
  <tr>
    <th align="left"><code>InvalidError</code></th>
    <td>Username must be set</td>
  </tr>
  <tr>
    <th align="left"><code>ConflictError</code></th>
    <td>Username <strong>&lt;username&gt;</strong> already exists</td>
  </tr>
  <tr>
    <th align="left"><code>ConnectionError</code></th>
    <td>Could not connect to server</td>
  </tr>
</table>

Example

```js
admin.accounts.add({
  username: 'pat',
  password: 'secret',
  profile: {
    fullname: 'Dr Pat Hook'
  }
})
  .then(function (accountProperties) {})
  .catch(function (error) {
    console.error(error)
  })
```

### api.accounts.find()

An account can be looked up by account.id, username or token.

- If a `username` property is present, it will be looked up by username
- If an `id` property is present, it will be looked up by accountId
- If an `token` property is present, it will be looked up by token

```js
admin.accounts.find(idOrObject, options)
```

<table>
  <thead>
    <tr>
      <th>Argument</th>
      <th>Type</th>
      <th>Description</th>
      <th>Required</th>
    </tr>
  </thead>
  <tr>
    <th align="left"><code>idOrObject</code></th>
    <td>String</td>
    <td>account ID. Same as <code>{id: accountId}</code></td>
    <td>No</td>
  </tr>
  <tr>
    <th align="left"><code>idOrObject.id</code></th>
    <td>String</td>
    <td>account ID. Same as passing <code>accountId</code> as string</td>
    <td>No</td>
  </tr>
  <tr>
    <th align="left"><code>idOrObject.username</code></th>
    <td>String</td>
    <td>Lookup account by username</td>
    <td>No</td>
  </tr>
  <tr>
    <th align="left"><code>idOrObject.token</code></th>
    <td>String</td>
    <td>Lookup account by one-time token</td>
    <td>No</td>
  </tr>
  <tr>
    <th align="left"><code>options.include</code></th>
    <td>String</td>
    <td>
      If set to <code>"profile"</code>, the <code>profile: {...}</code>
      property will be added to the response
    </td>
    <td>No</td>
  </tr>
</table>

Resolves with `accountProperties`:

```js
{
  "id": "account123",
  "username": "pat",
  "createdAt": "2016-01-01T00:00.000Z",
  "updatedAt": "2016-01-01T00:00.000Z",
  // if options.include === 'profile'
  "profile": {
    "fullname": "Dr. Pat Hook"
  }
}
```

Rejects with:

<table>
  <tr>
    <th align="left"><code>UnauthenticatedError</code></th>
    <td>Session is invalid</td>
  </tr>
  <tr>
    <th align="left"><code>NotFoundError</code></th>
    <td>Account not found</td>
  </tr>
  <tr>
    <th align="left"><code>ConnectionError</code></th>
    <td>Could not connect to server</td>
  </tr>
</table>

Example

```js
admin.accounts.find({ username: 'pat' })
  .then(function (accountProperties) {})
  .catch(function (error) {
    console.error(error)
  })
```

### api.accounts.findAll()

```js
admin.accounts.findAll(options)
```

<table>
  <thead>
    <tr>
      <th>Argument</th>
      <th>Type</th>
      <th>Description</th>
      <th>Required</th>
    </tr>
  </thead>
  <tr>
    <th align="left"><code>options.include</code></th>
    <td>String</td>
    <td>
      If set to <code>"profile"</code>, the <code>profile: {...}</code>
      property will be added to the response.
    </td>
    <td>No</td>
  </tr>
  <tr>
    <th align="left"><code>options.sort</code></th>
    <td>String or String[]</td>
    <td>
      string of comma-separated list of attributes to sort by, or array of strings, see
      <a href="http://jsonapi.org/format/#fetching-sorting">JSON API: Sorting</a>
    </td>
    <td>No</td>
  </tr>
  <tr>
    <th align="left"><code>options.fields</code></th>
    <td>Object</td>
    <td>
      Map of fields to include in response by type, see
      <a href="http://jsonapi.org/format/#fetching-sparse-fieldsets">JSON API: Sparse Fieldset</a>
    </td>
    <td>No</td>
  </tr>
  <tr>
    <th align="left"><code>options.page.offset</code></th>
    <td>Number</td>
    <td>
      see <a href="http://jsonapi.org/format/#fetching-pagination">JSON API: Pagination</a>
    </td>
    <td>No</td>
  </tr>
  <tr>
    <th align="left"><code>options.page.limit</code></th>
    <td>Number</td>
    <td>
      see <a href="http://jsonapi.org/format/#fetching-pagination">JSON API: Pagination</a>
    </td>
    <td>No</td>
  </tr>
</table>

Resolves with Array of `accountProperties`

```js
[{
  "id": "account123",
  "username": "pat",
  "createdAt": "2016-01-01T00:00.000Z",
  "updatedAt": "2016-01-01T00:00.000Z",
  // if options.include === 'profile'
  "profile": {
    "fullname": "Dr. Pat Hook"
  }
}, {
  "id": "account456",
  "username": "sam",
  "createdAt": "2016-01-01T00:00.000Z",
  "updatedAt": "2016-01-01T00:00.000Z",
  // if options.include === 'profile'
  "profile": {
    "fullname": "Lady Samident"
  }
}]
```

Rejects with:

<table>
  <tr>
    <th align="left"><code>UnauthenticatedError</code></th>
    <td>Session is invalid</td>
  </tr>
  <tr>
    <th align="left"><code>ConnectionError</code></th>
    <td>Could not connect to server</td>
  </tr>
</table>

Example

```js
admin.accounts.findAll()
  .then(function (accounts) {})
  .catch(function (error) {
    console.error(error)
  })
```

### api.accounts.update()

An account can be looked up by account.id, username or token.

- If a `username` property is present, it will be looked up by username
- If an `id` property is present, it will be looked up by accountId
- If an `token` property is present, it will be looked up by token

```js
admin.accounts.update(idOrObject, changedProperties, options)
// or
admin.accounts.update(accountProperties, options)
```

<table>
  <thead>
    <tr>
      <th>Argument</th>
      <th>Type</th>
      <th>Description</th>
      <th>Required</th>
    </tr>
  </thead>
  <tr>
    <th align="left"><code>idOrObject</code></th>
    <td>String</td>
    <td>account ID. Same as <code>{id: accountId}</code></td>
    <td>No</td>
  </tr>
  <tr>
    <th align="left"><code>idOrObject.id</code></th>
    <td>String</td>
    <td>account ID. Same as passing <code>accountId</code> as string</td>
    <td>No</td>
  </tr>
  <tr>
    <th align="left"><code>idOrObject.username</code></th>
    <td>String</td>
    <td>Lookup account by username</td>
    <td>No</td>
  </tr>
  <tr>
    <th align="left"><code>idOrObject.token</code></th>
    <td>String</td>
    <td>Lookup account by one-time token</td>
    <td>No</td>
  </tr>
  <tr>
    <th align="left"><code>changedProperties</code></th>
    <td>Object</td>
    <td>
      Object of properties & values that changed.
      Other properties remain unchanged.
    </td>
    <td>Yes</td>
  </tr>
  <tr>
    <th align="left"><code>accountProperties</code></th>
    <td>Object</td>
    <td>
      Must have an <code>id</code> or a <code>username</code> property.
      The user’s account will be updated with the passed properties. Existing
      properties not passed remain unchanged.
    </td>
    <td>Yes</td>
  </tr>
  <tr>
    <th align="left"><code>options.include</code></th>
    <td>String</td>
    <td>
      If set to <code>"profile"</code>, the <code>profile: {...}</code>
      property will be added to the response. Defaults to <code>"profile"</code>
      if <code>accountProperties.profile</code> or <code>changedProperties.profile</code>
      is set.
    </td>
    <td>No</td>
  </tr>
</table>

Resolves with `accountProperties`:

```js
{
  "id": "account123",
  "username": "pat",
  "createdAt": "2016-01-01T00:00.000Z",
  "updatedAt": "2016-01-01T00:00.000Z",
  // if options.include === 'profile'
  "profile": {
    "fullname": "Dr. Pat Hook"
  }
}
```

Rejects with:

<table>
  <tr>
    <th align="left"><code>UnauthenticatedError</code></th>
    <td>Session is invalid</td>
  </tr>
  <tr>
    <th align="left"><code>NotFoundError</code></th>
    <td>Account not found</td>
  </tr>
  <tr>
    <th align="left"><code>ConnectionError</code></th>
    <td>Could not connect to server</td>
  </tr>
</table>

Examples

```js
admin.accounts.update({ username: 'pat' }, { foo: 'bar' })
  .then(function (accountProperties) {})
  .catch(function (error) {
    console.error(error)
  })
// same as
admin.accounts.update({ username: 'pat', foo: 'bar' })
  .then(function (accountProperties) {})
  .catch(function (error) {
    console.error(error)
  })
```

### api.accounts.updateAll()

---

🐕 **TO BE DONE**: _create issue and link it here_

---

### api.accounts.remove()

An account can be looked up by account.id, username or token.

- If a `username` property is present, it will be looked up by username
- If an `id` property is present, it will be looked up by accountId
- If an `token` property is present, it will be looked up by token

```js
admin.accounts.remove(idOrObject, changedProperties, options)
// or
admin.accounts.remove(accountProperties, options)
```

<table>
  <thead>
    <tr>
      <th>Argument</th>
      <th>Type</th>
      <th>Description</th>
      <th>Required</th>
    </tr>
  </thead>
  <tr>
    <th align="left"><code>idOrObject</code></th>
    <td>String</td>
    <td>account ID. Same as <code>{id: accountId}</code></td>
    <td>No</td>
  </tr>
  <tr>
    <th align="left"><code>idOrObject.id</code></th>
    <td>String</td>
    <td>account ID. Same as passing <code>accountId</code> as string</td>
    <td>No</td>
  </tr>
  <tr>
    <th align="left"><code>idOrObject.username</code></th>
    <td>String</td>
    <td>Lookup account by username</td>
    <td>No</td>
  </tr>
  <tr>
    <th align="left"><code>idOrObject.token</code></th>
    <td>String</td>
    <td>Lookup account by one-time token</td>
    <td>No</td>
  </tr>
  <tr>
    <th align="left"><code>changedProperties</code></th>
    <td>Object</td>
    <td>
      Object of properties & values that changed.
      Other properties remain unchanged.
    </td>
    <td>Yes</td>
  </tr>
  <tr>
    <th align="left"><code>accountProperties</code></th>
    <td>Object</td>
    <td>
      Must have an <code>id</code> or a <code>username</code> property.
      The user’s account will be updated with the passed properties. Existing
      properties not passed remain unchanged. Note that
      <code>accountProperties.token</code> is not allowed, as it’s not a valid
      account property, but an option to look up an account. An account can
      have multiple tokens at once.
    </td>
    <td>Yes</td>
  </tr>
  <tr>
    <th align="left"><code>options.include</code></th>
    <td>String</td>
    <td>
      If set to <code>"profile"</code>, the <code>profile: {...}</code>
      property will be added to the response. Defaults to <code>"profile"</code>
      if <code>accountProperties.profile</code> or <code>changedProperties.profile</code>
      is set.
    </td>
    <td>No</td>
  </tr>
</table>

Resolves with `accountProperties`:

```js
{
  "id": "account123",
  "username": "pat",
  "createdAt": "2016-01-01T00:00.000Z",
  "updatedAt": "2016-02-01T00:00.000Z",
  "deletedAt": "2016-03-01T00:00.000Z",
  // if options.include === 'profile'
  "profile": {
    "fullname": "Dr. Pat Hook"
  }
}
```

Rejects with:

<table>
  <tr>
    <th align="left"><code>UnauthenticatedError</code></th>
    <td>Session is invalid</td>
  </tr>
  <tr>
    <th align="left"><code>NotFoundError</code></th>
    <td>Account not found</td>
  </tr>
  <tr>
    <th align="left"><code>ConnectionError</code></th>
    <td>Could not connect to server</td>
  </tr>
</table>

Examples

```js
admin.accounts.remove({ username: 'pat' }, { reason: 'foo bar' })
  .then(function (accountProperties) {})
  .catch(function (error) {
    console.error(error)
  })
// same as
admin.accounts.remove({ username: 'pat', reason: 'foo bar' })
  .then(function (accountProperties) {})
  .catch(function (error) {
    console.error(error)
  })
```

### api.accounts.removeAll()

---

🐕 **TO BE DONE**: _create issue and link it here_

---

### api.requests.add()

---

🐕 **TO BE DONE**: _create issue and link it here_

---

```js
admin.requests.add({
  type: 'passwordreset',
  contact: 'pat@example.com'
})
```

Resolves with

```js
{
  id: 'request123',
  type: 'passwordreset',
  contact: 'pat@example.com'
}
```

### api.requests.find()

---

🐕 **TO BE DONE**: _create issue and link it here_

---

```js
admin.requests.find('token123')
admin.requests.find({id: 'token123'})
```

### api.requests.findAll()

---

🐕 **TO BE DONE**: _create issue and link it here_

---

```js
admin.requests.findAll()
```

### api.requests.remove()

---

🐕 **TO BE DONE**: _create issue and link it here_

---

```js
admin.requests.remove('token123')
admin.requests.find({id: 'token123'})
```

### api.requests.removeAll()

---

🐕 **TO BE DONE**: _create issue and link it here_

---

### api.account()

---

🐕 **TO BE DONE**: _create issue and link it here_

---

The `admin.account` method returns a scoped API for one account

```js
var account = admin.account(idOrObject)
```

Examples

```js
admin.account('account123')
admin.account({id: 'account123'})
admin.account({username: 'pat@example.com'})
admin.account({token: 'pat@example.com'})
```

### api.account().profile.find()

---

🐕 **TO BE DONE**: _create issue and link it here_

---

```js
admin.account(idOrObject).profile.find()
```

resolves with `profileProperties`

```json
{
  "id": "account123-profile",
  "fullname": "Dr Pat Hook",
  "address": {
    "city": "Berlin",
    "street": "Adalberststraße 4a"
  }
}
```


### api.account().profile.update()

---

🐕 **TO BE DONE**: _create issue and link it here_

---

```js
admin.account(idOrObject).profile.update(changedProperties)
```

resolves with `profileProperties`

```json
{
  "id": "account123-profile",
  "fullname": "Dr Pat Hook",
  "address": {
    "city": "Berlin",
    "street": "Adalberststraße 4a"
  }
}
```


### api.account().tokens.add()

---

🐕 **TO BE DONE**: _create issue and link it here_

---

```js
admin.account(idOrObject).tokens.add(properties)
```

resolves with `tokenProperties`

```json
{
  "id": "token123",
  "type": "passwordreset",
  "accountId": "account123",
  "contact": "pat@example.com",
  "createdAt": "2016-01-01T00:00.000Z"
}
```

Example

```js
admin.account('token123').account.tokens.add({
  type: 'passwordreset',
  contact: 'pat@example.com'
})
```

### api.account().tokens.find()

---

🐕 **TO BE DONE**: _create issue and link it here_

---

```js
admin.account(idOrObject).tokens.find(idOrObject)
```

resolves with `tokenProperties`

```json
{
  "id": "token123",
  "type": "passwordreset",
  "accountId": "account123",
  "contact": "pat@example.com",
  "createdAt": "2016-01-01T00:00.000Z"
}
```

Example

```js
admin.account({username: 'pat'}).tokens.find('token123')
```


### api.account().tokens.findAll()

---

🐕 **TO BE DONE**: _create issue and link it here_

---

```js
admin.account(idOrObject).tokens.findAll(options)
```

resolves with array of `tokenProperties`

```json
[{
  "id": "token123",
  "type": "passwordreset",
  "accountId": "account123",
  "contact": "pat@example.com",
  "createdAt": "2016-01-01T00:00.000Z"
}, {
  "id": "token456",
  "type": "session",
  "accountId": "account123",
  "createdAt": "2016-01-02T00:00.000Z"
}]
```

Example

```js
admin.account({username: 'pat'}).tokens.findAll()
  .then(function (tokens) {})
  .catch(function (error) {
    console.error(error)
  })
```


### api.account().tokens.remove()

---

🐕 **TO BE DONE**: _create issue and link it here_

---

```js
admin.account(idOrObject).tokens.remove(idOrObject)
```

resolves with `tokenProperties`

```json
{
  "id": "token123",
  "type": "passwordreset",
  "accountId": "account123",
  "contact": "pat@example.com",
  "createdAt": "2016-01-01T00:00.000Z"
}
```

Example

```js
admin.account({username: 'pat'}).tokens.removes('token123')
```


### api.account().roles.add()

---

🐕 **TO BE DONE**: _create issue and link it here_

---

```js
admin.account(idOrObject).roles.add(name)
```

resolves with `roleName`

```json
"mycustomrole"
```

Example

```js
admin.account({username: 'pat'}).roles.add('mycustomrole')
```


### api.account().roles.findAll()

---

🐕 **TO BE DONE**: _create issue and link it here_

---

```js
admin.account(idOrObject).roles.add(name)
```

resolves with array of `roleName`s

```json
["mycustomrole", "myothercustomrole"]
```

Example

```js
admin.account({username: 'pat'}).roles.findAll()
  .then(function (roles) {})
  .catch(function (error) {
    console.error(error)
  })
```


### api.account().roles.remove()

---

🐕 **TO BE DONE**: _create issue and link it here_

---

```js
admin.account(idOrObject).roles.remove(name)
```

resolves with `roleName`

```json
"mycustomrole"
```

Example

```js
admin.account({username: 'pat'}).roles.remove('mycustomrole')
```

### Events

---

🐕 **TO BE DONE**: [#35](https://github.com/hoodiehq/hoodie-account-server/issues/35)

---

Events emitted on

- `admin.sessions`
- `admin.accounts`
- `admin.requests`

<table>
  <tr>
    <th align="left"><code>change</code></th>
    <td>
      triggered for any <code>add</code>, <code>update</code> and <code>remove</code> event
    </td>
  </tr>
  <tr>
    <th align="left" colspan="2"><code>add</code></th>
  </tr>
  <tr>
    <th align="left" colspan="2"><code>update</code></th>
  </tr>
  <tr>
    <th align="left" colspan="2"><code>remove</code></th>
  </tr>
</table>

```js
admin.sessions.on('change', function (eventName, session) {})
admin.accounts.on('update', function (account) {})
admin.requests.on('remove', handler)
```
