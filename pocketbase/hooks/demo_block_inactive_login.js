onRecordAuthWithPasswordRequest((e) => {
  if (e.record && e.record.getBool('active') === false) {
    return e.badRequestError('Conta de demonstração desativada.')
  }
  return e.next()
})
