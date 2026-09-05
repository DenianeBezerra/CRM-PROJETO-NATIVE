onRecordAuthWithPasswordRequest((e) => {
  // Only deactivated demo fixtures are blocked. Never apply this gate to
  // administrative or non-demo accounts used by the platform.
  if (e.record && e.record.getBool('demo_fixture') && e.record.getBool('active') === false) {
    return e.badRequestError('Conta de demonstração desativada.')
  }
  return e.next()
})
