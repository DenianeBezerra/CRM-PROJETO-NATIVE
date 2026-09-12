// T3.14 — E1–E9: campos para gatilhos por marcação de etapa + exceções com prazo de alerta.
// 1) obrigacoes: campo 'etapa' (select) — marcação de progresso que alimenta os gatilhos
//    de E1–E9 sem integração externa (decisão da CEO 13/09: integração Omie/banco fica para depois).
// 2) obrigacoes: campo 'etapa_em' (date) — quando a etapa foi marcada (base do prazo de resposta E1/E4).
// 3) excecoes: campo 'prazo_alerta' (date) — vencimento do alerta da exceção.
// 4) excecoes: campo 'reincidencia' (number) — contador de reincidência no ciclo (E1 → coordenação).
// 5) auditoria: novas ações 'etapa_marcada' e 'excecao_gerada'.
// Lições: AP-0200 (atribuição direta field.values = [...]) + guia de migrations
// (col.fields.add usa construtores tipados: new SelectField/new DateField/new NumberField —
// `new Field` genérico NÃO existe no runtime e derruba a migration).
migrate(
  (app) => {
    // --- obrigacoes: etapa + etapa_em ---
    var ob = app.findCollectionByNameOrId('obrigacoes')
    if (!ob.fields.getByName('etapa')) {
      ob.fields.add(
        new SelectField({
          name: 'etapa',
          required: false,
          presentable: false,
          maxSelect: 1,
          values: [
            'aguardando',
            'enviada',
            'executada',
            'conciliada',
            'emitida',
            'entregue',
            'aguardando_aceite',
            'aguardando_aprovacao',
          ],
        }),
      )
    }
    if (!ob.fields.getByName('etapa_em')) {
      ob.fields.add(new DateField({ name: 'etapa_em', required: false, presentable: false }))
    }
    app.save(ob)

    // --- excecoes: prazo_alerta + reincidencia ---
    var ex = app.findCollectionByNameOrId('excecoes')
    if (!ex.fields.getByName('prazo_alerta')) {
      ex.fields.add(new DateField({ name: 'prazo_alerta', required: false, presentable: false }))
    }
    if (!ex.fields.getByName('reincidencia')) {
      ex.fields.add(
        new NumberField({
          name: 'reincidencia',
          required: false,
          presentable: false,
          onlyInt: true,
        }),
      )
    }
    app.save(ex)

    // --- auditoria: etapa_marcada + excecao_gerada ---
    var au = app.findCollectionByNameOrId('auditoria')
    var campoAcao = au.fields.getByName('acao')
    var valores = campoAcao.values || []
    var novos = ['etapa_marcada', 'excecao_gerada']
    for (var m = 0; m < novos.length; m++) {
      if (valores.indexOf(novos[m]) < 0) valores.push(novos[m])
    }
    campoAcao.values = valores
    app.save(au)
  },
  (app) => {
    var ob = app.findCollectionByNameOrId('obrigacoes')
    ob.fields.removeByName('etapa')
    ob.fields.removeByName('etapa_em')
    app.save(ob)
    var ex = app.findCollectionByNameOrId('excecoes')
    ex.fields.removeByName('prazo_alerta')
    ex.fields.removeByName('reincidencia')
    app.save(ex)
  },
)
