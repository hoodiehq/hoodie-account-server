# hapi-couchdb-account-api

> Account REST API backed by CouchDB

[![Build Status](https://travis-ci.org/hoodiehq/hapi-couchdb-account-api.svg?branch=master)](https://travis-ci.org/hoodiehq/hapi-couchdb-account-api)
[![Coverage Status](https://coveralls.io/repos/hoodiehq/hapi-couchdb-account-api/badge.svg?branch=master)](https://coveralls.io/r/hoodiehq/hapi-couchdb-account-api?branch=master)
[![Dependency Status](https://david-dm.org/hoodiehq/hapi-couchdb-account-api.svg)](https://david-dm.org/hoodiehq/hapi-couchdb-account-api)
[![devDependency Status](https://david-dm.org/hoodiehq/hapi-couchdb-account-api/dev-status.svg)](https://david-dm.org/hoodiehq/hapi-couchdb-account-api#info=devDependencies)

## Usage

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

- [Routes](routes/README.md)
- [API](api/README.md)
- [How it works](how-it-works.md)
- [Testing](routes/README.md)


## License

[Apache-2.0](https://github.com/hoodiehq/hoodie/blob/master/LICENSE)
