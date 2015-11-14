module.exports = api

var _ = require('lodash')
var getSession = require('./lib/utils/session/get')
var createSession = require('./lib/utils/session/create')
var deleteSession = require('./lib/utils/session/delete')

function api (options) {
  var state = _.clone(options)

  return {
    session: {
      add: addSession.bind(null, state),
      find: findSession.bind(null, state),
      remove: removeSession.bind(null, state)
    }
  }
}

function addSession (state, options) {
  return new Promise(function (resolve, reject) {
    createSession({
      couchUrl: state.url,
      username: options.username,
      password: options.password,
      includeProfile: options.include === 'account.profile'
    }, function (error, session) {
      if (error) {
        return reject(error)
      }

      resolve(session)
    })
  })
}

function findSession (state, id, options) {
  return new Promise(function (resolve, reject) {
    getSession({
      couchUrl: state.url,
      bearerToken: id,
      includeProfile: options.include === 'account.profile'
    }, function (error, session) {
      if (error) {
        return reject(error)
      }

      resolve(session)
    })
  })
}

function removeSession (state, id, options) {
  return new Promise(function (resolve, reject) {
    deleteSession({
      couchUrl: state.url,
      bearerToken: id,
      includeAccount: options.include === 'account',
      includeProfile: options.include === 'account.profile'
    }, function (error, session) {
      if (error) {
        return reject(error)
      }

      resolve(session)
    })
  })
}
