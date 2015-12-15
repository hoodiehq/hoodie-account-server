# hoodie-server-account

> Account REST API backed by CouchDB

[![Build Status](https://travis-ci.org/hoodiehq/hoodie-server-account.svg?branch=master)](https://travis-ci.org/hoodiehq/hoodie-server-account)
[![Coverage Status](https://coveralls.io/repos/hoodiehq/hoodie-server-account/badge.svg?branch=master)](https://coveralls.io/r/hoodiehq/hoodie-server-account?branch=master)
[![Dependency Status](https://david-dm.org/hoodiehq/hoodie-server-account.svg)](https://david-dm.org/hoodiehq/hoodie-server-account)
[![devDependency Status](https://david-dm.org/hoodiehq/hoodie-server-account/dev-status.svg)](https://david-dm.org/hoodiehq/hoodie-server-account#info=devDependencies)

# WIP Node Sessions

This is work in progress to move auth logic into the node layer to make it
more performant. If CouchDB is used as backend, it’s security features are
used just as before in addition to the node layer

See https://github.com/hoodiehq/discussion/issues/86 for context.

Instead of using [request](https://www.npmjs.com/package/request) to manage
user accounts, sesions, etc, we want to use PouchDB + [pouchdb-auth](https://github.com/pouchdb/pouchdb-auth)

Run test for signup, which is using PouchDB already

```
node tests/integration/session-with-pouchdb-test.js
```

## Usage

```js
var Hapi = require('hapi')
var PouchDB = require('PouchDB')
var hapiAccount = require('hoodie-server-account')

PouchDB.plugin(require('pouchdb-auth')

var db = new PouchDB('http://localhost:5984/_users')
db.useAsAuthenticationDB().then(function () {
  var options = {
    db: db,
    notifications: {
      service: 'gmail',
      auth: {
        user: 'gmail.user@gmail.com',
        pass: 'userpass'
      }
    }
  })

  server.register({register: hapiAccount, options: options}, function (error) {});
  server.connection({ port: 8000 });
  server.start(function () {
    console.log('Server running at %s', server.info.uri);
  });
})
```

## More

- [Plugin & Options](plugin/README.md)
- [Routes](routes/README.md)
- [API](api/README.md)
- [How it works](how-it-works.md)
- [Testing](tests/README.md)


## License

[Apache-2.0](https://github.com/hoodiehq/hoodie/blob/master/LICENSE)
