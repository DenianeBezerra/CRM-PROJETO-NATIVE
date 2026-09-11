// T2.25 — CA-2-020: cron diário 08:00 America/Sao_Paulo — varre propostas
// emitidas com validade vencida e registra na fila do responsável.
//
// GARANTIA: o cron NUNCA altera resultado comercial — não muda status da
// proposta nem estágio da oportunidade; só registra a fila (append-only,
// idempotente por proposta+dia via índice UNIQUE).
//
// Fuso: America/Sao_Paulo = UTC-3 (sem horário de verão desde 2019) →
// 08:00 BRT = 11:00 UTC. A plataforma acorda a instância ~2 min antes.
//
// Lições JSVM: lógica inline (scoping), datas PB normalizadas " " → "T",
// findRecordsByFilter com sort/limit (findFirst sem sort não existe aqui).
cronAdd('fila_propostas_vencidas_diaria', '0 11 * * *', () => {
  const agora = Date.now()
  const diaReferencia = new Date().toISOString().slice(0, 10)

  let vencidas = []
  try {
    vencidas = $app.findRecordsByFilter('propostas', "status = 'emitida'", '-versao', 500, 0)
  } catch (err) {
    $app.logger().error('T225 falha ao consultar propostas', 'error', String(err))
    return
  }

  let registradas = 0
  for (let i = 0; i < vencidas.length; i++) {
    const p = vencidas[i]
    const validade = String(p.get('validade') || '').replace(' ', 'T')
    const ms = Date.parse(validade)
    if (isNaN(ms) || ms >= agora) continue // não vencida

    // Idempotência: já registrada hoje? (índice UNIQUE proposta+dia)
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
      $app.logger().error('T225 falha ao checar duplicidade', 'error', String(err))
      continue
    }
    if (jaRegistrada) continue

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
      // Corrida benigna: UNIQUE proposta+dia — outra execução registrou primeiro.
      $app.logger().warn('T225 registro duplicado ignorado', 'error', String(err))
    }
  }

  $app
    .logger()
    .info(
      'T225 fila de propostas vencidas',
      'dia',
      diaReferencia,
      'vencidas_registradas',
      String(registradas),
    )
})
