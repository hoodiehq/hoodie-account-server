module.exports = serialiseProfile

function serialiseProfile (options, account) {
  var profileUrl = options.baseUrl + '/session/account/profile'

  var json = {
    links: {
      self: profileUrl
    },
    data: {
      id: account.id + '-profile',
      type: 'profile',
      attributes: account.profile
    }
  }

  return json
}
