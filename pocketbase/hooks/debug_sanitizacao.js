// DEBUG T2.06 — rota temporária para provar o saneamento de snapshots.
// Cria evento de auditoria com password/token no snapshot e retorna o que foi
// efetivamente gravado. REMOVER antes de concluir a task.
routerAdd(
  'GET',
  '/backend/v1/debug/sanitizacao',
  (e) => {
    try {
      const audit = $app.findCollectionByNameOrId('auditoria')
      const evento = new Record(audit)
      evento.set('entidade', 'clientes')
      evento.set('registro_id', 'fixture-sanitizacao-t206')
      evento.set('acao', 'create')
      evento.set('ator_id', e.auth.id)
      evento.set('ocorrido_em', new Date().toISOString().replace('Z', ''))
      evento.set(
        'estado_anterior',
        JSON.stringify({
          nome: 'Teste',
          password: 'SuperSenha123',
          api_key: 'sk-1234567890abcdef',
          token: '',
        }),
      )
      evento.set(
        'estado_posterior',
        JSON.stringify({ nome: 'Teste 2', password: 'OutraSenha456', observacao: 'campo normal' }),
      )
      $app.save(evento)

      // Reler o que foi gravado (o hook de saneamento deve ter agido).
      const gravado = $app.findRecordById('auditoria', evento.id)
      return e.json(200, {
        id: gravado.id,
        estado_anterior_gravado: gravado.get('estado_anterior'),
        estado_posterior_gravado: gravado.get('estado_posterior'),
      })
    } catch (err) {
      return e.json(500, { erro: String(err) })
    }
  },
  $apis.requireAuth(),
)
