// T2.25 — CA-2-020: execução manual da varredura da fila (admin-only).
// POST /backend/v1/filas/propostas-vencidas/executar
// Usa EXATAMENTE a mesma lógica do cron diário 08:00 BRT (fila_propostas_vencidas_cron.js)
// — duplicada inline porque o JSVM não compartilha código entre arquivos.
// Serve para prova imediata e reprocessamento; o cron segue sendo o gatilho
// de produção. Idempotente por proposta+dia (índice UNIQUE).
routerAdd(
  'POST',
  '/backend/v1/filas/propostas-vencidas/executar',
  (e) => {
    const actor = e.auth
    if (!actor || actor.get('role') !== 'admin') {
      return e.json(403, { error: 'Execução manual é exclusiva de administradores.' })
    }

    const agora = Date.now()
    const diaReferencia = new Date().toISOString().slice(0, 10)

    let vencidas = []
    try {
      vencidas = $app.findRecordsByFilter('propostas', "status = 'emitida'", '-versao', 500, 0)
    } catch (err) {
      return e.json(500, { error: 'Falha ao consultar propostas: ' + String(err) })
    }

    let registradas = 0
    let jaRegistradas = 0
    for (let i = 0; i < vencidas.length; i++) {
      const p = vencidas[i]
      const validade = String(p.get('validade') || '').replace(' ', 'T')
      const ms = Date.parse(validade)
      if (isNaN(ms) || ms >= agora) continue

      let jaRegistrada = false
      try {
        const dup = $app.findRecordsByFilter(
          'fila_propostas_vencidas',
          'proposta = "' + p.id + '" && dia_referencia = "' + diaReferencia + '"',
          '',
          1,
          0,
        )
        jaRegistrada = dup.length > 0
      } catch (err) {
        continue
      }
      if (jaRegistrada) {
        jaRegistradas++
        continue
      }

      const col = $app.findCollectionByNameOrId('fila_propostas_vencidas')
      const rec = new Record(col)
      rec.set('proposta', p.id)
      rec.set('negocio', p.get('negocio'))
      rec.set('responsavel', p.get('responsavel'))
      rec.set('versao_proposta', Number(p.get('versao')) || 0)
      rec.set('valor', Number(p.get('valor')) || 0)
      rec.set('validade', String(p.get('validade') || ''))
      rec.set('dia_referencia', diaReferencia)
      try {
        $app.save(rec)
        registradas++
      } catch (err) {
        $app.logger().warn('T225 registro duplicado ignorado', 'error', String(err))
      }
    }

    return e.json(200, {
      dia_referencia: diaReferencia,
      vencidas_registradas: registradas,
      ja_registradas_hoje: jaRegistradas,
      executado_em: new Date().toISOString(),
    })
  },
  $apis.requireAuth(),
)
