// T3.02 — CA-3-002/003/004/005: formulários inteligentes por solução.
// Endpoints:
//   POST /backend/v1/formularios/gerar        (auth) — cria registro com token
//   POST /backend/v1/formularios/{id}/enviar  (auth) — marca enviado
//   GET  /backend/v1/formularios/publico/{token}      — leitura pública por token
//   POST /backend/v1/formularios/publico/{token}      — resposta pública (1x)
// Regras: token 48 chars; resposta única; consentimento LGPD obrigatório;
// oportunidade atualizada com contexto estruturado (nunca campos comerciais);
// trilha append-only no próprio registro + auditoria CRM.
// Lições JSVM: atribuição direta; finders em try/catch; datas sem Z duplicado;
// JSON lido com JSON.parse(String(raw)).
var T302_SOLUCOES = ['bpo_financeiro', 'cfo_as_a_service', 'consultoria']
var T302_TOKEN_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function t302NovoToken() {
  var s = ''
  for (var i = 0; i < 48; i++) {
    s += T302_TOKEN_CHARS.charAt(Math.floor(Math.random() * T302_TOKEN_CHARS.length))
  }
  return s
}

function t302Trilha(reg, evento, detalhe) {
  var lista = []
  try {
    var raw = reg.get('trilha')
    lista = JSON.parse(typeof raw === 'string' ? raw : String(raw || '[]'))
  } catch (_) {
    lista = []
  }
  if (!Array.isArray(lista)) lista = []
  lista.push({ evento: evento, quando: new Date().toISOString(), detalhe: detalhe || '' })
  reg.set('trilha', JSON.stringify(lista))
}

function t302Auditar(entidade, registroId, acao, atorId, estado) {
  try {
    var audit = $app.findCollectionByNameOrId('auditoria')
    var ev = new Record(audit)
    ev.set('entidade', entidade)
    ev.set('registro_id', registroId)
    ev.set('acao', acao)
    ev.set('ator_id', atorId || '')
    ev.set('ocorrido_em', new Date().toISOString())
    ev.set('estado_anterior', '')
    ev.set('estado_posterior', JSON.stringify(estado || {}))
    $app.save(ev)
  } catch (err) {
    $app.logger().error('T302 auditoria falhou', 'err', String(err))
  }
}

function t302Resumo(solucao, r) {
  var linhas = []
  if (solucao === 'bpo_financeiro') {
    linhas.push(
      'PERFIL: ' +
        String(r.empresa_nome || '') +
        ' · CNPJ ' +
        String(r.cnpj || 'n/i') +
        ' · ' +
        String(r.regime_tributario || 'regime n/i') +
        ' · ' +
        String(r.funcionarios || '?') +
        ' funcionários · ' +
        String(r.socios || '?') +
        ' sócios',
    )
    linhas.push(
      'VOLUME: ' +
        String(r.pagamentos_mes || '?') +
        ' pagamentos/mês · ' +
        String(r.recebimentos_mes || '?') +
        ' recebimentos/mês',
    )
    linhas.push(
      'COMPLEXIDADE: bancos ' +
        String(r.bancos || 'n/i') +
        ' · câmbio ' +
        (r.cambio ? 'sim' : 'não') +
        ' · receitas: ' +
        String(r.tipos_receita || 'n/i'),
    )
    linhas.push('DORES (financeiro): ' + String(r.desafios_financeiro || 'n/i'))
    linhas.push('DORES (negócio): ' + String(r.desafios_negocio || 'n/i'))
    linhas.push('ENDIVIDAMENTO: ' + String(r.endividamento || 'n/i'))
    linhas.push('OBJETIVO 12m: ' + String(r.objetivo_12m || 'n/i'))
  } else if (solucao === 'cfo_as_a_service') {
    linhas.push('DECISÕES HOJE: ' + String(r.decisoes_hoje || 'n/i'))
    linhas.push(
      'ORÇAMENTO: ' +
        (r.orcamento ? 'sim' : 'não') +
        ' · FLUXO PROJETADO: ' +
        (r.fluxo_projetado ? 'sim' : 'não') +
        ' · DRE: ' +
        (r.dre ? 'sim' : 'não'),
    )
    linhas.push(
      'INDICADORES: ' +
        String(r.indicadores || 'n/i') +
        ' · frequência: ' +
        String(r.frequencia_analise || 'n/i'),
    )
    linhas.push('DECISÕES TRAVADAS: ' + String(r.decisoes_travadas || 'n/i'))
    linhas.push('OBJETIVOS 6/12/24m: ' + String(r.objetivos || 'n/i'))
    linhas.push('PARTICIPAÇÃO ESPERADA DO CFO: ' + String(r.participacao_cfo || 'n/i'))
  } else {
    linhas.push('PROBLEMA: ' + String(r.problema || 'n/i'))
    linhas.push('IMPACTO: ' + String(r.impacto || 'n/i'))
    linhas.push('JÁ TENTADO: ' + String(r.ja_tentado || 'n/i'))
    linhas.push(
      'RESULTADO ESPERADO: ' +
        String(r.resultado_esperado || 'n/i') +
        ' · PRAZO: ' +
        String(r.prazo || 'n/i'),
    )
    linhas.push(
      'ENVOLVIDOS: ' +
        String(r.envolvidos || 'n/i') +
        ' · SUCESSO: ' +
        String(r.criterio_sucesso || 'n/i'),
    )
    linhas.push('RESTRIÇÕES: ' + String(r.restricoes || 'n/i'))
  }
  return linhas.join('\n')
}

function t302Contexto(solucao, r) {
  var ctx = { solucao: solucao, preenchido_em: new Date().toISOString() }
  if (solucao === 'bpo_financeiro') {
    ctx.perfil = {
      cnpj: r.cnpj || '',
      regime_tributario: r.regime_tributario || '',
      funcionarios: r.funcionarios || null,
      socios: r.socios || null,
      modelo_societario: r.modelo_societario || '',
    }
    ctx.volume = {
      pagamentos_mes: r.pagamentos_mes || null,
      recebimentos_mes: r.recebimentos_mes || null,
    }
    ctx.complexidade = {
      bancos: r.bancos || '',
      cambio: !!r.cambio,
      tipos_receita: r.tipos_receita || '',
      fornecedores: r.fornecedores || '',
    }
    ctx.dores = { financeiro: r.desafios_financeiro || '', negocio: r.desafios_negocio || '' }
    ctx.endividamento = r.endividamento || ''
    ctx.objetivos = { objetivo_12m: r.objetivo_12m || '' }
    ctx.urgencia = { origem_contato: r.origem_contato || '' }
  } else if (solucao === 'cfo_as_a_service') {
    ctx.perfil = {}
    ctx.gestao = {
      decisoes_hoje: r.decisoes_hoje || '',
      orcamento: !!r.orcamento,
      fluxo_projetado: !!r.fluxo_projetado,
      dre: !!r.dre,
      indicadores: r.indicadores || '',
      frequencia_analise: r.frequencia_analise || '',
    }
    ctx.dores = { decisoes_travadas: r.decisoes_travadas || '' }
    ctx.objetivos = { objetivos_6_12_24m: r.objetivos || '' }
    ctx.urgencia = { participacao_cfo: r.participacao_cfo || '' }
  } else {
    ctx.perfil = {}
    ctx.dores = {
      problema: r.problema || '',
      impacto: r.impacto || '',
      ja_tentado: r.ja_tentado || '',
    }
    ctx.objetivos = {
      resultado_esperado: r.resultado_esperado || '',
      criterio_sucesso: r.criterio_sucesso || '',
    }
    ctx.urgencia = { prazo: r.prazo || '', envolvidos: r.envolvidos || '' }
    ctx.restricoes = r.restricoes || ''
  }
  return ctx
}

routerAdd(
  'POST',
  '/backend/v1/formularios/gerar',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var body = e.requestInfo().body || {}
    var negocioId = String(body.negocio || '').trim()
    var solucao = String(body.solucao || '').trim()
    if (!negocioId) return e.json(400, { error: 'Informe a oportunidade.' })
    if (T302_SOLUCOES.indexOf(solucao) < 0) {
      return e.json(400, {
        error: 'Solução inválida. Use bpo_financeiro, cfo_as_a_service ou consultoria.',
      })
    }
    var negocio
    try {
      negocio = $app.findRecordById('negocios', negocioId)
    } catch (_) {
      return e.json(404, { error: 'Oportunidade não encontrada.' })
    }
    var col
    try {
      col = $app.findCollectionByNameOrId('formularios')
    } catch (err) {
      return e.json(500, { error: 'Coleção de formulários indisponível.' })
    }
    var reg = new Record(col)
    var token = t302NovoToken()
    reg.set('token', token)
    reg.set('negocio', negocioId)
    reg.set('contato', negocio.get('cliente') || '')
    reg.set('empresa', negocio.get('empresa') || '')
    reg.set('solucao', solucao)
    reg.set('status', 'gerado')
    reg.set('respostas', JSON.stringify({}))
    reg.set('resumo', '')
    reg.set('gerado_por', actor.id)
    reg.set('consentimento_lgpd', false)
    reg.set('consentimento_versao', '')
    t302Trilha(reg, 'gerado', 'por ' + actor.id)
    try {
      $app.save(reg)
    } catch (err) {
      return e.json(400, { error: 'Falha ao gerar formulário: ' + String(err) })
    }
    t302Auditar('formularios', reg.id, 'create', actor.id, {
      solucao: solucao,
      negocio: negocioId,
      status: 'gerado',
    })
    try {
      negocio.set('formulario_status', 'gerado')
      $app.save(negocio)
    } catch (_) {}
    $app
      .logger()
      .info(
        'T302 formulario gerado',
        'formulario',
        reg.id,
        'negocio',
        negocioId,
        'solucao',
        solucao,
      )
    return e.json(200, { ok: true, id: reg.id, token: token, solucao: solucao, status: 'gerado' })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/formularios/{id}/enviar',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var id = e.request.pathValue('id')
    var reg
    try {
      reg = $app.findRecordById('formularios', id)
    } catch (_) {
      return e.json(404, { error: 'Formulário não encontrado.' })
    }
    var status = String(reg.get('status') || '')
    if (status !== 'gerado') {
      return e.json(400, {
        error: 'Só formulário em "gerado" pode ser marcado como enviado (atual: ' + status + ').',
      })
    }
    reg.set('status', 'enviado')
    reg.set('enviado_em', new Date().toISOString().replace('T', ' '))
    t302Trilha(reg, 'enviado', 'por ' + actor.id)
    try {
      $app.save(reg)
    } catch (err) {
      return e.json(400, { error: 'Falha ao registrar envio: ' + String(err) })
    }
    t302Auditar('formularios', reg.id, 'update', actor.id, { status: 'enviado' })
    try {
      var negocio = $app.findRecordById('negocios', String(reg.get('negocio') || ''))
      negocio.set('formulario_status', 'enviado')
      $app.save(negocio)
    } catch (_) {}
    return e.json(200, { ok: true, status: 'enviado' })
  },
  $apis.requireAuth(),
)

routerAdd('GET', '/backend/v1/formularios/publico/{token}', (e) => {
  var token = e.request.pathValue('token')
  if (token.length < 32) return e.json(404, { error: 'Formulário não encontrado.' })
  var regs
  try {
    regs = $app.findRecordsByFilter('formularios', 'token = {:t}', '-created', 1, 0, { t: token })
  } catch (_) {
    regs = []
  }
  if (regs.length === 0) return e.json(404, { error: 'Formulário não encontrado.' })
  var reg = regs[0]
  var status = String(reg.get('status') || '')
  if (status === 'respondido') {
    return e.json(409, { error: 'Este formulário já foi respondido. Obrigado!' })
  }
  if (status === 'expirado') {
    return e.json(409, { error: 'Este formulário expirou. Fale com a Vibratto.' })
  }
  var negocioNome = ''
  var contatoNome = ''
  try {
    negocioNome = String(
      $app.findRecordById('negocios', String(reg.get('negocio') || '')).get('titulo') || '',
    )
  } catch (_) {}
  try {
    contatoNome = String(
      $app.findRecordById('clientes', String(reg.get('contato') || '')).get('nome') || '',
    )
  } catch (_) {}
  return e.json(200, {
    solucao: String(reg.get('solucao') || ''),
    status: status,
    negocio_nome: negocioNome,
    contato_nome: contatoNome,
    consentimento_versao: 'LGPD-V1-2026-09',
  })
})

routerAdd('POST', '/backend/v1/formularios/publico/{token}', (e) => {
  var token = e.request.pathValue('token')
  if (token.length < 32) return e.json(404, { error: 'Formulário não encontrado.' })
  var regs
  try {
    regs = $app.findRecordsByFilter('formularios', 'token = {:t}', '-created', 1, 0, { t: token })
  } catch (_) {
    regs = []
  }
  if (regs.length === 0) return e.json(404, { error: 'Formulário não encontrado.' })
  var reg = regs[0]
  var status = String(reg.get('status') || '')
  if (status === 'respondido') {
    return e.json(409, { error: 'Este formulário já foi respondido.' })
  }
  if (status === 'expirado') {
    return e.json(409, { error: 'Este formulário expirou.' })
  }
  var body = e.requestInfo().body || {}
  var respostas = body.respostas
  if (!respostas || typeof respostas !== 'object') {
    return e.json(400, { error: 'Respostas ausentes.' })
  }
  if (body.consentimento_lgpd !== true) {
    return e.json(400, { error: 'O consentimento LGPD é obrigatório para enviar as respostas.' })
  }
  var solucao = String(reg.get('solucao') || '')
  var r = {}
  for (var k in respostas) {
    if (Object.prototype.hasOwnProperty.call(respostas, k)) {
      r[k] = typeof respostas[k] === 'string' ? String(respostas[k]).slice(0, 5000) : respostas[k]
    }
  }
  // CA-3-004: consentimento registrado com data e versão.
  reg.set('consentimento_lgpd', true)
  reg.set(
    'consentimento_versao',
    String(body.consentimento_versao || 'LGPD-V1-2026-09').slice(0, 40),
  )
  reg.set('respostas', JSON.stringify(r))
  reg.set('resumo', t302Resumo(solucao, r))
  reg.set('status', 'respondido')
  reg.set('respondido_em', new Date().toISOString().replace('T', ' '))
  t302Trilha(reg, 'respondido', 'resposta pública (token)')
  try {
    $app.save(reg)
  } catch (err) {
    return e.json(400, { error: 'Falha ao registrar respostas: ' + String(err) })
  }
  t302Auditar('formularios', reg.id, 'update', '', { status: 'respondido', via: 'publico' })
  // CA-3-003: atualização automática da oportunidade — só contexto, nunca campos comerciais.
  var negocioId = String(reg.get('negocio') || '')
  if (negocioId) {
    try {
      var negocio = $app.findRecordById('negocios', negocioId)
      negocio.set('dados_formulario', JSON.stringify(t302Contexto(solucao, r)))
      negocio.set('formulario_resumo', reg.get('resumo'))
      negocio.set('formulario_status', 'respondido')
      $app.save(negocio)
    } catch (err) {
      $app.logger().error('T302 falha ao atualizar oportunidade', 'err', String(err))
    }
  }
  $app.logger().info('T302 formulario respondido', 'formulario', reg.id)
  return e.json(200, { ok: true, status: 'respondido' })
})
