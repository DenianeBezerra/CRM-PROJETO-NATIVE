// T3.22 — SPEC-3-022 (tipo 1): importador de clientes ativos por planilha.
// Pré-visualização é BLOQUEIO (CA-3-116): gravação só com confirm=true.
// Migração: entrada_origem='migracao' — fora de conversão/ciclo/origem; entra só no MRR (CA-3-115).
// Múltiplos serviços: um negócio por serviço, valor próprio (CA-3-117).
// RBAC: admin e coordenacao; operator/social_media 403 (CA-3-113).
routerAdd('POST', '/backend/v1/importador/preview', (e) => {
  var SISTEMAS = ['omie', 'nibo', 'olist', 'profilm', 'controle']
  var SERVICOS = ['bpo_financeiro', 'tesouraria', 'controladoria', 'cfo_as_a_service', 'outro']

  function soDigitos(s) {
    return String(s || '').replace(/\D/g, '')
  }
  function cnpjValido(c) {
    var d = soDigitos(c)
    if (d.length !== 14) return false
    if (/^(\d)\1+$/.test(d)) return false
    var P1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    var P2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    var soma1 = 0
    for (var i = 0; i < 12; i++) soma1 += Number(d[i]) * P1[i]
    var r1 = soma1 % 11
    var dv1 = r1 < 2 ? 0 : 11 - r1
    if (Number(d[12]) !== dv1) return false
    var soma2 = 0
    for (var j = 0; j < 13; j++) soma2 += Number(d[j]) * P2[j]
    var r2 = soma2 % 11
    var dv2 = r2 < 2 ? 0 : 11 - r2
    return Number(d[13]) === dv2
  }
  function papelPermitido(actor) {
    var role = String(actor.get('role') || '')
    return role === 'admin' || role === 'coordenacao'
  }
  function auditar(ator, acao, registroId, detalhe) {
    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var ev = new Record(audit)
      ev.set('entidade', 'importacoes_lotes')
      ev.set('registro_id', registroId)
      ev.set('acao', acao)
      ev.set('ator_id', ator.id)
      ev.set('ocorrido_em', new Date().toISOString())
      ev.set('estado_posterior', JSON.stringify(detalhe || {}))
      $app.save(ev)
    } catch (err) {
      $app.logger().error('Auditoria do importador falhou', 'error', String(err))
    }
  }
  // valida e deduplica; retorna {validas, erros, plano} — plano por linha
  function processarLinhas(linhas, dedup) {
    var validas = []
    var erros = []
    var dupEmpresa = 0
    var dupContato = 0
    var atualizaEmpresa = 0
    var atualizaContato = 0
    for (var i = 0; i < linhas.length; i++) {
      var L = linhas[i] || {}
      var err = []
      var razao = String(L.razao_social || '').trim()
      var cnpj = soDigitos(L.cnpj)
      var cNome = String(L.contato_nome || '').trim()
      var cEmail = String(L.contato_email || '')
        .trim()
        .toLowerCase()
      var sistema = String(L.sistema || '')
        .trim()
        .toLowerCase()
      var sistemaOutro = String(L.sistema_outro || '').trim()
      var dataInicio = String(L.data_inicio || '').trim()
      var vigencia = String(L.vigencia || '').trim()
      var setor = String(L.setor || '').trim()
      var telefone = String(L.telefone || '').trim()
      var servicos = Array.isArray(L.servicos) ? L.servicos : []
      if (!razao) err.push('razao_social obrigatória')
      if (!cnpjValido(cnpj)) err.push('CNPJ inválido')
      if (!cNome) err.push('contato_nome obrigatório')
      if (!cEmail || cEmail.indexOf('@') < 1) err.push('contato_email obrigatório/inválido')
      if (SISTEMAS.indexOf(sistema) < 0 && !sistemaOutro)
        err.push('sistema obrigatório (lista ou sistema_outro)')
      if (!dataInicio || isNaN(Date.parse(dataInicio.replace(' ', 'T'))))
        err.push('data_inicio inválida (YYYY-MM-DD)')
      var servOk = []
      if (servicos.length === 0) err.push('pelo menos um serviço')
      for (var s = 0; s < servicos.length; s++) {
        var sv = servicos[s] || {}
        var nome = String(sv.servico || '').trim()
        var valor = Number(sv.valor_mensal)
        if (SERVICOS.indexOf(nome) < 0) err.push('servico inválido: ' + nome)
        else if (!Number.isFinite(valor) || valor <= 0) err.push('valor_mensal > 0 p/ ' + nome)
        else servOk.push({ servico: nome, valor_mensal: valor })
      }
      if (err.length > 0) {
        erros.push({ linha: i + 1, erros: err })
        continue
      }
      // dedup
      var empresaExistente = null
      try {
        var found = $app.findRecordsByFilter('empresas', 'cnpj = "' + cnpj + '"', '', 1, 0)
        if (found.length > 0) empresaExistente = found[0]
      } catch (_) {}
      var contatoExistente = null
      try {
        var fc = $app.findRecordsByFilter(
          'clientes',
          'email = "' + cEmail.replace(/"/g, '') + '"',
          '',
          1,
          0,
        )
        if (fc.length > 0) contatoExistente = fc[0]
      } catch (_) {}
      if (empresaExistente) dupEmpresa++
      if (contatoExistente) dupContato++
      var acaoEmpresa = empresaExistente
        ? dedup && dedup.empresas === 'atualizar'
          ? 'atualizar'
          : 'ignorar'
        : 'criar'
      var acaoContato = contatoExistente
        ? dedup && dedup.contatos === 'atualizar'
          ? 'atualizar'
          : 'ignorar'
        : 'criar'
      if (acaoEmpresa === 'atualizar') atualizaEmpresa++
      if (acaoContato === 'atualizar') atualizaContato++
      validas.push({
        linha: i + 1,
        razao_social: razao,
        cnpj: cnpj,
        contato_nome: cNome,
        contato_email: cEmail,
        telefone: telefone,
        setor: setor,
        sistema: SISTEMAS.indexOf(sistema) >= 0 ? sistema : 'outro',
        sistema_outro: SISTEMAS.indexOf(sistema) >= 0 ? '' : sistemaOutro,
        data_inicio: dataInicio,
        vigencia: vigencia,
        servicos: servOk,
        empresa_existente_id: empresaExistente ? empresaExistente.id : '',
        contato_existente_id: contatoExistente ? contatoExistente.id : '',
        acao_empresa: acaoEmpresa,
        acao_contato: acaoContato,
      })
    }
    return {
      validas: validas,
      erros: erros,
      dup_empresa: dupEmpresa,
      dup_contato: dupContato,
      atualiza_empresa: atualizaEmpresa,
      atualiza_contato: atualizaContato,
    }
  }

  var actor = e.auth
  if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
  if (!papelPermitido(actor))
    return e.json(403, { error: 'Importador restrito a direção e coordenação.' })
  var body = e.requestInfo().body
  var linhas = body.linhas
  if (!Array.isArray(linhas) || linhas.length === 0)
    return e.json(400, { error: 'Envie linhas[] do tipo 1.' })
  if (linhas.length > 500) return e.json(400, { error: 'Máximo de 500 linhas por lote no tipo 1.' })
  var r = processarLinhas(linhas, body.dedup || {})
  var amostra = []
  for (var i = 0; i < r.validas.length && i < 5; i++) amostra.push(r.validas[i])
  return e.json(200, {
    total_enviado: linhas.length,
    validas: r.validas.length,
    invalidas: r.erros.length,
    erros: r.erros,
    duplicadas_empresa: r.dup_empresa,
    duplicadas_contato: r.dup_contato,
    atualizacoes_empresa: r.atualiza_empresa,
    atualizacoes_contato: r.atualiza_contato,
    amostra: amostra,
    aviso: 'Pré-visualização é bloqueio obrigatório: nada grava sem POST /tipo1 com confirm=true.',
  })
})

routerAdd('POST', '/backend/v1/importador/tipo1', (e) => {
  var SISTEMAS = ['omie', 'nibo', 'olist', 'profilm', 'controle']
  var SERVICOS = ['bpo_financeiro', 'tesouraria', 'controladoria', 'cfo_as_a_service', 'outro']

  function soDigitos(s) {
    return String(s || '').replace(/\D/g, '')
  }
  function cnpjValido(c) {
    var d = soDigitos(c)
    if (d.length !== 14) return false
    if (/^(\d)\1+$/.test(d)) return false
    var P1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    var P2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    var soma1 = 0
    for (var i = 0; i < 12; i++) soma1 += Number(d[i]) * P1[i]
    var r1 = soma1 % 11
    var dv1 = r1 < 2 ? 0 : 11 - r1
    if (Number(d[12]) !== dv1) return false
    var soma2 = 0
    for (var j = 0; j < 13; j++) soma2 += Number(d[j]) * P2[j]
    var r2 = soma2 % 11
    var dv2 = r2 < 2 ? 0 : 11 - r2
    return Number(d[13]) === dv2
  }
  function papelPermitido(actor) {
    var role = String(actor.get('role') || '')
    return role === 'admin' || role === 'coordenacao'
  }
  function auditar(ator, acao, registroId, detalhe) {
    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var ev = new Record(audit)
      ev.set('entidade', 'importacoes_lotes')
      ev.set('registro_id', registroId)
      ev.set('acao', acao)
      ev.set('ator_id', ator.id)
      ev.set('ocorrido_em', new Date().toISOString())
      ev.set('estado_posterior', JSON.stringify(detalhe || {}))
      $app.save(ev)
    } catch (err) {
      $app.logger().error('Auditoria do importador falhou', 'error', String(err))
    }
  }
  // valida e deduplica; retorna {validas, erros, plano} — plano por linha
  function processarLinhas(linhas, dedup) {
    var validas = []
    var erros = []
    var dupEmpresa = 0
    var dupContato = 0
    var atualizaEmpresa = 0
    var atualizaContato = 0
    for (var i = 0; i < linhas.length; i++) {
      var L = linhas[i] || {}
      var err = []
      var razao = String(L.razao_social || '').trim()
      var cnpj = soDigitos(L.cnpj)
      var cNome = String(L.contato_nome || '').trim()
      var cEmail = String(L.contato_email || '')
        .trim()
        .toLowerCase()
      var sistema = String(L.sistema || '')
        .trim()
        .toLowerCase()
      var sistemaOutro = String(L.sistema_outro || '').trim()
      var dataInicio = String(L.data_inicio || '').trim()
      var vigencia = String(L.vigencia || '').trim()
      var setor = String(L.setor || '').trim()
      var telefone = String(L.telefone || '').trim()
      var servicos = Array.isArray(L.servicos) ? L.servicos : []
      if (!razao) err.push('razao_social obrigatória')
      if (!cnpjValido(cnpj)) err.push('CNPJ inválido')
      if (!cNome) err.push('contato_nome obrigatório')
      if (!cEmail || cEmail.indexOf('@') < 1) err.push('contato_email obrigatório/inválido')
      if (SISTEMAS.indexOf(sistema) < 0 && !sistemaOutro)
        err.push('sistema obrigatório (lista ou sistema_outro)')
      if (!dataInicio || isNaN(Date.parse(dataInicio.replace(' ', 'T'))))
        err.push('data_inicio inválida (YYYY-MM-DD)')
      var servOk = []
      if (servicos.length === 0) err.push('pelo menos um serviço')
      for (var s = 0; s < servicos.length; s++) {
        var sv = servicos[s] || {}
        var nome = String(sv.servico || '').trim()
        var valor = Number(sv.valor_mensal)
        if (SERVICOS.indexOf(nome) < 0) err.push('servico inválido: ' + nome)
        else if (!Number.isFinite(valor) || valor <= 0) err.push('valor_mensal > 0 p/ ' + nome)
        else servOk.push({ servico: nome, valor_mensal: valor })
      }
      if (err.length > 0) {
        erros.push({ linha: i + 1, erros: err })
        continue
      }
      // dedup
      var empresaExistente = null
      try {
        var found = $app.findRecordsByFilter('empresas', 'cnpj = "' + cnpj + '"', '', 1, 0)
        if (found.length > 0) empresaExistente = found[0]
      } catch (_) {}
      var contatoExistente = null
      try {
        var fc = $app.findRecordsByFilter(
          'clientes',
          'email = "' + cEmail.replace(/"/g, '') + '"',
          '',
          1,
          0,
        )
        if (fc.length > 0) contatoExistente = fc[0]
      } catch (_) {}
      if (empresaExistente) dupEmpresa++
      if (contatoExistente) dupContato++
      var acaoEmpresa = empresaExistente
        ? dedup && dedup.empresas === 'atualizar'
          ? 'atualizar'
          : 'ignorar'
        : 'criar'
      var acaoContato = contatoExistente
        ? dedup && dedup.contatos === 'atualizar'
          ? 'atualizar'
          : 'ignorar'
        : 'criar'
      if (acaoEmpresa === 'atualizar') atualizaEmpresa++
      if (acaoContato === 'atualizar') atualizaContato++
      validas.push({
        linha: i + 1,
        razao_social: razao,
        cnpj: cnpj,
        contato_nome: cNome,
        contato_email: cEmail,
        telefone: telefone,
        setor: setor,
        sistema: SISTEMAS.indexOf(sistema) >= 0 ? sistema : 'outro',
        sistema_outro: SISTEMAS.indexOf(sistema) >= 0 ? '' : sistemaOutro,
        data_inicio: dataInicio,
        vigencia: vigencia,
        servicos: servOk,
        empresa_existente_id: empresaExistente ? empresaExistente.id : '',
        contato_existente_id: contatoExistente ? contatoExistente.id : '',
        acao_empresa: acaoEmpresa,
        acao_contato: acaoContato,
      })
    }
    return {
      validas: validas,
      erros: erros,
      dup_empresa: dupEmpresa,
      dup_contato: dupContato,
      atualiza_empresa: atualizaEmpresa,
      atualiza_contato: atualizaContato,
    }
  }

  var actor = e.auth
  if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
  if (!papelPermitido(actor))
    return e.json(403, { error: 'Importador restrito a direção e coordenação.' })
  var body = e.requestInfo().body
  if (body.confirm !== true)
    return e.json(400, {
      error: 'Gravação bloqueada: confirme a pré-visualização com confirm=true (CA-3-116).',
    })
  var linhas = body.linhas
  if (!Array.isArray(linhas) || linhas.length === 0)
    return e.json(400, { error: 'Envie linhas[] do tipo 1.' })
  var r = processarLinhas(linhas, body.dedup || {})
  if (r.erros.length > 0)
    return e.json(400, { error: 'Há linhas inválidas — corrija antes de gravar.', erros: r.erros })
  var empresasCol = $app.findCollectionByNameOrId('empresas')
  var clientesCol = $app.findCollectionByNameOrId('clientes')
  var negociosCol = $app.findCollectionByNameOrId('negocios')
  var lotesCol = $app.findCollectionByNameOrId('importacoes_lotes')
  var criados = { empresas: [], clientes: [], negocios: [] }
  var atualizados = { empresas: [], clientes: [] }
  var ignorados = { empresas: 0, clientes: 0 }
  for (var i = 0; i < r.validas.length; i++) {
    var L = r.validas[i]
    var empresaId = L.empresa_existente_id
    if (empresaId && L.acao_empresa === 'atualizar') {
      var empUp = $app.findRecordById('empresas', empresaId)
      empUp.set('nome', L.razao_social)
      empUp.set('setor', L.setor || empUp.get('setor'))
      empUp.set('status', 'ativa')
      $app.save(empUp)
      atualizados.empresas.push(empresaId)
    } else if (!empresaId) {
      var emp = new Record(empresasCol)
      emp.set('nome', L.razao_social)
      emp.set('cnpj', L.cnpj)
      emp.set('setor', L.setor)
      emp.set('status', 'ativa')
      $app.save(emp)
      empresaId = emp.id
      criados.empresas.push(empresaId)
    } else {
      ignorados.empresas++
    }
    var contatoId = L.contato_existente_id
    if (contatoId && L.acao_contato === 'atualizar') {
      var cliUp = $app.findRecordById('clientes', contatoId)
      cliUp.set('nome', L.contato_nome)
      cliUp.set('telefone', L.telefone || cliUp.get('telefone'))
      cliUp.set('empresa', empresaId)
      cliUp.set('status', 'ativo')
      $app.save(cliUp)
      atualizados.clientes.push(contatoId)
    } else if (!contatoId) {
      var cli = new Record(clientesCol)
      cli.set('nome', L.contato_nome)
      cli.set('email', L.contato_email)
      cli.set('telefone', L.telefone)
      cli.set('empresa', empresaId)
      cli.set('status', 'ativo')
      $app.save(cli)
      contatoId = cli.id
      criados.clientes.push(contatoId)
    } else {
      ignorados.clientes++
    }
    for (var s = 0; s < L.servicos.length; s++) {
      var sv = L.servicos[s]
      var neg = new Record(negociosCol)
      var rotulo =
        sv.servico === 'bpo_financeiro'
          ? 'BPO Financeiro'
          : sv.servico === 'tesouraria'
            ? 'Tesouraria'
            : sv.servico === 'controladoria'
              ? 'Controladoria'
              : sv.servico === 'cfo_as_a_service'
                ? 'CFO as a Service'
                : 'Outro'
      neg.set('titulo', rotulo + ' — ' + L.razao_social + ' (migração)')
      neg.set('cliente', contatoId)
      neg.set('valor', sv.valor_mensal)
      neg.set('estagio', 'fechado_ganho')
      neg.set('probabilidade', 100)
      neg.set('data_ganho', L.data_inicio)
      neg.set('data_entrada', L.data_inicio)
      neg.set('entrada_origem', 'migracao')
      neg.set('origem_especifica', 'Importador tipo 1 — carga de carteira')
      neg.set('recorrencia', 'mensal')
      neg.set('servico', sv.servico)
      neg.set('responsavel', actor.id)
      neg.set('criado_por', actor.id)
      neg.set(
        'observacoes',
        'Importado por planilha (lote tipo 1). Sistema de gestão: ' +
          L.sistema +
          (L.sistema_outro ? ' (' + L.sistema_outro + ')' : '') +
          (L.vigencia ? '. Vigência: ' + L.vigencia : '') +
          '.',
      )
      $app.save(neg)
      criados.negocios.push(neg.id)
    }
  }
  var lote = new Record(lotesCol)
  lote.set('tipo', 'tipo1_clientes_ativos')
  lote.set('arquivo_nome', String(body.arquivo_nome || 'colado'))
  lote.set('origem_base', String(body.origem_base || ''))
  lote.set('status', 'aplicado')
  lote.set('contagens', {
    enviado: linhas.length,
    validas: r.validas.length,
    invalidas: r.erros.length,
    dup_empresa: r.dup_empresa,
    dup_contato: r.dup_contato,
  })
  lote.set('criados', criados)
  lote.set('atualizados', atualizados)
  lote.set('ignorados', ignorados)
  lote.set('criado_por', actor.id)
  $app.save(lote)
  auditar(actor, 'importacao', lote.id, {
    tipo: 'tipo1',
    criados: criados,
    atualizados: atualizados,
    ignorados: ignorados,
  })
  return e.json(200, {
    lote_id: lote.id,
    criados: criados,
    atualizados: atualizados,
    ignorados: ignorados,
    aviso: 'Lote registrado e desfazível via POST /importador/{id}/desfazer.',
  })
})

routerAdd('POST', '/backend/v1/importador/{id}/desfazer', (e) => {
  var SISTEMAS = ['omie', 'nibo', 'olist', 'profilm', 'controle']
  var SERVICOS = ['bpo_financeiro', 'tesouraria', 'controladoria', 'cfo_as_a_service', 'outro']

  function soDigitos(s) {
    return String(s || '').replace(/\D/g, '')
  }
  function cnpjValido(c) {
    var d = soDigitos(c)
    if (d.length !== 14) return false
    if (/^(\d)\1+$/.test(d)) return false
    var P1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    var P2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    var soma1 = 0
    for (var i = 0; i < 12; i++) soma1 += Number(d[i]) * P1[i]
    var r1 = soma1 % 11
    var dv1 = r1 < 2 ? 0 : 11 - r1
    if (Number(d[12]) !== dv1) return false
    var soma2 = 0
    for (var j = 0; j < 13; j++) soma2 += Number(d[j]) * P2[j]
    var r2 = soma2 % 11
    var dv2 = r2 < 2 ? 0 : 11 - r2
    return Number(d[13]) === dv2
  }
  function papelPermitido(actor) {
    var role = String(actor.get('role') || '')
    return role === 'admin' || role === 'coordenacao'
  }
  function auditar(ator, acao, registroId, detalhe) {
    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var ev = new Record(audit)
      ev.set('entidade', 'importacoes_lotes')
      ev.set('registro_id', registroId)
      ev.set('acao', acao)
      ev.set('ator_id', ator.id)
      ev.set('ocorrido_em', new Date().toISOString())
      ev.set('estado_posterior', JSON.stringify(detalhe || {}))
      $app.save(ev)
    } catch (err) {
      $app.logger().error('Auditoria do importador falhou', 'error', String(err))
    }
  }
  // valida e deduplica; retorna {validas, erros, plano} — plano por linha
  function processarLinhas(linhas, dedup) {
    var validas = []
    var erros = []
    var dupEmpresa = 0
    var dupContato = 0
    var atualizaEmpresa = 0
    var atualizaContato = 0
    for (var i = 0; i < linhas.length; i++) {
      var L = linhas[i] || {}
      var err = []
      var razao = String(L.razao_social || '').trim()
      var cnpj = soDigitos(L.cnpj)
      var cNome = String(L.contato_nome || '').trim()
      var cEmail = String(L.contato_email || '')
        .trim()
        .toLowerCase()
      var sistema = String(L.sistema || '')
        .trim()
        .toLowerCase()
      var sistemaOutro = String(L.sistema_outro || '').trim()
      var dataInicio = String(L.data_inicio || '').trim()
      var vigencia = String(L.vigencia || '').trim()
      var setor = String(L.setor || '').trim()
      var telefone = String(L.telefone || '').trim()
      var servicos = Array.isArray(L.servicos) ? L.servicos : []
      if (!razao) err.push('razao_social obrigatória')
      if (!cnpjValido(cnpj)) err.push('CNPJ inválido')
      if (!cNome) err.push('contato_nome obrigatório')
      if (!cEmail || cEmail.indexOf('@') < 1) err.push('contato_email obrigatório/inválido')
      if (SISTEMAS.indexOf(sistema) < 0 && !sistemaOutro)
        err.push('sistema obrigatório (lista ou sistema_outro)')
      if (!dataInicio || isNaN(Date.parse(dataInicio.replace(' ', 'T'))))
        err.push('data_inicio inválida (YYYY-MM-DD)')
      var servOk = []
      if (servicos.length === 0) err.push('pelo menos um serviço')
      for (var s = 0; s < servicos.length; s++) {
        var sv = servicos[s] || {}
        var nome = String(sv.servico || '').trim()
        var valor = Number(sv.valor_mensal)
        if (SERVICOS.indexOf(nome) < 0) err.push('servico inválido: ' + nome)
        else if (!Number.isFinite(valor) || valor <= 0) err.push('valor_mensal > 0 p/ ' + nome)
        else servOk.push({ servico: nome, valor_mensal: valor })
      }
      if (err.length > 0) {
        erros.push({ linha: i + 1, erros: err })
        continue
      }
      // dedup
      var empresaExistente = null
      try {
        var found = $app.findRecordsByFilter('empresas', 'cnpj = "' + cnpj + '"', '', 1, 0)
        if (found.length > 0) empresaExistente = found[0]
      } catch (_) {}
      var contatoExistente = null
      try {
        var fc = $app.findRecordsByFilter(
          'clientes',
          'email = "' + cEmail.replace(/"/g, '') + '"',
          '',
          1,
          0,
        )
        if (fc.length > 0) contatoExistente = fc[0]
      } catch (_) {}
      if (empresaExistente) dupEmpresa++
      if (contatoExistente) dupContato++
      var acaoEmpresa = empresaExistente
        ? dedup && dedup.empresas === 'atualizar'
          ? 'atualizar'
          : 'ignorar'
        : 'criar'
      var acaoContato = contatoExistente
        ? dedup && dedup.contatos === 'atualizar'
          ? 'atualizar'
          : 'ignorar'
        : 'criar'
      if (acaoEmpresa === 'atualizar') atualizaEmpresa++
      if (acaoContato === 'atualizar') atualizaContato++
      validas.push({
        linha: i + 1,
        razao_social: razao,
        cnpj: cnpj,
        contato_nome: cNome,
        contato_email: cEmail,
        telefone: telefone,
        setor: setor,
        sistema: SISTEMAS.indexOf(sistema) >= 0 ? sistema : 'outro',
        sistema_outro: SISTEMAS.indexOf(sistema) >= 0 ? '' : sistemaOutro,
        data_inicio: dataInicio,
        vigencia: vigencia,
        servicos: servOk,
        empresa_existente_id: empresaExistente ? empresaExistente.id : '',
        contato_existente_id: contatoExistente ? contatoExistente.id : '',
        acao_empresa: acaoEmpresa,
        acao_contato: acaoContato,
      })
    }
    return {
      validas: validas,
      erros: erros,
      dup_empresa: dupEmpresa,
      dup_contato: dupContato,
      atualiza_empresa: atualizaEmpresa,
      atualiza_contato: atualizaContato,
    }
  }

  var actor = e.auth
  if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
  if (String(actor.get('role') || '') !== 'admin')
    return e.json(403, { error: 'Desfazer lote é exclusivo do admin.' })
  var id = e.request.pathValue('id')
  var lote
  try {
    lote = $app.findRecordById('importacoes_lotes', id)
  } catch (_) {
    return e.json(404, { error: 'Lote não encontrado.' })
  }
  if (String(lote.get('status') || '') !== 'aplicado')
    return e.json(400, { error: 'Lote já desfeito.' })
  // JSONField no JSVM: get() pode devolver Map sem chaves acessíveis por propriedade.
  // getString() devolve a serialização JSON do campo — parse a partir dela (lição T3.22).
  var criados = {}
  try {
    criados = JSON.parse(lote.getString('criados') || '{}')
  } catch (errParse) {
    try {
      criados = JSON.parse(JSON.stringify(lote.get('criados') || {}))
    } catch (_) {
      criados = {}
    }
  }
  if (!criados || typeof criados !== 'object') criados = {}
  if (!Array.isArray(criados.negocios)) criados.negocios = []
  if (!Array.isArray(criados.clientes)) criados.clientes = []
  if (!Array.isArray(criados.empresas)) criados.empresas = []
  console.log(
    'T322 desfazer: raw=',
    String(lote.getString('criados')).slice(0, 200),
    '| negocios=',
    criados.negocios.length,
    'clientes=',
    criados.clientes.length,
    'empresas=',
    criados.empresas.length,
  )
  var removidos = { negocios: 0, clientes: 0, empresas: 0 }
  var negs = criados.negocios || []
  for (var i = 0; i < negs.length; i++) {
    try {
      $app.delete($app.findRecordById('negocios', negs[i]))
      removidos.negocios++
    } catch (errNeg) {
      console.log('T322 delete negocio falhou:', negs[i], String(errNeg))
    }
  }
  var clis = criados.clientes || []
  for (var j = 0; j < clis.length; j++) {
    try {
      $app.delete($app.findRecordById('clientes', clis[j]))
      removidos.clientes++
    } catch (errCli) {
      console.log('T322 delete cliente falhou:', clis[j], String(errCli))
    }
  }
  var emps = criados.empresas || []
  for (var k = 0; k < emps.length; k++) {
    try {
      $app.delete($app.findRecordById('empresas', emps[k]))
      removidos.empresas++
    } catch (errEmp) {
      console.log('T322 delete empresa falhou:', emps[k], String(errEmp))
    }
  }
  lote.set('status', 'desfeito')
  lote.set('desfeito_em', new Date().toISOString())
  $app.save(lote)
  auditar(actor, 'importacao_desfeita', lote.id, { removidos: removidos })
  return e.json(200, { lote_id: id, removidos: removidos, status: 'desfeito' })
})

routerAdd('GET', '/backend/v1/importador/lotes', (e) => {
  var SISTEMAS = ['omie', 'nibo', 'olist', 'profilm', 'controle']
  var SERVICOS = ['bpo_financeiro', 'tesouraria', 'controladoria', 'cfo_as_a_service', 'outro']

  function soDigitos(s) {
    return String(s || '').replace(/\D/g, '')
  }
  function cnpjValido(c) {
    var d = soDigitos(c)
    if (d.length !== 14) return false
    if (/^(\d)\1+$/.test(d)) return false
    var P1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    var P2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    var soma1 = 0
    for (var i = 0; i < 12; i++) soma1 += Number(d[i]) * P1[i]
    var r1 = soma1 % 11
    var dv1 = r1 < 2 ? 0 : 11 - r1
    if (Number(d[12]) !== dv1) return false
    var soma2 = 0
    for (var j = 0; j < 13; j++) soma2 += Number(d[j]) * P2[j]
    var r2 = soma2 % 11
    var dv2 = r2 < 2 ? 0 : 11 - r2
    return Number(d[13]) === dv2
  }
  function papelPermitido(actor) {
    var role = String(actor.get('role') || '')
    return role === 'admin' || role === 'coordenacao'
  }
  function auditar(ator, acao, registroId, detalhe) {
    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var ev = new Record(audit)
      ev.set('entidade', 'importacoes_lotes')
      ev.set('registro_id', registroId)
      ev.set('acao', acao)
      ev.set('ator_id', ator.id)
      ev.set('ocorrido_em', new Date().toISOString())
      ev.set('estado_posterior', JSON.stringify(detalhe || {}))
      $app.save(ev)
    } catch (err) {
      $app.logger().error('Auditoria do importador falhou', 'error', String(err))
    }
  }
  // valida e deduplica; retorna {validas, erros, plano} — plano por linha
  function processarLinhas(linhas, dedup) {
    var validas = []
    var erros = []
    var dupEmpresa = 0
    var dupContato = 0
    var atualizaEmpresa = 0
    var atualizaContato = 0
    for (var i = 0; i < linhas.length; i++) {
      var L = linhas[i] || {}
      var err = []
      var razao = String(L.razao_social || '').trim()
      var cnpj = soDigitos(L.cnpj)
      var cNome = String(L.contato_nome || '').trim()
      var cEmail = String(L.contato_email || '')
        .trim()
        .toLowerCase()
      var sistema = String(L.sistema || '')
        .trim()
        .toLowerCase()
      var sistemaOutro = String(L.sistema_outro || '').trim()
      var dataInicio = String(L.data_inicio || '').trim()
      var vigencia = String(L.vigencia || '').trim()
      var setor = String(L.setor || '').trim()
      var telefone = String(L.telefone || '').trim()
      var servicos = Array.isArray(L.servicos) ? L.servicos : []
      if (!razao) err.push('razao_social obrigatória')
      if (!cnpjValido(cnpj)) err.push('CNPJ inválido')
      if (!cNome) err.push('contato_nome obrigatório')
      if (!cEmail || cEmail.indexOf('@') < 1) err.push('contato_email obrigatório/inválido')
      if (SISTEMAS.indexOf(sistema) < 0 && !sistemaOutro)
        err.push('sistema obrigatório (lista ou sistema_outro)')
      if (!dataInicio || isNaN(Date.parse(dataInicio.replace(' ', 'T'))))
        err.push('data_inicio inválida (YYYY-MM-DD)')
      var servOk = []
      if (servicos.length === 0) err.push('pelo menos um serviço')
      for (var s = 0; s < servicos.length; s++) {
        var sv = servicos[s] || {}
        var nome = String(sv.servico || '').trim()
        var valor = Number(sv.valor_mensal)
        if (SERVICOS.indexOf(nome) < 0) err.push('servico inválido: ' + nome)
        else if (!Number.isFinite(valor) || valor <= 0) err.push('valor_mensal > 0 p/ ' + nome)
        else servOk.push({ servico: nome, valor_mensal: valor })
      }
      if (err.length > 0) {
        erros.push({ linha: i + 1, erros: err })
        continue
      }
      // dedup
      var empresaExistente = null
      try {
        var found = $app.findRecordsByFilter('empresas', 'cnpj = "' + cnpj + '"', '', 1, 0)
        if (found.length > 0) empresaExistente = found[0]
      } catch (_) {}
      var contatoExistente = null
      try {
        var fc = $app.findRecordsByFilter(
          'clientes',
          'email = "' + cEmail.replace(/"/g, '') + '"',
          '',
          1,
          0,
        )
        if (fc.length > 0) contatoExistente = fc[0]
      } catch (_) {}
      if (empresaExistente) dupEmpresa++
      if (contatoExistente) dupContato++
      var acaoEmpresa = empresaExistente
        ? dedup && dedup.empresas === 'atualizar'
          ? 'atualizar'
          : 'ignorar'
        : 'criar'
      var acaoContato = contatoExistente
        ? dedup && dedup.contatos === 'atualizar'
          ? 'atualizar'
          : 'ignorar'
        : 'criar'
      if (acaoEmpresa === 'atualizar') atualizaEmpresa++
      if (acaoContato === 'atualizar') atualizaContato++
      validas.push({
        linha: i + 1,
        razao_social: razao,
        cnpj: cnpj,
        contato_nome: cNome,
        contato_email: cEmail,
        telefone: telefone,
        setor: setor,
        sistema: SISTEMAS.indexOf(sistema) >= 0 ? sistema : 'outro',
        sistema_outro: SISTEMAS.indexOf(sistema) >= 0 ? '' : sistemaOutro,
        data_inicio: dataInicio,
        vigencia: vigencia,
        servicos: servOk,
        empresa_existente_id: empresaExistente ? empresaExistente.id : '',
        contato_existente_id: contatoExistente ? contatoExistente.id : '',
        acao_empresa: acaoEmpresa,
        acao_contato: acaoContato,
      })
    }
    return {
      validas: validas,
      erros: erros,
      dup_empresa: dupEmpresa,
      dup_contato: dupContato,
      atualiza_empresa: atualizaEmpresa,
      atualiza_contato: atualizaContato,
    }
  }

  var actor = e.auth
  if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
  if (!papelPermitido(actor))
    return e.json(403, { error: 'Importador restrito a direção e coordenação.' })
  var lotes = $app.findRecordsByFilter('importacoes_lotes', '', '-created', 50, 0)
  var itens = []
  for (var i = 0; i < lotes.length; i++) {
    var L = lotes[i]
    itens.push({
      id: L.id,
      tipo: L.get('tipo'),
      arquivo_nome: L.get('arquivo_nome'),
      status: L.get('status'),
      contagens: L.get('contagens'),
      criados: L.get('criados'),
      atualizados: L.get('atualizados'),
      ignorados: L.get('ignorados'),
      criado_em: L.get('created'),
    })
  }
  return e.json(200, { total: itens.length, itens: itens })
})
