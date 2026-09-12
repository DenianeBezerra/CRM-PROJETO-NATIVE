// T3.01 — CA-3-001: atribuição granular de origem + motivo de ganho estruturado.
// Campos novos em negocios (todos opcionais exceto regras de hook):
// - canal: select (instagram, linkedin, whatsapp, site, google, evento, indicacao, trafego_pago, parceiro, outro)
// - origem_especifica: text (ex.: "Instagram orgânico", "Indicação do contador X")
// - campanha: text (ex.: "CFO as a Service 2026")
// - conteudo: text (ex.: post/reels/vídeo que gerou o lead)
// - motivo_ganho: select estruturado (preco, escopo, relacionamento, urgencia, indicacao_interna, outro)
// - motivo_ganho_detalhe: text (obrigatório quando motivo_ganho = outro — hook)
// O campo `origem` antigo (select 0021) é PRESERVADO para compatibilidade do
// dashboard T2.38 e do filtro; a migração de leitura é gradual (cobertura).
// Idempotente: add com try/catch (padrão 0021).
migrate(
  (app) => {
    const negocios = app.findCollectionByNameOrId('negocios')
    const fields = [
      {
        name: 'canal',
        type: 'select',
        values: [
          'instagram',
          'linkedin',
          'whatsapp',
          'site',
          'google',
          'evento',
          'indicacao',
          'trafego_pago',
          'parceiro',
          'outro',
        ],
        maxSelect: 1,
      },
      { name: 'origem_especifica', type: 'text', max: 200 },
      { name: 'campanha', type: 'text', max: 200 },
      { name: 'conteudo', type: 'text', max: 300 },
      {
        name: 'motivo_ganho',
        type: 'select',
        values: ['preco', 'escopo', 'relacionamento', 'urgencia', 'indicacao_interna', 'outro'],
        maxSelect: 1,
      },
      { name: 'motivo_ganho_detalhe', type: 'text', max: 1000 },
    ]
    for (const field of fields) {
      try {
        negocios.fields.add(new Field(field))
      } catch (_) {
        /* idempotente */
      }
    }
    app.save(negocios)
  },
  (app) => {
    try {
      const negocios = app.findCollectionByNameOrId('negocios')
      for (const name of [
        'canal',
        'origem_especifica',
        'campanha',
        'conteudo',
        'motivo_ganho',
        'motivo_ganho_detalhe',
      ]) {
        try {
          negocios.fields.removeByName(name)
        } catch (_) {}
      }
      app.save(negocios)
    } catch (_) {}
  },
)
