module.exports = serialiseAccount

function serialiseAccount (options, account) {
  var json = {
    links: {
      self: options.baseUrl + '/session/account'
    },
    data: {
      id: account.id,
      type: 'account',
      attributes: {
        username: account.username
      },
      relationships: {
        profile: {
          links: {
            related: options.baseUrl + '/session/account/profile'
          },
          data: {
            id: account.id + '-profile',
            type: 'accountProfile'
          }
        }
      }
    }
  }

  if (account.profile) {
    json.included = {
      id: account.id + '-profile',
      type: 'profile',
      attributes: account.profile || {}
    }
  }

  return json
}
