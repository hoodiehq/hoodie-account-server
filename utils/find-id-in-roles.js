module.exports = findIdInRoles

function findIdInRoles (roles) {
  for (var i = 0; i < roles.length; i++) {
    if (roles[i].substr(0, 3) === 'id:') {
      return roles[i].substr(3)
    }
  }
}
