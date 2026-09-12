// T3.02 — CA-3-002/003/004/005: formulários inteligentes por solução.
// Coleção `formularios` (respostas vinculadas a contato/empresa/oportunidade)
// + campos de contexto na oportunidade. Regras: leitura apenas autenticada;
// create/update/delete SOMENTE server-side (null) — o público entra pela rota
// dedicada por token. Idempotente (padrão 0021/0110).
migrate(
  (app) => {
    var negocios = app.findCollectionByNameOrId('negocios')
    var existe = true
    try {
      app.findCollectionByNameOrId('formularios')
    } catch (_) {
      existe = false
    }
    if (!existe) {
      var col = new Collection({
        name: 'formularios',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          { name: 'token', type: 'text', required: true, max: 64 },
          { name: 'negocio', type: 'relation', collectionId: negocios.id, maxSelect: 1 },
          {
            name: 'contato',
            type: 'relation',
            collectionId: app.findCollectionByNameOrId('clientes').id,
            maxSelect: 1,
          },
          {
            name: 'empresa',
            type: 'relation',
            collectionId: app.findCollectionByNameOrId('empresas').id,
            maxSelect: 1,
          },
          {
            name: 'solucao',
            type: 'select',
            required: true,
            values: ['bpo_financeiro', 'cfo_as_a_service', 'consultoria'],
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['gerado', 'enviado', 'respondido', 'expirado'],
            maxSelect: 1,
          },
          { name: 'respostas', type: 'json', maxSize: 2000000 },
          { name: 'resumo', type: 'text', max: 8000 },
          { name: 'gerado_por', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
          { name: 'enviado_em', type: 'date' },
          { name: 'respondido_em', type: 'date' },
          { name: 'consentimento_lgpd', type: 'bool' },
          { name: 'consentimento_versao', type: 'text', max: 40 },
          { name: 'trilha', type: 'json', maxSize: 200000 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_formularios_token ON formularios (token)'],
      })
      app.save(col)
    }
    var campos = [
      {
        name: 'formulario_status',
        type: 'select',
        values: ['gerado', 'enviado', 'respondido'],
        maxSelect: 1,
      },
      { name: 'dados_formulario', type: 'json', maxSize: 2000000 },
      { name: 'formulario_resumo', type: 'text', max: 8000 },
    ]
    for (var i = 0; i < campos.length; i++) {
      try {
        negocios.fields.add(new Field(campos[i]))
      } catch (_) {
        /* idempotente */
      }
    }
    app.save(negocios)
  },
  (app) => {
    try {
      var negocios = app.findCollectionByNameOrId('negocios')
      var nomes = ['formulario_status', 'dados_formulario', 'formulario_resumo']
      for (var i = 0; i < nomes.length; i++) {
        try {
          negocios.fields.removeByName(nomes[i])
        } catch (_) {}
      }
      app.save(negocios)
      app.delete(app.findCollectionByNameOrId('formularios'))
    } catch (_) {}
  },
)
