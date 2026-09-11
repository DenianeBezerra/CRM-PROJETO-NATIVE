// T2.13 — CA-2-008: operador não avança com campo obrigatório vazio;
// administrador libera por exceção com motivo, validade e auditoria.
//
// Regra server-side (model hook onRecordUpdate em negocios):
// - se a etapa está avançando (ordem da nova etapa > ordem da atual) e
//   existem perguntas obrigatórias aplicáveis à NOVA etapa sem resposta →
//   bloqueia, listando as pendências;
// - exceção vigente (não expirada) para o negócio libera o avanço;
// - voltar de etapa ou mover para etapa final (fechado_*) não é bloqueado
//   aqui (fechamento tem regras próprias — outcome_rules/comercial_fields).
//
// Lições JSVM aplicadas: sem bind params {:x} (interpolação direta de IDs),
// findFirstRecordByFilter sem sort, datas comparadas por Date.parse.

onRecordUpdate((e) => {
  const etapaNova = String(e.record.get('estagio') || '').trim()
  const etapaAntes = String(e.record.original().get('estagio') || '').trim()

  // Só interessa quando a etapa está mudando.
  if (!etapaNova || etapaNova === etapaAntes) {
    e.next()
    return
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
    e.next()
    return
  }

  // Perguntas obrigatórias ativas aplicáveis à etapa ATUAL (a que está sendo
  // deixada) ou a todas — sair da etapa sem respondê-las é o avanço bloqueado.
  let perguntas = []
  try {
    perguntas = $app.findRecordsByFilter('perguntas_qualificacao', 'ativa = true', 'ordem', 500, 0)
  } catch (err) {
    $app.logger().error('Falha ao consultar perguntas (avanço)', 'error', String(err))
    throw new Error('Falha ao validar o avanço de etapa.')
  }
  const aplicaveis = perguntas.filter(function (p) {
    const a = String(p.get('aplicavel_a') || 'todas')
    return !!p.get('obrigatoria') && (a === 'todas' || a === etapaAntes)
  })

  if (aplicaveis.length === 0) {
    e.next()
    return
  }

  let respostas = []
  try {
    respostas = $app.findRecordsByFilter(
      'respostas_qualificacao',
      'negocio = "' + e.record.id + '"',
      '-created',
      500,
      0,
    )
  } catch (_) {
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
    e.next()
    return
  }

  // Exceção vigente (não expirada) libera o avanço.
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
    $app.logger().error('Falha ao consultar exceções (avanço)', 'error', String(err))
    excecoes = []
  }
  const agora = Date.now()
  for (let i = 0; i < excecoes.length; i++) {
    const validade = Date.parse(String(excecoes[i].get('validade') || ''))
    if (!isNaN(validade) && validade >= agora) {
      e.next()
      return
    }
  }
  $app
    .logger()
    .error(
      'Avanço bloqueado (diagnóstico)',
      'excecoes',
      String(excecoes.length),
      'etapaAntes',
      etapaAntes,
      'etapaNova',
      etapaNova,
    )

  throw new Error(
    'Avanço bloqueado: ' +
      pendentes.length +
      ' pergunta(s) obrigatória(s) sem resposta (' +
      pendentes.join('; ') +
      '). Um administrador pode liberar por exceção com motivo e validade.',
  )
}, 'negocios')
