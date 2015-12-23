module.exports = on

function on (state, eventName, handler) {
  state.accountsEmitter.on(eventName, handler)
}
