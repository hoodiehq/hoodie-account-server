module.exports = serialiseSession

function serialiseSession (options, session) {
  var json = {
    links: {
      self: options.baseUrl + '/session'
    },
    data: {
      id: session.id,
      type: 'session',
      relationships: {
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
    },
    included: [
      {
        id: session.account.id,
        type: 'account',
        attributes: {
          username: session.account.username
        },
        relationships: {
          profile: {
            links: {
              related: options.baseUrl + '/session/account/profile'
            },
            data: {
              id: session.account.id + '-profile',
              type: 'accountProfile'
            }
          }
        }
      }
    ]
  }

  if (session.account.profile) {
    json.included.push({
      id: session.account.id + '-profile',
      type: 'profile',
      attributes: session.account.profile || {}
    })
  }

  return json
}
