// T3.02b — ficha de preparação da proposta (doc Onda 3 §10).
// Coleção `fichas_proposta`: campos internos editáveis pelo time, versionados
// (append-only em versões — mesmo padrão do diagnóstico T2.16/17).
// Consolidação automática (qualificação + diagnóstico + formulário + oportunidade)
// é calculada server-side no endpoint — não fica gravada aqui.
migrate(
  (app) => {
    var negocios = app.findCollectionByNameOrId('negocios')
    var existe = true
    try {
      app.findCollectionByNameOrId('fichas_proposta')
    } catch (_) {
      existe = false
    }
    if (!existe) {
      var col = new Collection({
        name: 'fichas_proposta',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: null,
        fields: [
          {
            name: 'negocio',
            type: 'relation',
            required: true,
            collectionId: negocios.id,
            maxSelect: 1,
          },
          { name: 'versao', type: 'number', required: true },
          { name: 'solucao_recomendada', type: 'text', max: 3000 },
          { name: 'escopo_sugerido', type: 'text', max: 5000 },
          { name: 'frequencia_atuacao', type: 'text', max: 1000 },
          { name: 'senioridade', type: 'text', max: 1000 },
          { name: 'entregaveis', type: 'text', max: 5000 },
          { name: 'premissas_precificacao', type: 'text', max: 5000 },
          { name: 'pontos_a_confirmar', type: 'text', max: 5000 },
          { name: 'criado_por', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
          { name: 'motivo_atualizacao', type: 'text', max: 500 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_fichas_negocio ON fichas_proposta (negocio)'],
      })
      app.save(col)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('fichas_proposta'))
    } catch (_) {}
  },
)
