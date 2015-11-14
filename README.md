# hapi-couchdb-account-api

> Account REST API backed by CouchDB

[![Build Status](https://travis-ci.org/hoodiehq/hapi-couchdb-account-api.svg?branch=master)](https://travis-ci.org/hoodiehq/hapi-couchdb-account-api)
[![Coverage Status](https://coveralls.io/repos/hoodiehq/hapi-couchdb-account-api/badge.svg?branch=master)](https://coveralls.io/r/hoodiehq/hapi-couchdb-account-api?branch=master)
[![Dependency Status](https://david-dm.org/hoodiehq/hapi-couchdb-account-api.svg)](https://david-dm.org/hoodiehq/hapi-couchdb-account-api)
[![devDependency Status](https://david-dm.org/hoodiehq/hapi-couchdb-account-api/dev-status.svg)](https://david-dm.org/hoodiehq/hapi-couchdb-account-api#info=devDependencies)


## RESTful API

See current work in progress here http://docs.accountrestapi.apiary.io/
Comment / send PRs for [apiary.apib](https://github.com/gr2m/account-rest-api/blob/master/apiary.apib).

Have a glance (might be outdated, check links above)

```
# sign in, check session, sign out
PUT /session
GET /session
DELETE /session

# sign up, get / update / destroy account
PUT /session/account
GET /session/account
PATCH /session/account
DELETE /session/account

# get / update profile
GET /session/account/profile
PATCH /session/account/profile

# requests (e.g. password resets / username reminder, user account confirmation)
POST /requests
GET /requests # admins only
GET /requests/{id}
DELETE /requests/{id}

# admins only: manage accounts
POST /accounts
GET /accounts
GET /accounts/{username}
PATCH /accounts/{username}
DELETE /accounts/{username}
```

## CouchDB `_users` doc specification & custom properties used by `hapi-couchdb-account-api`

`hapi-couchdb-account-api` works directly against [CouchDB’s Authentication System](http://docs.couchdb.org/en/latest/api/server/authn.html).
User accounts are docs in the `_users` database, and they have the following
requirements:

```js
{
   // Properties required by CouchDB
   // _id MUST consist of "org.couchdb.user:" + username
   "_id": "org.couchdb.user:test",
   // _rev is required by CouchDB for every document
   "_rev": "1-c7eb42781549d144e6a42814376686e0",
   // name MUST be the username
   "name": "test",
   // type MUST be set to "user"
   "type": "user",
   // iterations, password_scheme, derived_key & salt is automatically created
   // by CouchDB to hash the password. The original password does not get stored
   // and cannot be retrieved
   "iterations": 10,
   "password_scheme": "pbkdf2",
   "derived_key": "94266b18ecec62aa78cbe15cb27e98d7689ded5c",
   "salt": "ae995d9d359cb88105d120a0a8c498a2",
   // roles must be an array of strings. Roles can be used to give access
   // to databases
   "roles": [],
}
```

### The "id role" – because usernames can change.

Access permissions can be set in CouchDB on a database level, by using usernames
or roles. As usernames are prone to change, `hapi-couchdb-account-api` adds an
id that is globally unique and will never change, and can therefore be used to
reference ownership & permissions. The id is added as the first entry in `"roles"`,
for example if the account id is `abc4567`, the role is `id:abc4567`

```js
{
  // ...
  "roles": [
    "id:abc4567"
  ]
}
```

It's recommended to always use the "id role" to grant permissions to databases,
as usernames can change.

### Exposed account properties by `hapi-couchdb-account-api`

`hapi-couchdb-account-api`’s REST API will only ever expose the following properties:

1. `username` – read only*
2. `id` – read only
3. `password` – write only

Usernames can be changed using the `"requests"` API, for which a custom routine
can be defined, for example an email confirmation workflow.

As no other properties from the `_users` docs will be exposed by
`hapi-couchdb-account-api`’s API by default, you can securely store sensitive
information like API keys, or password reset tokens.

### Account Profile

Custom user properties like full name, address, etc are stored in the `"profile"`
property of the `_users` doc. The properties can be accessed / changed using the
`GET /session/account/profile` & `PATCH /session/account/profile`.

## Plugin API

```js
var Hapi = require('hapi')
var hapiAccount = require('hapi-couchdb-account-api')

var options = {
  couchdb: {
    url: 'http://localhost:5984',
    admin: {
      username: 'admin',
      password: 'secret'
    }
  },
  confirmation: 'auto',
  notifications: {
    service: 'gmail',
    auth: {
      user: 'gmail.user@gmail.com',
      pass: 'userpass'
    },
    templates: {
      passwordreset: 'Dear {account.username},\n\nyou can reset your password at:\n{server.info.uri}/#resetPassword/{request.token}',
      confirmation: 'Dear {account.profile.name},\n\nyour confirmation code is {token}'
    }
  },
  schema: {
    username: {
      minlength: 3
    },
    password: {
      minlength: 6
    },
    profile: {
      required: ['name'],
      properties: {
        name: {
          type: 'string',
          minlength: 3
        }
      }
    }
  },
  requests: {
    upgrade: function (request, reply) {
      var server = request.connection.server
      var user = request.auth.credentials

      var promise = server.app.users.update({
        id: user.id,
        plan: request.params.plan
      })

      reply(promise)
    }
  }
})

server.register({register: hapiAccount}, options, function (error) {
  if (error) {
    throw error
  }

  // plugin account api, see below

});

server.connection({
  port: 8000
});

server.start(function () {
  console.log('Server running at %s', server.info.uri);
});
```

`hapi-couchdb-account-api` also adds a Promise-based API at
`server.plugins.account.api`


### options.couchdb

Location & admin credentials for CouchDB, either set as object or as string.

#### Example 1

```js
couchdb: {
  url: 'http://localhost:5984',
  admin: {
    username: 'admin',
    password: 'secret'
  }
}
```

#### Example 2

```js
couchdb: 'http://admin:secret@localhost@5984'
```

### options.confirmation

Account confirmation strategy.

- `"auto"`: accounts get confirmed automatically
- `"email"`: user receives email with confirmation token / url
- `"invite-only"`: user receives email with invitation token, that needs to be passed on sign up
- `false`: Admins confirm manually, or custom logic / 3rd-party plugins

### options.notifications

Settings to send notifications to users like password resets and account confirmations.
`notifications.service` and `notifications.auth` should be compatible with
[nodemailer](https://www.npmjs.com/package/nodemailer)

`options.notifications.templates` are templates for notifications being sent out
by the server.

### options.schema

A JSON schema to validate account properties against.

### options.requests

Handlers for custom requests

### Account server API

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

## Testing

Local setup

```
git clone git@github.com:hoodiehq/hapi-couchdb-account-api.git
cd hapi-couchdb-account-api
npm install
```

Run all tests and code style checks

```
npm test
```

Run all tests on file change

```
npm run test:watch
```


## License

[Apache-2.0](https://github.com/hoodiehq/hoodie/blob/master/LICENSE)
