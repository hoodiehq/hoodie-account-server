[back to hoodie-account-server](../README.md)

# hapi CouchDB Account Plugin

Exposes a [REST API](../routes/README.md) and [JavaScript API](../api/README.md) at
`server.plugins.account.api`.

This plugin also creates `_users/_design/byId` in your CouchDB, which has one
map function ([see doc](couchdb/users-design-doc.js)).

## Example

```js
var Hapi = require('hapi')
var hapiAccount = require('@hoodie/account-server')

var PouchDB = require('pouchdb')
PouchDB.plugin(require('pouchdb-users'))
PouchDB.plugin(require('pouchdb-admins'))

var db = new PouchDB('http://localhost:5984/_users')
var options = {
  admins: {
    admin: '-pbkdf2-a2ca9d3ee921c26d2e9d61e03a0801b11b8725c6,1081b31861bd1e91611341da16c11c16a12c13718d1f712e,10'
  },
  secret: 'secret123',
  sessionTimeout: 1209600,
  confirmation: 'auto',
  notifications: {
    transport: {
      service: 'gmail',
      auth: {
        user: 'gmail.user@gmail.com',
        pass: 'userpass'
      }
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

db.useAsAuthenticationDB().then(function () {
  options.usersDb = db

  server.register({
    register: hapiAccount,
    options: options
  }, function (error) {
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
})
```

## Options

### options.usersDb

PouchDB instance with the
[pouchdb-users](https://github.com/hoodiehq/pouchdb-users) and
[pouchdb-admins](https://github.com/hoodiehq/pouchdb-admins) plugin.

### options.admins

Map of admin usernames to secrets, as it’s defined in CouchDb config

### options.sessionTimeout

Timeout for session in milliseconds.

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

A [JSON schema](http://json-schema.org/) to validate account properties against.

### options.requests

Handlers for custom requests
