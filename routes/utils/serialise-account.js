module.exports = serialiseAccount

function serialiseAccount (options, data) {
  return Array.isArray(data)
    ? serialiseMany(options, data)
    : serialiseOne(options, data)
}

function serialiseOne (options, account) {
  var accountUrl = options.admin
    ? options.baseUrl + '/accounts/' + account.id
    : options.baseUrl + '/session/account'
  var json = {
    links: {
      self: accountUrl
    },
    data: {
      id: account.id,
      type: 'account',
      attributes: {
        username: account.username,
        createdAt: account.createdAt,
        signedUpAt: account.signedUpAt
      },
      relationships: {
        profile: {
          links: {
            related: accountUrl + '/profile'
          },
          data: {
            id: account.id + '-profile',
            type: 'profile'
          }
        }
      }
    }
  }

  if (account.profile) {
    json.included = [{
      id: account.id + '-profile',
      type: 'profile',
      attributes: account.profile,
      links: {
        self: accountUrl + '/profile'
      }
    }]
  }

  return json
}

function serialiseMany (options, accounts) {
  var json = {
    links: {
      self: options.baseUrl + '/accounts',
      first: options.baseUrl + '/accounts',
      last: options.baseUrl + '/accounts'
    },
    data: accounts.map(function (account) {
      var json = {
        id: account.id,
        type: 'account',
        links: {
          self: options.baseUrl + '/accounts/' + account.id
        },
        attributes: {
          username: account.username,
          createdAt: account.createdAt,
          signedUpAt: account.signedUpAt
        },
        relationships: {
          profile: {
            links: {
              related: options.baseUrl + '/accounts/' + account.id + '/profile'
            },
            data: {
              id: account.id + '-profile',
              type: 'profile'
            }
          }
        }
      }

      return json
    })
  }

  if (options.include === 'profile') {
    json.included = accounts.map(function (account) {
      return {
        id: account.id + '-profile',
        type: 'profile',
        attributes: account.profile || {},
        links: {
          self: options.baseUrl + '/accounts/' + account.id + '/profile'
        }
      }
    })
  }

  return json
}
