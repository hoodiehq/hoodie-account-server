# hoodie-account-server

> Account REST API backed by CouchDB

[![Build Status](https://travis-ci.org/hoodiehq/hoodie-account-server.svg?branch=master)](https://travis-ci.org/hoodiehq/hoodie-account-server)
[![Dependency Status](https://david-dm.org/hoodiehq/hoodie-account-server.svg)](https://david-dm.org/hoodiehq/hoodie-account-server)
[![devDependency Status](https://david-dm.org/hoodiehq/hoodie-account-server/dev-status.svg)](https://david-dm.org/hoodiehq/hoodie-account-server#info=devDependencies)
✷

✷ coverage is currently disabled: [#37](https://github.com/hoodiehq/hoodie-account-server/issues/37)

## Usage

```js
var Hapi = require('hapi')
var PouchDB = require('PouchDB')
var hapiAccount = require('@hoodie/server-account')

PouchDB.plugin(require('pouchdb-users'))

var db = new PouchDB('http://localhost:5984/_users')
db.installUsersBehavior().then(function () {
  var options = {
    usersDb: db,
    admins: {
      admin: '-pbkdf2-a2ca9d3ee921c26d2e9d61e03a0801b11b8725c6,1081b31861bd1e91611341da16c11c16a12c13718d1f712e,10'
    },
    secret: 'secret123'
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

[Apache 2.0](http://www.apache.org/licenses/LICENSE-2.0)
