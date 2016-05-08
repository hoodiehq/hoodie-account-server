# hoodie-account-server

> Account JSON API backed by PouchDB

[![Build Status](https://api.travis-ci.org/hoodiehq/hoodie-account-server.svg?branch=master)](https://travis-ci.org/hoodiehq/hoodie-account-server)
[![Coverage Status](https://coveralls.io/repos/hoodiehq/hoodie-account-server/badge.svg?branch=master)](https://coveralls.io/r/hoodiehq/hoodie-account-server?branch=master)
[![Dependency Status](https://david-dm.org/hoodiehq/hoodie-account-server.svg)](https://david-dm.org/hoodiehq/hoodie-account-server)
[![devDependency Status](https://david-dm.org/hoodiehq/hoodie-account-server/dev-status.svg)](https://david-dm.org/hoodiehq/hoodie-account-server#info=devDependencies)

`hoodie-account-server` is a [Hapi](http://hapijs.com/) plugin that implements
the [Account JSON API](http://docs.accountjsonapi.apiary.io) routes and exposes
a corresponding API at `server.plugins.account.api.*`, persisting user accounts
using [PouchDB](https://pouchdb.com).

## Example

```js
var Hapi = require('hapi')
var PouchDB = require('PouchDB')
var hapiAccount = require('@hoodie/account-server')

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

## Contributing

Have a look at the Hoodie project's [contribution guidelines](https://github.com/hoodiehq/hoodie/blob/master/CONTRIBUTING.md).
If you want to hang out you can join our [Hoodie Community Chat](http://hood.ie/chat/).

## License

[Apache 2.0](http://www.apache.org/licenses/LICENSE-2.0)
