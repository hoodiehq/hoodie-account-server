[back to hapi-couchdb-account](..)

# hapi CouchDB Account Routes

See the shiny docs at http://docs.accountrestapi.apiary.io/.
Comment / send PRs for [apiary.apib](https://github.com/hoodiehq/account-rest-api/blob/master/apiary.apib).

All routes at a glance

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

The route groups are implemented as hapi plugins themselves.

- (session.js)[session.js]
- (account.js)[account.js] [tbd #20](https://github.com/hoodiehq/hapi-couchdb-account/issues/20)
- (profile.js)[profile.js] [tbd #21](https://github.com/hoodiehq/hapi-couchdb-account/issues/21)
- (requests.js)[requests.js] [tbd #22](https://github.com/hoodiehq/hapi-couchdb-account/issues/22)
- (accounts.js)[accounts.js] [tbd #34](https://github.com/hoodiehq/hapi-couchdb-account/issues/34)

The options passed to the routes plugins are the same as the ones passed to the
[main plugin](../plugin/README.md).
