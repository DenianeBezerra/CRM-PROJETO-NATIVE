routerAdd(
  'POST',
  '/backend/v1/demo/deactivate-fixture/{id}',
  (e) => {
    if (!e.auth || e.auth.getString('role') !== 'admin') {
      return e.forbiddenError('Apenas administradores podem desativar fixtures.')
    }

    const id = e.request.pathValue('id')
    const fixture = $app.findRecordById('_pb_users_auth_', id)
    if (!fixture.getBool('demo_fixture')) {
      return e.badRequestError('O registro não é uma fixture de demonstração.')
    }
    if (!fixture.getBool('active')) {
      return e.json(200, { ok: true, alreadyInactive: true })
    }

    fixture.set('active', false)
    fixture.set('deactivated_at', new Date().toISOString())
    fixture.set('deactivated_by', e.auth.id)
    $app.save(fixture)

    const audit = new Record($app.findCollectionByNameOrId('fixture_audit'))
    audit.set('fixture_id', fixture.id)
    audit.set('action', 'deactivated')
    audit.set('actor_id', e.auth.id)
    audit.set('occurred_at', new Date().toISOString())
    audit.set('reason', 'Desativação manual de fixture de demonstração')
    $app.save(audit)

    return e.json(200, { ok: true, fixtureId: fixture.id, action: 'deactivated' })
  },
  $apis.requireAuth(),
)
