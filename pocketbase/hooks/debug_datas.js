// DEBUG T2.04 — rota temporária para diagnosticar comparação de datas no JSVM.
// REMOVER antes de concluir a task.
routerAdd(
  'GET',
  '/backend/v1/debug/datas',
  (e) => {
    try {
      const aceite = $app.findRecordById('aceites_exportacao', 'b80daizu08sy3io')
      let trilha = null
      try {
        trilha = $app.findFirstRecordByFilter(
          'exportacoes',
          'usuario = {:u} && csv_gerado = true',
          '-ocorrido_em',
          { u: 'v86kq5x0v4guoym' },
        )
      } catch (err2) {
        return e.json(200, { erro_trilha: String(err2) })
      }
      const criadoRaw = aceite.get('created')
      const consumidoRaw = trilha.get('ocorrido_em')
      return e.json(200, {
        criado_tipo: typeof criadoRaw,
        criado_string: String(criadoRaw),
        consumido_tipo: typeof consumidoRaw,
        consumido_string: String(consumidoRaw),
        comparacao_string: String(criadoRaw) <= String(consumidoRaw),
        trilha_id: trilha.id,
      })
    } catch (err) {
      return e.json(200, { erro_geral: String(err) })
    }
  },
  $apis.requireAuth(),
)
