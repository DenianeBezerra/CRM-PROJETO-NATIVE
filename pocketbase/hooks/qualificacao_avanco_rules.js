// T2.13 — CA-2-008: operador não avança com campo obrigatório vazio;
// administrador libera por exceção com motivo, validade e auditoria.
//
// REQUEST hook (onRecordUpdateRequest em negocios) — roda ANTES do model hook
// stage_dwell_history: quando o avanço é bloqueado, o histórico de permanência
// nunca é tocado (a versão model hook deixava permanência fantasma a cada
// bloqueio, corrompendo o histórico e travando avanços futuros).
//
// Regras:
// - avanço real = ordem da etapa sobe e destino não é etapa final;
// - exceção vigente (não expirada) para o negócio libera o avanço;
// - perguntas obrigatórias ativas aplicáveis à etapa atual sem resposta
//   bloqueiam, listando as pendências;
// - voltar de etapa ou ir para fechado_* não é bloqueado aqui
//   (fechamento tem regras próprias — outcome_rules/comercial_fields).
//
// Lições JSVM aplicadas: sem bind params (interpolação direta de IDs),
// sort de respostas usa respondido_em (lição T2.12), datas do PocketBase
// normalizadas de " " para "T" antes do Date.parse (lição T2.04).

onRecordUpdateRequest((e) => {
  const etapaNova = String(e.record.get('estagio') || '').trim()
  const etapaAntes = String(e.record.original().get('estagio') || '').trim()

  // Só interessa quando a etapa está mudando.
  if (!etapaNova || etapaNova === etapaAntes) {
    return e.next()
  }

  // Ordens das etapas (etapas_negocio; fallback fixo se coleção vazia).
  const fallbackOrdem = {
    novo: 10,
    contato_feito: 20,
    proposta: 30,
    fechado_ganho: 40,
    fechado_perdido: 50,
  }
  let ordemNova = fallbackOrdem[etapaNova]
  let ordemAntes = fallbackOrdem[etapaAntes]
  try {
    const etapas = $app.findRecordsByFilter('etapas_negocio', 'ativa = true', 'ordem', 100, 0)
    for (let i = 0; i < etapas.length; i++) {
      const chave = String(etapas[i].get('chave') || '')
      if (chave === etapaNova) ordemNova = Number(etapas[i].get('ordem'))
      if (chave === etapaAntes) ordemAntes = Number(etapas[i].get('ordem'))
    }
  } catch (_) {
    // fallback já definido
  }

  // Avanço real = ordem aumentou e não é etapa final.
  const ehFinal = etapaNova === 'fechado_ganho' || etapaNova === 'fechado_perdido'
  if (ehFinal || ordemNova === undefined || ordemAntes === undefined || ordemNova <= ordemAntes) {
    return e.next()
  }

  // 1) Exceção vigente libera o avanço ANTES de qualquer outra verificação.
  let excecoes = []
  try {
    excecoes = $app.findRecordsByFilter(
      'excecoes_qualificacao',
      'negocio = "' + e.record.id + '"',
      '-created',
      50,
      0,
    )
  } catch (err) {
    console.log('T213 excecoes erro: ' + String(err))
    excecoes = []
  }
  const agora = Date.now()
  for (let i = 0; i < excecoes.length; i++) {
    // Datas do PocketBase vêm como "2026-09-30 00:00:00.000Z" (espaço) —
    // normalizar para "T" antes do Date.parse (lição T2.04).
    const validade = Date.parse(String(excecoes[i].get('validade') || '').replace(' ', 'T'))
    if (!isNaN(validade) && validade >= agora) {
      return e.next()
    }
  }

  // 2) Perguntas obrigatórias ativas aplicáveis à etapa ATUAL (a que está
  // sendo deixada) ou a todas — sair da etapa sem respondê-las é bloqueado.
  let perguntas = []
  try {
    perguntas = $app.findRecordsByFilter('perguntas_qualificacao', 'ativa = true', 'ordem', 500, 0)
  } catch (err) {
    console.log('T213 perguntas erro: ' + String(err))
    throw new Error('Falha ao validar o avanço de etapa.')
  }
  const aplicaveis = perguntas.filter(function (p) {
    const a = String(p.get('aplicavel_a') || 'todas')
    return !!p.get('obrigatoria') && (a === 'todas' || a === etapaAntes)
  })

  if (aplicaveis.length === 0) {
    return e.next()
  }

  let respostas = []
  try {
    respostas = $app.findRecordsByFilter(
      'respostas_qualificacao',
      'negocio = "' + e.record.id + '"',
      '-respondido_em',
      500,
      0,
    )
  } catch (err) {
    console.log('T213 respostas erro: ' + String(err))
    respostas = []
  }
  const respondidas = {}
  for (let i = 0; i < respostas.length; i++) {
    respondidas[respostas[i].get('pergunta')] = respostas[i]
  }

  const pendentes = []
  for (let i = 0; i < aplicaveis.length; i++) {
    const p = aplicaveis[i]
    const r = respondidas[p.id]
    let preenchida = false
    if (r) {
      const tipo = String(p.get('tipo') || '')
      if (tipo === 'numero') {
        const n = r.get('resposta_numero')
        preenchida = n !== undefined && n !== null && String(n) !== ''
      } else if (tipo === 'sim_nao') {
        preenchida = r.get('resposta_bool') !== undefined && r.get('resposta_bool') !== null
      } else {
        preenchida = String(r.get('resposta_texto') || '').trim() !== ''
      }
    }
    if (!preenchida) pendentes.push(String(p.get('texto') || p.id))
  }

  if (pendentes.length === 0) {
    return e.next()
  }

  // T2.15/CA-2-010: tentativa negada gera evento append-only na auditoria
  // (ator, data, etapa anterior, etapa tentada e motivo da negativa).
  try {
    const actor = e.auth
    if (actor) {
      const audit = $app.findCollectionByNameOrId('auditoria')
      const event = new Record(audit)
      event.set('entidade', 'negocios')
      event.set('registro_id', e.record.id)
      event.set('acao', 'negado')
      event.set('ator_id', actor.id)
      event.set('ocorrido_em', new Date().toISOString())
      event.set('estado_anterior', JSON.stringify({ estagio: etapaAntes }))
      event.set(
        'estado_posterior',
        JSON.stringify({
          estagio_tentado: etapaNova,
          motivo:
            'Avanço bloqueado: ' + pendentes.length + ' pergunta(s) obrigatória(s) sem resposta.',
        }),
      )
      $app.save(event)
    }
  } catch (auditErr) {
    $app.logger().error('Falha ao registrar tentativa negada', 'error', String(auditErr))
  }

  // Responde 400 SEM chamar e.next(): a transação do save nunca abre, então
  // o evento 'negado' gravado acima não é revertido por rollback.
  return e.json(400, {
    message:
      'Avanço bloqueado: ' +
      pendentes.length +
      ' pergunta(s) obrigatória(s) sem resposta (' +
      pendentes.join('; ') +
      '). Um administrador pode liberar por exceção com motivo e validade.',
  })
}, 'negocios')
