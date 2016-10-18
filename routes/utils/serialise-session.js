module.exports = serialiseSession

function serialiseSession (options, session) {
  if (!session.account) {
    return {
      links: {
        self: options.baseUrl + '/session'
      },
      data: {
        id: session.id,
        type: 'session'
      }
    }
  }
  var json = {
    links: {
      self: options.baseUrl + '/session'
    },
    data: {
      id: session.id,
      type: 'session'
    },
    included: [
      {
        id: session.account.id,
        type: 'account',
        attributes: {
          username: session.account.username,
          roles: session.account.roles
        },
        relationships: {
          profile: {
            links: {
              related: options.baseUrl + '/session/account/profile'
            },
            data: {
              id: session.account.id + '-profile',
              type: 'profile'
            }
          }
        }
      }
    ]
  }

  json.data.relationships = {
    account: {
      links: {
        related: options.baseUrl + '/session/account'
      },
      data: {
        id: session.account.id,
        type: 'account'
      }
    }
  }

  if (session.account.profile) {
    json.included.push({
      id: session.account.id + '-profile',
      type: 'profile',
      attributes: session.account.profile
    })
  }

  return json
}
