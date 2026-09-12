// T3.03 — WhatsApp P1 (doc Onda 3 §14): registro estruturado de interações
// WhatsApp na oportunidade. Coleção `interacoes_whatsapp` append-only
// (deleteRule null), mesmo padrão de formularios/fichas_proposta.
// Campos: negocio (relation obrigatória), contato (relation opcional),
// direcao (entrada|saida), resumo (5–5000 chars), resultado
// (sem_resposta|resposta|reuniao_agendada|proposta_solicitada|negativo),
// responsavel (relation users), proxima_acao_descricao/em, trilha (json).
// Lição AP-0200: atribuição direta field.values = [...] (NÃO .set('values')).
migrate(
  (app) => {
    var negocios = app.findCollectionByNameOrId('negocios')
    var clientes = app.findCollectionByNameOrId('clientes')
    var existe = true
    try {
      app.findCollectionByNameOrId('interacoes_whatsapp')
    } catch (_) {
      existe = false
    }
    if (!existe) {
      var col = new Collection({
        name: 'interacoes_whatsapp',
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
          {
            name: 'contato',
            type: 'relation',
            required: false,
            collectionId: clientes.id,
            maxSelect: 1,
          },
          { name: 'direcao', type: 'select', required: true, values: ['entrada', 'saida'] },
          {
            name: 'resumo',
            type: 'text',
            required: true,
            max: 5000,
          },
          {
            name: 'resultado',
            type: 'select',
            required: true,
            values: [
              'sem_resposta',
              'resposta',
              'reuniao_agendada',
              'proposta_solicitada',
              'negativo',
            ],
          },
          {
            name: 'responsavel',
            type: 'relation',
            required: true,
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
          },
          { name: 'proxima_acao_descricao', type: 'text', max: 1000 },
          { name: 'proxima_acao_em', type: 'date' },
          { name: 'trilha', type: 'json', maxSize: 2000000 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_wa_negocio ON interacoes_whatsapp (negocio)',
          'CREATE INDEX idx_wa_created ON interacoes_whatsapp (created)',
        ],
      })
      app.save(col)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('interacoes_whatsapp'))
    } catch (_) {}
  },
)
