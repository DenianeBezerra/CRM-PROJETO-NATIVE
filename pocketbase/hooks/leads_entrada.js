// T3.07 — Porta 1: formulário de ENTRADA público (SPEC-3-006).
// Endpoints:
//   GET  /backend/v1/entrada/publico                      — config pública (LGPD)
//   POST /backend/v1/entrada/publico                      — envio público (1x)
//   GET  /backend/v1/entrada/leads?temperatura=&limit=    — lista interna (auth)
//   POST /backend/v1/entrada/leads/{id}/vincular          — cria oportunidade (auth)
// Regras: honeypot; tempo mínimo 20s; limite por IP/hora (config, padrão 3);
// dedup por e-mail (negócio aberto <90 dias → evento no negócio existente);
// score 0–92 server-side → temperatura (quente ≥60, morno 35–59, frio <35);
// consentimento LGPD obrigatório com data/versão; auditoria; append-only.
// Runtime goja: lógica inline nos callbacks (AP-0200); query via
// e.request.url.query() (AP-0810); datas PB " " → "T"; 0001-01-01 = ausente.
routerAdd('GET', '/backend/v1/entrada/publico', (e) => {
  return e.json(200, {
    consentimento_versao: 'LGPD-V1-2026-09',
    consentimento_texto:
      'Autorizo a Vibratto a usar estas informações para entrar em contato e preparar uma proposta, conforme a LGPD.',
  })
})

routerAdd('POST', '/backend/v1/entrada/publico', (e) => {
  var body = e.requestInfo().body || {}
  // Honeypot: campo escondido preenchido = bot (resposta 200 silenciosa).
  if (String(body.website || '').trim() !== '') {
    return e.json(200, { ok: true })
  }
  // Tempo mínimo de preenchimento (20s entre load e envio, informado pelo front).
  var decorrido = Number(body.tempo_segundos)
  if (!Number.isFinite(decorrido) || decorrido < 20) {
    return e.json(400, { error: 'Envio muito rápido. Preencha o formulário com calma.' })
  }
  var nome = String(body.nome || '').trim()
  var email = String(body.email || '')
    .trim()
    .toLowerCase()
  var whatsapp = String(body.whatsapp || '').trim()
  var cnpj = String(body.cnpj || '').replace(/\D/g, '')
  var dor = String(body.dor_principal || '').trim()
  if (nome.length < 2 || nome.length > 200) {
    return e.json(400, { error: 'Informe seu nome.' })
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return e.json(400, { error: 'Informe um e-mail válido.' })
  }
  if (whatsapp.replace(/\D/g, '').length < 10) {
    return e.json(400, { error: 'Informe um WhatsApp válido com DDD.' })
  }
  if (cnpj && cnpj.length !== 14) {
    return e.json(400, { error: 'CNPJ deve ter 14 dígitos.' })
  }
  var DORES = [
    'caixa_sem_previsibilidade',
    'rotina_financeira_atrasada',
    'informacao_confavel_falta',
    'custo_alto_sem_controle',
    'crescimento_sem_estrutura',
    'outro',
  ]
  var dorOk = false
  for (var di = 0; di < DORES.length; di++) if (DORES[di] === dor) dorOk = true
  if (!dorOk) return e.json(400, { error: 'Selecione a dor principal.' })
  if (body.consentimento_lgpd !== true) {
    return e.json(400, { error: 'O consentimento LGPD é obrigatório para enviar.' })
  }
  // Rate limit por IP/hora (config limite_entrada_por_ip_hora, padrão 3).
  // IP: realIp() → X-Forwarded-For (proxy/ingress) → 'desconhecido'.
  // Sem IP identificável o limite NÃO bloqueia (fail-open, registrado em log) —
  // evita bloquear todos os visitantes atrás de um único proxy.
  var ip = ''
  try {
    ip = String(e.realIp() || '').trim()
  } catch (_) {
    ip = ''
  }
  if (!ip) {
    try {
      ip = String(e.request.getHeader('X-Forwarded-For') || '')
        .split(',')[0]
        .trim()
    } catch (_) {
      ip = ''
    }
  }
  var ipKey = ip || 'desconhecido'
  var limite = 3
  try {
    var cfgs = $app.findRecordsByFilter(
      'configuracoes_operacionais',
      "chave = 'limite_entrada_por_ip_hora'",
      '',
      1,
      0,
    )
    if (cfgs.length > 0) {
      var v = Number(cfgs[0].get('valor_numero'))
      if (Number.isFinite(v) && v >= 1) limite = v
    }
  } catch (_) {}
  if (ipKey !== 'desconhecido') {
    try {
      var umaHoraAtras = new Date(Date.now() - 3600000).toISOString().replace('T', ' ')
      var recentes = $app.findRecordsByFilter(
        'leads_entrada',
        'ip = {:ip} && created > {:desde}',
        '-created',
        100,
        0,
        { ip: ipKey, desde: umaHoraAtras },
      )
      if (recentes.length >= limite) {
        return e.json(429, { error: 'Muitos envios deste endereço. Tente novamente mais tarde.' })
      }
    } catch (errLim) {
      $app.logger().warn('T307 rate limit falhou (fail-open)', 'err', String(errLim))
    }
  } else {
    $app.logger().warn('T307 envio sem IP identificável — limite não aplicado neste envio')
  }

  var col
  try {
    col = $app.findCollectionByNameOrId('leads_entrada')
  } catch (err) {
    return e.json(500, { error: 'Formulário de entrada indisponível.' })
  }

  // ---- Score server-side 0–92 ----
  var score = 0
  if (body.eh_decisor === true) score += 15
  var fat = String(body.faturamento_faixa || '')
  if (fat === '500k_2m') score += 15
  else if (fat === '2m_10m') score += 20
  else if (fat === 'acima_10m') score += 20
  else if (fat === '100k_500k') score += 8
  var qtd = Number(body.qtd_cnpjs)
  if (Number.isFinite(qtd) && qtd >= 2) score += 8
  var colab = Number(body.colaboradores)
  if (Number.isFinite(colab) && colab >= 5) score += 7
  var reg = String(body.regime_tributario || '')
  if (reg === 'simples' || reg === 'presumido' || reg === 'real') score += 5
  if (String(body.erp_atual || '').trim() !== '') score += 5
  if (dor === 'caixa_sem_previsibilidade' || dor === 'crescimento_sem_estrutura') score += 12
  else score += 6
  var urg = String(body.urgencia || '')
  if (urg === 'imediata') score += 15
  else if (urg === 'este_trimestre') score += 10
  else if (urg === 'este_ano') score += 5
  if (String(body.sonho_12m || '').trim().length >= 20) score += 5
  if (score > 92) score = 92
  var temperatura = score >= 60 ? 'quente' : score >= 35 ? 'morno' : 'frio'

  // ---- Dedup por e-mail: negócio ativo cujo contato tem este e-mail (<90 dias) ----
  var negocioVinculado = ''
  var dedupEvento = false
  try {
    var contatos = $app.findRecordsByFilter(
      'clientes',
      'email = {:em} && email != ""',
      '-created',
      5,
      0,
      {
        em: email,
      },
    )
    for (var ci = 0; ci < contatos.length; ci++) {
      var ns = $app.findRecordsByFilter(
        'negocios',
        'cliente = {:c} && arquivado != true && estagio != "fechado_ganho" && estagio != "fechado_perdido"',
        '-created',
        5,
        0,
        { c: contatos[ci].id },
      )
      for (var ni = 0; ni < ns.length; ni++) {
        var criado = String(ns[ni].get('created') || '')
        var ms = Date.parse(criado.replace(' ', 'T'))
        if (!isNaN(ms) && Date.now() - ms < 90 * 86400000) {
          negocioVinculado = ns[ni].id
          dedupEvento = true
          break
        }
      }
      if (negocioVinculado) break
    }
  } catch (_) {}

  var token = ''
  var TOKEN_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  for (var ti = 0; ti < 48; ti++) {
    token += TOKEN_CHARS.charAt(Math.floor(Math.random() * TOKEN_CHARS.length))
  }

  var regLead = new Record(col)
  regLead.set('token', token)
  regLead.set('nome', nome)
  regLead.set('email', email)
  regLead.set('whatsapp', whatsapp)
  regLead.set('eh_decisor', body.eh_decisor === true)
  if (cnpj) regLead.set('cnpj', cnpj)
  if (String(body.empresa_razao || '').trim())
    regLead.set('empresa_razao', String(body.empresa_razao).trim().slice(0, 200))
  if (fat) regLead.set('faturamento_faixa', fat)
  if (Number.isFinite(qtd)) regLead.set('qtd_cnpjs', qtd)
  if (Number.isFinite(colab)) regLead.set('colaboradores', colab)
  if (reg) regLead.set('regime_tributario', reg)
  if (String(body.erp_atual || '').trim())
    regLead.set('erp_atual', String(body.erp_atual).trim().slice(0, 120))
  if (String(body.quem_cuida_financeiro || '').trim())
    regLead.set('quem_cuida_financeiro', String(body.quem_cuida_financeiro).trim().slice(0, 200))
  regLead.set('dor_principal', dor)
  if (String(body.dores_secundarias || '').trim())
    regLead.set('dores_secundarias', String(body.dores_secundarias).trim().slice(0, 1000))
  if (String(body.relato || '').trim())
    regLead.set('relato', String(body.relato).trim().slice(0, 5000))
  if (urg) regLead.set('urgencia', urg)
  if (String(body.sonho_12m || '').trim())
    regLead.set('sonho_12m', String(body.sonho_12m).trim().slice(0, 2000))
  regLead.set('score', score)
  regLead.set('temperatura', temperatura)
  var utm = {}
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
  for (var ui = 0; ui < UTM_KEYS.length; ui++) {
    var uv = String(body[UTM_KEYS[ui]] || '').trim()
    if (uv) utm[UTM_KEYS[ui]] = uv.slice(0, 200)
  }
  regLead.set('utm', JSON.stringify(utm))
  if (String(body.origem_declarada || '').trim())
    regLead.set('origem_declarada', String(body.origem_declarada).trim().slice(0, 200))
  regLead.set('ip', ip)
  regLead.set('consentimento_lgpd', true)
  regLead.set(
    'consentimento_versao',
    String(body.consentimento_versao || 'LGPD-V1-2026-09').slice(0, 40),
  )
  regLead.set('consentimento_data', new Date().toISOString())
  regLead.set('optin_marketing', body.optin_marketing === true)
  if (negocioVinculado) {
    regLead.set('negocio', negocioVinculado)
    regLead.set('status', 'vinculado')
  } else {
    regLead.set('status', 'novo')
  }
  regLead.set(
    'trilha',
    JSON.stringify([
      {
        evento: dedupEvento ? 'reenvio_dedup' : 'recebido',
        quando: new Date().toISOString(),
        detalhe: 'score ' + score + ' · ' + temperatura,
      },
    ]),
  )
  try {
    $app.save(regLead)
  } catch (err) {
    return e.json(400, { error: 'Falha ao registrar: ' + String(err) })
  }

  // Auditoria (snapshot mínimo — sem conteúdo do relato).
  try {
    var audit = $app.findCollectionByNameOrId('auditoria')
    var ev = new Record(audit)
    ev.set('entidade', 'leads_entrada')
    ev.set('registro_id', regLead.id)
    ev.set('acao', 'create')
    ev.set('ator_id', '')
    ev.set('ocorrido_em', new Date().toISOString())
    ev.set('estado_anterior', '')
    ev.set(
      'estado_posterior',
      JSON.stringify({
        temperatura: temperatura,
        score: score,
        dedup: dedupEvento,
        negocio: negocioVinculado,
      }),
    )
    $app.save(ev)
  } catch (err) {
    $app.logger().error('T307 auditoria falhou', 'err', String(err))
  }

  // Dedup: reenvio vira evento no negócio existente (trilha da oportunidade).
  if (dedupEvento && negocioVinculado) {
    try {
      var negocio = $app.findRecordById('negocios', negocioVinculado)
      negocio.set(
        'observacoes',
        String(negocio.get('observacoes') || '') +
          '\n[entrada ' +
          new Date().toISOString().slice(0, 10) +
          '] Reenvio do formulário de entrada (lead já em negociação).',
      )
      $app.save(negocio)
    } catch (_) {}
  }

  $app.logger().info('T307 lead entrada', 'lead', regLead.id, 'temperatura', temperatura)
  return e.json(200, { ok: true, temperatura: temperatura, dedup: dedupEvento })
})

// Lista interna (auth) — leitura explícita, filtros por temperatura.
routerAdd('GET', '/backend/v1/entrada/leads', (e) => {
  var actor = e.auth
  if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
  var temperatura = String(e.request.url.query().get('temperatura') || '').trim()
  var filtro = ''
  if (temperatura === 'quente' || temperatura === 'morno' || temperatura === 'frio') {
    filtro = 'temperatura = "' + temperatura + '"'
  }
  var regs
  try {
    regs = filtro
      ? $app.findRecordsByFilter('leads_entrada', filtro, '-created', 200, 0)
      : $app.findRecordsByFilter('leads_entrada', '', '-created', 200, 0)
  } catch (_) {
    regs = []
  }
  var itens = []
  for (var i = 0; i < regs.length; i++) {
    var r = regs[i]
    itens.push({
      id: r.id,
      nome: String(r.get('nome') || ''),
      email: String(r.get('email') || ''),
      whatsapp: String(r.get('whatsapp') || ''),
      cnpj: String(r.get('cnpj') || ''),
      empresa_razao: String(r.get('empresa_razao') || ''),
      dor_principal: String(r.get('dor_principal') || ''),
      urgencia: String(r.get('urgencia') || ''),
      sonho_12m: String(r.get('sonho_12m') || ''),
      score: r.get('score'),
      temperatura: String(r.get('temperatura') || ''),
      status: String(r.get('status') || ''),
      negocio: String(r.get('negocio') || ''),
      created: String(r.get('created') || ''),
    })
  }
  return e.json(200, { total: itens.length, leads: itens })
})

// Vincular: cria contato + oportunidade a partir do lead (auth).
// A oportunidade nasce SAUDÁVEL: responsável = ator, próxima ação futura (7 dias).
routerAdd('POST', '/backend/v1/entrada/leads/{id}/vincular', (e) => {
  var actor = e.auth
  if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
  var leadId = e.request.pathValue('id')
  var lead
  try {
    lead = $app.findRecordById('leads_entrada', leadId)
  } catch (_) {
    return e.json(404, { error: 'Lead não encontrado.' })
  }
  if (String(lead.get('negocio') || '')) {
    return e.json(400, { error: 'Este lead já está vinculado a uma oportunidade.' })
  }
  var body = e.requestInfo().body || {}
  var servico = String(body.servico || 'bpo_financeiro').trim()
  var SERVICOS = ['bpo_financeiro', 'tesouraria', 'controladoria', 'cfo_as_a_service', 'outro']
  var servicoOk = false
  for (var si = 0; si < SERVICOS.length; si++) if (SERVICOS[si] === servico) servicoOk = true
  if (!servicoOk) return e.json(400, { error: 'Serviço inválido.' })

  // Contato: reusa se o e-mail já existe (dedup), senão cria.
  var contatoId = ''
  try {
    var existentes = $app.findRecordsByFilter(
      'clientes',
      'email = {:em} && email != ""',
      '-created',
      1,
      0,
      { em: String(lead.get('email') || '') },
    )
    if (existentes.length > 0) contatoId = existentes[0].id
  } catch (_) {}
  if (!contatoId) {
    var colCli
    try {
      colCli = $app.findCollectionByNameOrId('clientes')
    } catch (err) {
      return e.json(500, { error: 'Coleção de contatos indisponível.' })
    }
    var cli = new Record(colCli)
    cli.set('nome', String(lead.get('nome') || ''))
    cli.set('email', String(lead.get('email') || ''))
    cli.set('telefone', String(lead.get('whatsapp') || ''))
    try {
      $app.save(cli)
      contatoId = cli.id
    } catch (err) {
      return e.json(400, { error: 'Falha ao criar contato: ' + String(err) })
    }
  }

  var colNeg
  try {
    colNeg = $app.findCollectionByNameOrId('negocios')
  } catch (err) {
    return e.json(500, { error: 'Coleção de oportunidades indisponível.' })
  }
  var primeiraEtapa = ''
  try {
    var etapas = $app.findRecordsByFilter('etapas_negocio', 'ativa = true', 'ordem', 1, 0)
    if (etapas.length > 0) primeiraEtapa = String(etapas[0].get('chave') || '')
  } catch (_) {}
  if (!primeiraEtapa) return e.json(500, { error: 'Nenhuma etapa ativa configurada.' })

  var neg = new Record(colNeg)
  neg.set('titulo', String(lead.get('nome') || '') + ' — entrada')
  neg.set('cliente', contatoId)
  neg.set('estagio', primeiraEtapa)
  neg.set('servico', servico)
  neg.set('responsavel', actor.id)
  neg.set('proxima_acao_descricao', 'Primeiro contato com o lead da entrada')
  neg.set('proxima_acao_em', new Date(Date.now() + 7 * 86400000).toISOString())
  neg.set('entrada_origem', 'formulario_entrada')
  var canal = 'outro'
  var utm = {}
  try {
    utm = JSON.parse(String(lead.get('utm') || '{}'))
  } catch (_) {}
  var src = String(utm.utm_source || lead.get('origem_declarada') || '').toLowerCase()
  if (src.indexOf('insta') >= 0) canal = 'instagram'
  else if (src.indexOf('linked') >= 0) canal = 'linkedin'
  else if (src.indexOf('google') >= 0) canal = 'google'
  else if (src.indexOf('site') >= 0 || src.indexOf('pag') >= 0) canal = 'site'
  else if (src.indexOf('whats') >= 0) canal = 'whatsapp'
  neg.set('canal', canal)
  neg.set('origem_especifica', String(lead.get('origem_declarada') || '').slice(0, 200))
  neg.set('dados_formulario', JSON.stringify({ origem: 'formulario_entrada', lead: lead.id }))
  try {
    $app.save(neg)
  } catch (err) {
    return e.json(400, { error: 'Falha ao criar oportunidade: ' + String(err) })
  }
  lead.set('negocio', neg.id)
  lead.set('status', 'vinculado')
  var lista = []
  try {
    lista = JSON.parse(String(lead.get('trilha') || '[]'))
  } catch (_) {
    lista = []
  }
  if (!Array.isArray(lista)) lista = []
  lista.push({
    evento: 'vinculado',
    quando: new Date().toISOString(),
    detalhe: 'oportunidade ' + neg.id + ' por ' + actor.id,
  })
  lead.set('trilha', JSON.stringify(lista))
  try {
    $app.save(lead)
  } catch (err) {
    return e.json(400, { error: 'Falha ao vincular lead: ' + String(err) })
  }
  try {
    var audit = $app.findCollectionByNameOrId('auditoria')
    var ev = new Record(audit)
    ev.set('entidade', 'leads_entrada')
    ev.set('registro_id', lead.id)
    ev.set('acao', 'update')
    ev.set('ator_id', actor.id)
    ev.set('ocorrido_em', new Date().toISOString())
    ev.set('estado_anterior', '')
    ev.set('estado_posterior', JSON.stringify({ vinculado_a: neg.id }))
    $app.save(ev)
  } catch (err) {
    $app.logger().error('T307 auditoria vínculo falhou', 'err', String(err))
  }
  return e.json(200, { ok: true, negocio: neg.id, contato: contatoId })
})
