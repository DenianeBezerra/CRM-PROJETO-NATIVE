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
        const consumos = $app.findRecordsByFilter(
          'exportacoes',
          'usuario = {:u} && csv_gerado = true',
          '-ocorrido_em',
          1,
          0,
          { u: 'v86kq5x0v4guoym' },
        )
        trilha = consumos[0]
      } catch (err2) {
        return e.json(200, { erro_trilha: String(err2) })
      }
      const criadoRaw = aceite.get('created')
      const consumidoRaw = trilha.get('ocorrido_em')
      return e.json(200, {
        criado_tipo: typeof criadoRaw,
        criado_string: String(criadoRaw),
        criado_parse: Date.parse(String(criadoRaw)),
        consumido_tipo: typeof consumidoRaw,
        consumido_string: String(consumidoRaw),
        consumido_parse: Date.parse(String(consumidoRaw)),
        comparacao_string: String(criadoRaw) <= String(consumidoRaw),
        comparacao_epoch: Date.parse(String(criadoRaw)) <= Date.parse(String(consumidoRaw)),
        trilha_id: trilha.id,
      })
    } catch (err) {
      return e.json(200, { erro_geral: String(err) })
    }
  },
  $apis.requireAuth(),
)
