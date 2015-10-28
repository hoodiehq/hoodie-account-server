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
  // server is ready
});

server.connection({
  port: 8000
});

server.start(function () {
  console.log('Server running at %s', server.info.uri);
});
```

`hapi-couchdb-account-api` also adds a `server.app.account.admin` API, which is the same as the
[account admin client](https://github.com/hoodiehq/account-client/tree/master/admin) API.

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
