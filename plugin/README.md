[back to hoodie-standalone-account](../README.md)

# hapi CouchDB Account Plugin

```js
var Hapi = require('hapi')
var hapiAccount = require('hoodie-server-account')

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

`hoodie-server-account` also adds a Promise-based API at
`server.plugins.account.api`. More in the [CouchDB Account API README.md](api/README.md)

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
couchdb: 'http://admin:secret@localhost:5984'
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
