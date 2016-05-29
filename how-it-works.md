[back to hoodie-account-server](README.md)

# How it works

## CouchDB `_users` doc specification & custom properties used by `hoodie-account-server`

`hoodie-account-server` works directly against [CouchDB’s Authentication System](http://docs.couchdb.org/en/latest/api/server/authn.html).
User accounts are docs in the `_users` database, and they have the following
requirements:

```js
{
   // Properties required by CouchDB
   // _id MUST consist of "org.couchdb.user:" + username
   "_id": "org.couchdb.user:pat",
   // _rev is required by CouchDB for every document
   "_rev": "1-c7eb42781549d144e6a42814376686e0",
   // name MUST be the username
   "name": "pat",
   // type MUST be set to "user"
   "type": "user",
   // iterations, password_scheme, derived_key & salt are automatically created
   // by CouchDB to hash the password. The original password does not get stored
   // and cannot be retrieved
   "iterations": 10,
   "password_scheme": "pbkdf2",
   "derived_key": "94266b18ecec62aa78cbe15cb27e98d7689ded5c",
   "salt": "ae995d9d359cb88105d120a0a8c498a2",
   // roles must be an array of strings. Roles can be used to give access
   // to databases. It must include an "id:..." role, see below
   "roles": ["id:abc4567"],
}
```

### <a name="id-role"></a>The "id role" – because usernames can change.

Access permissions can be set in CouchDB on a database level, by using usernames
or roles. As usernames are prone to change, `hoodie-account-server` adds an
id that is globally unique and will never change, and can therefore be used to
reference ownership & permissions. The id is added as the first entry in `"roles"`,
for example if the account id is `abc4567`, the role is `id:abc4567`

```js
{
  // ...
  "roles": [
    "id:abc4567"
  ]
}
```

It's recommended to always use the "id role" to grant permissions to databases,
as usernames can change.

### Exposed account properties by `hoodie-account-server`

`hoodie-account-server`’s REST API will only ever expose the following properties:

1. `username` – read only
2. `id` – read only

Usernames can be changed using the `"requests"` API, for which a custom routine
can be defined, for example an email confirmation workflow.

As no other properties from the `_users` docs will be exposed by
`hoodie-account-server`’s API by default, you can securely store sensitive
information like API keys, or password reset tokens.

### Account Profile

Custom user properties like full name, address, etc are stored in the `"profile"`
property of the `_users` doc. The properties can be accessed / changed using the
`GET /session/account/profile` & `PATCH /session/account/profile`.

```js
{
  "_id": "org.couchdb.user:pat"
  //...
  "profile": {
    "fullname": "Pat Hook"
  }
}
```

### Tokens

Tokens are stored for flexible usage in the `tokens` property. It's an array
of objects, in which all objects have an id, timestamp, expiration date and
a name. More meta properties can be added as needed.

```js
{
  "_id": "org.couchdb.user:pat"
  //...
  "tokens": [
    {
      "id": "token123",
      "name": "password reset",
      "createdAt": "2015-11-01T00:00:00.000Z",
      "expiresAt": "2015-11-15T00:00:00.000Z",
    }
  ]
}
```
