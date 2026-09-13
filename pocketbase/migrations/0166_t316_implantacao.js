// T3.16 — SPEC-3-016: Implantação de cliente (cap. 7 do doc da CEO).
// 1) empresas.status ganha 'em_implantacao' (select inplace — AP-0200: field.values = [...])
// 2) coleção implantacoes (delete bloqueado): empresa (unique), modelo, status, responsavel, datas
// 3) coleção implantacao_etapas: implantacao, ordem, titulo, descricao, responsavel, prazo,
//    status (pendente|em_andamento|concluida|nao_aplicavel), evidencia, concluida_em
// 4) auditoria.acao ganha implantacao_criada/etapa_concluida/implantacao_concluida/transicao_ativo
// Lições: AP-0200 (atribuição direta field.values = [...]); construtores tipados em migrations
// (new SelectField/new DateField/new NumberField/new TextField/new BoolField — `new Field` não existe).

migrate(
  (app) => {
    // --- empresas.status: + em_implantacao ---
    var emp = app.findCollectionByNameOrId('empresas')
    var campoStatus = emp.fields.getByName('status')
    var vals = campoStatus.values || []
    if (vals.indexOf('em_implantacao') < 0) {
      vals.push('em_implantacao')
      campoStatus.values = vals
      app.save(emp)
    }

    // --- coleção implantacoes ---
    var implantacoes = new Collection({
      name: 'implantacoes',
      type: 'base',
      listRule: "@request.auth.id != '' && @request.auth.role != 'comercial'",
      viewRule: "@request.auth.id != '' && @request.auth.role != 'comercial'",
      createRule: null,
      updateRule: "@request.auth.id != '' && @request.auth.role != 'comercial'",
      deleteRule: null,
      fields: [
        new TextField({ name: 'empresa', required: true, max: 15 }),
        new SelectField({
          name: 'modelo',
          required: true,
          maxSelect: 1,
          values: ['padrao'],
        }),
        new SelectField({
          name: 'status',
          required: true,
          maxSelect: 1,
          values: ['em_andamento', 'concluida', 'cancelada'],
        }),
        new TextField({ name: 'responsavel', required: false, max: 15 }),
        new DateField({ name: 'data_inicio', required: false }),
        new DateField({ name: 'data_conclusao', required: false }),
      ],
      indexes: ['CREATE UNIQUE INDEX idx_implantacoes_empresa ON implantacoes (empresa)'],
    })
    app.save(implantacoes)

    // --- coleção implantacao_etapas ---
    var etapas = new Collection({
      name: 'implantacao_etapas',
      type: 'base',
      listRule: "@request.auth.id != '' && @request.auth.role != 'comercial'",
      viewRule: "@request.auth.id != '' && @request.auth.role != 'comercial'",
      createRule: null,
      updateRule: "@request.auth.id != '' && @request.auth.role != 'comercial'",
      deleteRule: null,
      fields: [
        new TextField({ name: 'implantacao', required: true, max: 15 }),
        new NumberField({ name: 'ordem', required: true, onlyInt: true }),
        new TextField({ name: 'titulo', required: true, max: 200 }),
        new TextField({ name: 'descricao', required: false, max: 1000 }),
        new TextField({ name: 'responsavel', required: false, max: 15 }),
        new DateField({ name: 'prazo', required: false }),
        new SelectField({
          name: 'status',
          required: true,
          maxSelect: 1,
          values: ['pendente', 'em_andamento', 'concluida', 'nao_aplicavel'],
        }),
        new TextField({ name: 'evidencia', required: false, max: 2000 }),
        new DateField({ name: 'concluida_em', required: false }),
      ],
      indexes: ['CREATE INDEX idx_impl_etapas_impl ON implantacao_etapas (implantacao, ordem)'],
    })
    app.save(etapas)

    // --- auditoria: novas ações ---
    var au = app.findCollectionByNameOrId('auditoria')
    var campoAcao = au.fields.getByName('acao')
    var valores = campoAcao.values || []
    var novos = [
      'implantacao_criada',
      'etapa_concluida',
      'implantacao_concluida',
      'transicao_ativo',
    ]
    for (var m = 0; m < novos.length; m++) {
      if (valores.indexOf(novos[m]) < 0) valores.push(novos[m])
    }
    campoAcao.values = valores
    app.save(au)
  },
  (app) => {
    var etapas = app.findCollectionByNameOrId('implantacao_etapas')
    app.delete(etapas)
    var implantacoes = app.findCollectionByNameOrId('implantacoes')
    app.delete(implantacoes)
    var emp = app.findCollectionByNameOrId('empresas')
    var campoStatus = emp.fields.getByName('status')
    var vals = campoStatus.values || []
    var ix = vals.indexOf('em_implantacao')
    if (ix >= 0) {
      vals.splice(ix, 1)
      campoStatus.values = vals
      app.save(emp)
    }
  },
)
