migrate(
  (app) => {
    // T2.16 — CA-2-011: diagnóstico comercial versionado, vínculo inequívoco
    // à oportunidade. Append-only: create para autenticados (operador cria
    // versão), update/delete bloqueados — editar cria nova versão (T2.17).
    // Núcleo mínimo: resumo (≥ 20 chars), pontos_de_dor, decisao_envolvida.
    if (app.hasTable('diagnosticos')) return

    const col = new Collection({
      name: 'diagnosticos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'negocio',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('negocios').id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'versao', type: 'number', required: true, onlyInt: true, min: 1 },
        { name: 'resumo', type: 'text', required: true, max: 5000 },
        { name: 'pontos_de_dor', type: 'text', max: 2000 },
        { name: 'decisao_envolvida', type: 'text', max: 2000 },
        {
          name: 'criado_por',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_diag_negocio ON diagnosticos (negocio)'],
    })
    app.save(col)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('diagnosticos'))
    } catch (_) {}
  },
)
