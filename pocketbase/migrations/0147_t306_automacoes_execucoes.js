// T3.06 — Automações Se/Então (doc Onda 3 §12): log de execuções das automações.
// Coleção `automacoes_execucoes` append-only: regra (select), negocio (relation),
// responsavel (relation), detalhe (json — snapshot mínimo), dia_referencia (date).
// Idempotência por UNIQUE (regra + negocio + dia_referencia) — mesmo padrão do
// cron T2.25 (proposta+dia).
// Regras: create APENAS server-side (createRule null); delete bloqueado.
// Lição AP-0200: atribuição direta field.values = [...] (NÃO .set('values')).
migrate(
  (app) => {
    var negocios = app.findCollectionByNameOrId('negocios')
    var existe = true
    try {
      app.findCollectionByNameOrId('automacoes_execucoes')
    } catch (_) {
      existe = false
    }
    if (!existe) {
      var col = new Collection({
        name: 'automacoes_execucoes',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          {
            name: 'regra',
            type: 'select',
            required: true,
            values: [
              'follow_up_proposta',
              'follow_up_sem_resposta',
              'alerta_sem_proxima_acao',
              'alerta_parada',
            ],
          },
          {
            name: 'negocio',
            type: 'relation',
            required: true,
            collectionId: negocios.id,
            maxSelect: 1,
          },
          {
            name: 'responsavel',
            type: 'relation',
            required: false,
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
          },
          { name: 'detalhe', type: 'json', maxSize: 100000 },
          { name: 'dia_referencia', type: 'date', required: true },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_autom_unica ON automacoes_execucoes (regra, negocio, dia_referencia)',
          'CREATE INDEX idx_autom_dia ON automacoes_execucoes (dia_referencia)',
        ],
      })
      app.save(col)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('automacoes_execucoes'))
    } catch (_) {}
  },
)
