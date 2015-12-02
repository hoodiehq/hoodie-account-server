[back to hoodie-server-account](../README.md)

# hapi CouchDB Account Routes

See the shiny docs at http://docs.accountjsonapi.apiary.io/.
Comment / send PRs for [apiary.apib](https://github.com/hoodiehq/account-json-api/blob/master/apiary.apib).

All routes at a glance

```
# sign in, check session, sign out
PUT /session
GET /session
DELETE /session

# sign up, get / update / destroy account
# non-admins only
PUT /session/account
GET /session/account
PATCH /session/account
DELETE /session/account

# get / update profile
# non-admins only
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

- [session.js](session.js)
- [account.js](account.js)
- [profile.js](profile.js) ([tbd hoodie-server-account#11](https://github.com/hoodiehq/hoodie-server-account/issues/11))
- [requests.js](requests.js) ([hoodie-server-account#10](https://github.com/hoodiehq/hoodie-server-account/issues/10))
- [accounts.js](accounts.js) ([hoodie-server-account#12](https://github.com/hoodiehq/hoodie-server-account/issues/12))

The options passed to the routes plugins are the same as the ones passed to the
[main plugin](../plugin/README.md).

## Notes on CouchDB Admin accounts

CouchDB admins do not require `_users` docs, which that plugin requires, as it
stores user IDs in a special `id:<userId here>` role. Because of that, the
`/session/account` & `/session/account/profile` routes are forbidden for admins.
And even if an admin account has a `_users` doc, it will not be returned by the
`/accounts` API for consistency reasons.
