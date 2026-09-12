// T3.14 — E1–E9: campos para gatilhos por marcação de etapa + exceções com prazo de alerta.
// 1) obrigacoes: campo 'etapa' (select) — marcação de progresso que alimenta os gatilhos
//    de E1–E9 sem integração externa (decisão da CEO 13/09: integração Omie/banco fica para depois).
// 2) obrigacoes: campo 'etapa_em' (date) — quando a etapa foi marcada (base do prazo de resposta E1/E4).
// 3) excecoes: campo 'prazo_alerta' (date) — vencimento do alerta da exceção.
// 4) excecoes: campo 'reincidencia' (number) — contador de reincidência no ciclo (E1 → coordenação).
// 5) auditoria: novas ações 'etapa_marcada' e 'excecao_gerada'.
// Lição AP-0200: atribuição direta field.values = [...] (NÃO .set('values')).
migrate(
  (app) => {
    // --- obrigacoes: etapa + etapa_em ---
    var ob = app.findCollectionByNameOrId('obrigacoes')
    var temEtapa = false
    var temEtapaEm = false
    for (var i = 0; i < ob.fields.length; i++) {
      if (ob.fields[i].name === 'etapa') temEtapa = true
      if (ob.fields[i].name === 'etapa_em') temEtapaEm = true
    }
    if (!temEtapa) {
      var fEtapa = new Field({
        type: 'select',
        name: 'etapa',
        required: false,
        presentable: false,
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
      })
      ob.fields.add(fEtapa)
    }
    if (!temEtapaEm) {
      var fEtapaEm = new Field({
        type: 'date',
        name: 'etapa_em',
        required: false,
        presentable: false,
      })
      ob.fields.add(fEtapaEm)
    }
    app.save(ob)

    // --- excecoes: prazo_alerta + reincidencia ---
    var ex = app.findCollectionByNameOrId('excecoes')
    var temPrazo = false
    var temReinc = false
    for (var j = 0; j < ex.fields.length; j++) {
      if (ex.fields[j].name === 'prazo_alerta') temPrazo = true
      if (ex.fields[j].name === 'reincidencia') temReinc = true
    }
    if (!temPrazo) {
      var fPrazo = new Field({
        type: 'date',
        name: 'prazo_alerta',
        required: false,
        presentable: false,
      })
      ex.fields.add(fPrazo)
    }
    if (!temReinc) {
      var fReinc = new Field({
        type: 'number',
        name: 'reincidencia',
        required: false,
        presentable: false,
        onlyInt: true,
      })
      ex.fields.add(fReinc)
    }
    app.save(ex)

    // --- auditoria: etapa_marcada + excecao_gerada ---
    var au = app.findCollectionByNameOrId('auditoria')
    var campoAcao = null
    for (var k = 0; k < au.fields.length; k++) {
      if (au.fields[k].name === 'acao') {
        campoAcao = au.fields[k]
        break
      }
    }
    var valores = campoAcao.values || []
    var novos = ['etapa_marcada', 'excecao_gerada']
    for (var m = 0; m < novos.length; m++) {
      if (valores.indexOf(novos[m]) < 0) valores.push(novos[m])
    }
    campoAcao.values = valores
    app.save(au)
  },
  (app) => {
    // down: remover campos adicionados
    var ob = app.findCollectionByNameOrId('obrigacoes')
    var keep = []
    for (var i = 0; i < ob.fields.length; i++) {
      var n = ob.fields[i].name
      if (n !== 'etapa' && n !== 'etapa_em') keep.push(ob.fields[i])
    }
    ob.fields = keep
    app.save(ob)
    var ex = app.findCollectionByNameOrId('excecoes')
    var keepEx = []
    for (var j = 0; j < ex.fields.length; j++) {
      var ne = ex.fields[j].name
      if (ne !== 'prazo_alerta' && ne !== 'reincidencia') keepEx.push(ex.fields[j])
    }
    ex.fields = keepEx
    app.save(ex)
  },
)
