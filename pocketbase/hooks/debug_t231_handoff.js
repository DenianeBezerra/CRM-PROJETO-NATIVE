// T2.31 — Rota debug SOMENTE-LEITURA para diagnosticar o 400 na transição
// fechado_ganho. NÃO cria nem altera registro — replica a lógica do hook
// handoff_ganho.js passo a passo e reporta onde quebra. Admin-only.
// REMOVE-SE após o diagnóstico (padrão T2.09: rota debug é temporária).
routerAdd(
  'GET',
  '/backend/v1/debug/t231-handoff',
  (e) => {
    try {
      const actor = e.auth
      if (!actor || actor.get('role') !== 'admin') {
        return e.json(403, { error: 'Rota debug exclusiva de administradores.' })
      }

      const out = {}

      // 1) Coleção handoffs existe e campos batem?
      try {
        const col = $app.findCollectionByNameOrId('handoffs')
        out.colecao = 'ok'
        out.campos = col.fields
          .map(function (f) {
            return f.name + ':' + f.type
          })
          .join(',')
        out.createRule = String(col.createRule)
        out.indexes = col.indexes
      } catch (err) {
        return e.json(200, Object.assign(out, { falha: 'colecao', erro: String(err) }))
      }

      // 2) findRecordsByFilter na coleção (idempotência)?
      try {
        const existente = $app.findRecordsByFilter(
          'handoffs',
          'negocio = "ek8vvnaisupsnga"',
          '',
          1,
          0,
        )
        out.idempotencia_probe = 'ok, encontrados=' + existente.length
      } catch (err) {
        return e.json(200, Object.assign(out, { falha: 'idempotencia_probe', erro: String(err) }))
      }

      // 3) new Record + set de cada campo (sem save) — valida tipos/valores.
      try {
        const col = $app.findCollectionByNameOrId('handoffs')
        const rec = new Record(col)
        rec.set('negocio', 'ek8vvnaisupsnga')
        rec.set('origem', 'cfo_as_a_service')
        rec.set('responsavel_emissor', 'v86kq5x0v4guoym')
        rec.set('responsavel_receptor', 'v86kq5x0v4guoym')
        rec.set('status', 'pendente')
        rec.set('checklist', JSON.stringify([{ item: 'probe', feito: false }]))
        rec.set('observacao_ganho', 'probe somente-leitura')
        rec.set('criado_em', new Date().toISOString().replace('T', ' '))
        out.set_campos = 'ok'
      } catch (err) {
        return e.json(200, Object.assign(out, { falha: 'set_campos', erro: String(err) }))
      }

      // 4) Permanência aberta do negócio (contexto do stage_dwell_history).
      try {
        const open = $app.findRecordsByFilter(
          'permanencias_negocio',
          'negocio = "ek8vvnaisupsnga" && (saiu_em = "" || saiu_em ~ "0001-01-01")',
          '-created',
          5,
          0,
        )
        out.permanencias_abertas = open.length
        out.permanencia_etapa = open.length > 0 ? String(open[0].get('etapa')) : ''
      } catch (err) {
        out.permanencias_erro = String(err)
      }

      // 5) Registro real: estagio original + versao.
      try {
        const neg = $app.findRecordById('negocios', 'ek8vvnaisupsnga')
        out.negocio_estagio = String(neg.get('estagio'))
        out.negocio_versao = Number(neg.get('versao_registro')) || 0
      } catch (err) {
        out.negocio_erro = String(err)
      }

      return e.json(200, out)
    } catch (err) {
      return e.json(500, { erro: String(err) })
    }
  },
  $apis.requireAuth(),
)
