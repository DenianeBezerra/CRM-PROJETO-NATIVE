routerAdd(
  'POST',
  '/backend/v1/demo-fixtures/{id}/deactivate',
  (e) => {
    if (!e.auth || e.auth.getString('role') !== 'admin') {
      return e.forbiddenError('Apenas administradores podem desativar fixtures.')
    }
    const fixture = $app.findRecordById('demo_fixtures', e.request.pathValue('id'))
    if (fixture.getString('status') !== 'active') {
      return e.json(200, { ok: true, alreadyDeactivated: true })
    }
    fixture.set('status', 'deactivated')
    fixture.set('deactivated_at', new Date().toISOString())
    fixture.set('deactivated_by', e.auth.id)
    $app.save(fixture)

    const audit = new Record($app.findCollectionByNameOrId('fixture_audit'))
    audit.set('fixture_id', fixture.id)
    audit.set('action', 'deactivated')
    audit.set('actor_id', e.auth.id)
    audit.set('occurred_at', new Date().toISOString())
    audit.set('reason', 'Desativação administrativa de fixture de demonstração')
    $app.save(audit)
    return e.json(200, { ok: true, fixtureId: fixture.id, action: 'deactivated' })
  },
  $apis.requireAuth(),
)
