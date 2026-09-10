// DEBUG T2.04 — rota temporária para diagnosticar comparação de datas no JSVM.
// REMOVER antes de concluir a task.
routerAdd(
  'GET',
  '/backend/v1/debug/datas',
  (e) => {
    const aceite = $app.findRecordById('aceites_exportacao', 'b80daizu08sy3io')
    const trilha = $app.findFirstRecordByFilter(
      'exportacoes',
      'usuario = {:u} && csv_gerado = true',
      '-ocorrido_em',
      { u: 'v86kq5x0v4guoym' },
    )
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
      trilha_ocorrido: trilha.get('ocorrido_em'),
      trilha_id: trilha.id,
    })
  },
  $apis.requireAuth(),
)
