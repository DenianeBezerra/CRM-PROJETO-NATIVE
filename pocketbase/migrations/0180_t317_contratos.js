// T3.17 — SPEC-3-017: Modelo de contrato no CRM (passo anterior à integração ClickSign).
// Coleção `contratos` (append-only no ciclo; delete bloqueado):
//   negocio (relation), versao (number), status (rascunho|gerado|enviado_assinatura|
//   assinado|cancelado — os 2 últimos RESERVADOS à integração ClickSign futura),
//   conteudo (texto integral), dados (json das variáveis), gerado_por, gerado_em.
// auditoria.acao ganha 'contrato_gerado'.
// Lições aplicadas: AP-2310 (autodate created/updated explícitos na criação da coleção);
// AP-0200 (atribuição direta field.values = [...]; construtores tipados).
// Campos de coleção nova são adicionados APÓS o save da coleção vazia (lição T3.16/0168).

migrate(
  (app) => {
    var existe = true
    try {
      app.findCollectionByNameOrId('contratos')
    } catch (_) {
      existe = false
    }
    if (!existe) {
      var negocios = app.findCollectionByNameOrId('negocios')
      var users = app.findCollectionByNameOrId('users')
      var col = new Collection({
        name: 'contratos',
        type: 'base',
        listRule: "@request.auth.id != '' && @request.auth.role != 'comercial'",
        viewRule: "@request.auth.id != '' && @request.auth.role != 'comercial'",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [],
      })
      app.save(col)
      col.fields.add(
        new RelationField({
          name: 'negocio',
          required: true,
          maxSelect: 1,
          collectionId: negocios.id,
        }),
      )
      col.fields.add(new NumberField({ name: 'versao', required: true, onlyInt: true }))
      col.fields.add(
        new SelectField({
          name: 'status',
          required: true,
          maxSelect: 1,
          values: ['rascunho', 'gerado', 'enviado_assinatura', 'assinado', 'cancelado'],
        }),
      )
      col.fields.add(new TextField({ name: 'conteudo', required: true, maxSize: 200000 }))
      col.fields.add(new JSONField({ name: 'dados', maxSize: 100000 }))
      col.fields.add(
        new RelationField({
          name: 'gerado_por',
          required: false,
          maxSelect: 1,
          collectionId: users.id,
        }),
      )
      col.fields.add(new DateField({ name: 'gerado_em', required: false }))
      col.fields.add(new AutodateField({ name: 'created', onCreate: true, onUpdate: false }))
      col.fields.add(new AutodateField({ name: 'updated', onCreate: true, onUpdate: true }))
      col.indexes.push('CREATE INDEX idx_contratos_negocio ON contratos (negocio, versao)')
      app.save(col)
    }

    // auditoria: nova ação contrato_gerado
    var au = app.findCollectionByNameOrId('auditoria')
    var campoAcao = au.fields.getByName('acao')
    var valores = campoAcao.values || []
    if (valores.indexOf('contrato_gerado') < 0) {
      valores.push('contrato_gerado')
      campoAcao.values = valores
      app.save(au)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('contratos'))
    } catch (_) {}
  },
)
