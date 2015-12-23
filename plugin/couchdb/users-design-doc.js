/* global emit */
module.exports = {
  _id: '_design/byId',
  views: {
    byId: {
      map: function (doc) {
        var isAdmin = doc.roles.indexOf('_admin') !== -1
        if (isAdmin) {
          return
        }
        for (var i = 0; i < doc.roles.length; i++) {
          if (doc.roles[i].substr(0, 3) === 'id:') {
            return emit(doc.roles[i].substr(3), null)
          }
        }
      }.toString()
    }
  }
}
