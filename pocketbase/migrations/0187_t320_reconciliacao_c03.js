// T3.20 — SPEC-3-020 (C-03): etapa do funil como fonte única da verdade.
// Reconciliação dos registros existentes: status DERIVA da etapa.
//   fechado_ganho → ganho | fechado_perdido → perdido | demais → em_negociacao
// Ganho exige valor > 0 e data_ganho (B-14): registro ganho sem valor é sinalizado
// via auditoria (não alterado automaticamente — decisão da CEO sobre o destino).
// Probabilidade derivada da etapa (B-15): final ganho=100, final perdido=0.
migrate(
  (app) => {
    var deals = app.findRecordsByFilter('negocios', '', '-created', 20000, 0)
    var reconciliados = 0
    var sinalizados = 0
    for (var i = 0; i < deals.length; i++) {
      var d = deals[i]
      var estagio = String(d.get('estagio') || '')
      var status = String(d.get('status') || '')
      var novoStatus = status
      if (estagio === 'fechado_ganho') novoStatus = 'ganho'
      else if (estagio === 'fechado_perdido') novoStatus = 'perdido'
      else novoStatus = 'em_negociacao'
      var mudou = false
      if (status !== novoStatus) {
        d.set('status', novoStatus)
        mudou = true
      }
      // probabilidade derivada
      var prob = Number(d.get('probabilidade') || 0)
      if (estagio === 'fechado_ganho' && prob !== 100) {
        d.set('probabilidade', 100)
        mudou = true
      } else if (estagio === 'fechado_perdido' && prob !== 0) {
        d.set('probabilidade', 0)
        mudou = true
      }
      if (mudou) {
        app.save(d)
        reconciliados++
      }
      // B-14: ganho sem valor/data — sinaliza na auditoria, não altera
      if (
        estagio === 'fechado_ganho' &&
        (Number(d.get('valor') || 0) <= 0 ||
          !String(d.get('data_ganho') || '') ||
          String(d.get('data_ganho') || '').indexOf('0001-01-01') === 0)
      ) {
        try {
          var audit = app.findCollectionByNameOrId('auditoria')
          var ev = new Record(audit)
          ev.set('entidade', 'negocios')
          ev.set('registro_id', d.id)
          ev.set('acao', 'update')
          ev.set('ator_id', '')
          ev.set('ocorrido_em', new Date().toISOString())
          ev.set('estado_anterior', '')
          ev.set(
            'estado_posterior',
            JSON.stringify({
              t320_reconciliacao: 'ganho_sem_valor_ou_data',
              valor: Number(d.get('valor') || 0),
            }),
          )
          app.save(ev)
          sinalizados++
        } catch (_) {}
      }
    }
    app
      .logger()
      .info('T320 reconciliacao C-03', 'reconciliados', reconciliados, 'sinalizados', sinalizados)
  },
  (app) => {},
)
