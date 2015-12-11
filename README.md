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
user accounts, sesions, etc, we want to use PouchDB + a custom plugin that
exposes APIs for all these things, and decides internally what to do with it
based on wether the backend is CouchDB, levelDB, or whatever.

The custom PouchDB plugin needs to expose APIs for these use cases

- Create session id for username
- Get a users doc for username & password (we’ll use that for session validation, too)
- create users doc with username, password, roles
- update a users doc, either as admin, or by passing in session id
- delete a users doc, either as admin, or by passing in a session id
- add / change security for existing database

Dreamcode (assuming `db` is a PouchDB instance with our plugin applied)

```js
// Create session id for username
db.auth.createSession({name: 'pat', auth: 'admin'})
db.auth.createSession({name: 'pat', auth: {password: 'secret'}})
// Get a users doc for username & password
db.auth.getAccount({name: 'pat'}, { auth: 'admin'})
db.auth.getAccount({name: 'pat'}, { auth: {session: 'sessionId123'}})
db.auth.getAccount({name: 'pat'}, { auth: {password: 'secret'}})
// update a users doc (delta change, not relace)
db.auth.updateAccount({name: 'pat', newProperty: 'newValue'}, {auth: 'admin'})
db.auth.updateAccount({name: 'pat', newProperty: 'newValue'}, {auth: { session: 'sessionId123'}})
// delete a users doc
db.auth.updateAccount({name: 'pat', _deleted: true}, { auth: 'admin'})
db.auth.updateAccount({name: 'pat', _deleted: true}, { auth: { session: 'sessionId123'}})
// add / change security for existing database
db.auth.setSecurity({
  db: 'dbname',
  members: {
    roles: ["myuserrole"]
  }
})
```

## Usage

```js
var Hapi = require('hapi')
var PouchDB = require('PouchDB')
var hapiAccount = require('hoodie-server-account')

PouchDB.plugin(require('pouchdb-hoodie-auth')({
  secret: 'supersecret123usedforsessionids',
  admin: {
    username: 'admin',
    password: 'secret'
  }
}))

var db = new PouchDB('http://localhost:5984')

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

server.register({register: hapiAccount}, options, function (error) {});
server.connection({ port: 8000 });
server.start(function () {
  console.log('Server running at %s', server.info.uri);
});
```

## More

- [Plugin & Options](plugin/README.md)
- [Routes](routes/README.md)
- [API](api/README.md)
- [How it works](how-it-works.md)
- [Testing](tests/README.md)


## License

[Apache-2.0](https://github.com/hoodiehq/hoodie/blob/master/LICENSE)
