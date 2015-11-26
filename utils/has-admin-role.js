module.exports = hasAdminRole

function hasAdminRole (roles) {
  return roles.indexOf('_admin') !== -1
}
