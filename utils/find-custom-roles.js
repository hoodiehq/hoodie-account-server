module.exports = findCustomRoles

function findCustomRoles (roles) {
  return roles.filter(isntInteralRole)
}

function isntInteralRole (role) {
  if (role === '_admin') {
    return false
  }

  if (role.substr(0, 3) === 'id:') {
    return false
  }

  return true
}
