// T3.22 v4 — SPEC-3-022 (tipo 1 completo): planilha A (empresas) + planilha B (contatos adicionais).
// CA-3-119 duas planilhas no mesmo lote; CA-3-120 natureza/cargo/analista; CA-3-121 papéis bloco 9;
// CA-3-122 CNPJ órfão rejeitado; CA-3-123 preview conjunto; CA-3-124 desfazer remove as duas;
// CA-3-125 mesmo e-mail = mesma pessoa (papéis somados); CA-3-126 outra empresa exibida;
// CA-3-127 vínculo múltiplo = decisão manual explícita; CA-3-128/129 ficha automática em_implantacao
// só bloco 9, trava de completude intacta; CA-3-130 cargo novo + analista validado.
// Migração: fora de conversão/ciclo/origem; entra só no MRR (CA-3-115) — ajuste no painel_papel.
// AP-0200: helpers INLINE em cada callback. JSONField: getString + JSON.parse (lição T3.22).
// ================= ROTAS (helpers inline por AP-0200) =================
routerAdd('POST', '/backend/v1/importador/preview', (e) => {
  var SISTEMAS_L = ['omie', 'nibo', 'olist', 'profilm', 'controle']
  var SERVICOS_L = ['bpo_financeiro', 'tesouraria', 'controladoria', 'cfo_as_a_service', 'outro']
  var NATUREZAS_L = ['cliente', 'empresa_grupo', 'projeto']
  var PAPEIS_L = [
    'autoriza_projecao',
    'aprova_banco',
    'aprova_faturamento',
    'envia_informacao',
    'apenas_informado',
  ]

  function soDigitos(s) {
    return String(s || '').replace(/\D/g, '')
  }
  function cnpjValido(c) {
    var d = soDigitos(c)
    if (d.length !== 14) return false
    if (/^(\d)\1+$/.test(d)) return false
    var P1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
      P2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    var s1 = 0
    for (var i = 0; i < 12; i++) s1 += Number(d[i]) * P1[i]
    var dv1 = s1 % 11 < 2 ? 0 : 11 - (s1 % 11)
    if (Number(d[12]) !== dv1) return false
    var s2 = 0
    for (var j = 0; j < 13; j++) s2 += Number(d[j]) * P2[j]
    var dv2 = s2 % 11 < 2 ? 0 : 11 - (s2 % 11)
    return Number(d[13]) === dv2
  }
  function normNatureza(s) {
    var t = String(s || '')
      .trim()
      .toLowerCase()
    if (t === 'cliente') return 'cliente'
    if (
      t === 'empresa do grupo' ||
      t === 'empresa_grupo' ||
      t === 'grupo' ||
      t === 'empresa do grupo '
    )
      return 'empresa_grupo'
    if (t === 'projeto') return 'projeto'
    return ''
  }
  function normPapel(s) {
    var t = String(s || '')
      .trim()
      .toLowerCase()
    if (PAPEIS_L.indexOf(t) >= 0) return t
    if (t.indexOf('autoriza') >= 0 && t.indexOf('proje') >= 0) return 'autoriza_projecao'
    if (t.indexOf('banco') >= 0) return 'aprova_banco'
    if (t.indexOf('faturamento') >= 0) return 'aprova_faturamento'
    if (t.indexOf('envia') >= 0) return 'envia_informacao'
    if (t.indexOf('informado') >= 0) return 'apenas_informado'
    return ''
  }
  function normPapeis(s) {
    var partes = String(s || '').split('|')
    var out = []
    for (var i = 0; i < partes.length; i++) {
      var p = normPapel(partes[i])
      if (!p) return null
      if (out.indexOf(p) < 0) out.push(p)
    }
    return out.length ? out : null
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
  function usuarioPorNome(nome) {
    var t = String(nome || '')
      .trim()
      .toLowerCase()
    if (!t) return null
    try {
      var us = $app.findRecordsByFilter('users', 'verified = true', '', 100, 0)
      for (var i = 0; i < us.length; i++) {
        var n = String(us[i].get('name') || '')
          .trim()
          .toLowerCase()
        if (n && n === t) return us[i]
      }
    } catch (_) {}
    return null
  }
  function empresaPorCnpj(cnpj) {
    try {
      var f = $app.findRecordsByFilter('empresas', 'cnpj = "' + cnpj + '"', '', 1, 0)
      return f.length ? f[0] : null
    } catch (_) {
      return null
    }
  }
  function contatoPorEmail(email) {
    try {
      var f = $app.findRecordsByFilter(
        'clientes',
        'email = "' + String(email).replace(/"/g, '') + '"',
        '',
        1,
        0,
      )
      return f.length ? f[0] : null
    } catch (_) {
      return null
    }
  }
  function nomeEmpresaSafe(id) {
    try {
      return String($app.findRecordById('empresas', id).get('nome') || '')
    } catch (_) {
      return ''
    }
  }

  // ---- processa planilha A + B; retorna {validas_a, validas_b, erros, avisos_b, contagens} ----
  function processar(linhasA, linhasB, dedup) {
    var validasA = [],
      erros = [],
      mapaCnpj = {}
    var dupEmpresa = 0,
      dupContato = 0,
      atualizaEmpresa = 0,
      atualizaContato = 0
    for (var i = 0; i < linhasA.length; i++) {
      var L = linhasA[i] || {}
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
      var natureza = normNatureza(L.natureza_registro)
      var cargo = String(L.cargo_contato || '').trim()
      var analistaNome = String(L.analista_titular || '').trim()
      var servicos = Array.isArray(L.servicos) ? L.servicos : []
      if (!razao) err.push('razao_social obrigatória')
      if (!cnpjValido(cnpj)) err.push('CNPJ inválido')
      if (!cNome) err.push('contato_nome obrigatório')
      if (!cEmail || cEmail.indexOf('@') < 1) err.push('contato_email obrigatório/inválido')
      if (SISTEMAS_L.indexOf(sistema) < 0 && !sistemaOutro)
        err.push('sistema obrigatório (lista ou sistema_outro)')
      if (!dataInicio || isNaN(Date.parse(dataInicio.replace(' ', 'T'))))
        err.push('data_inicio inválida (YYYY-MM-DD)')
      if (!natureza)
        err.push('natureza_registro obrigatória (cliente | empresa do grupo | projeto)')
      if (!cargo) err.push('cargo_contato obrigatório')
      var analista = null
      if (!analistaNome) err.push('analista_titular obrigatório')
      else {
        analista = usuarioPorNome(analistaNome)
        if (!analista) err.push('analista_titular inválido: ' + analistaNome)
      }
      var servOk = []
      if (servicos.length === 0) err.push('pelo menos um serviço')
      for (var s = 0; s < servicos.length; s++) {
        var sv = servicos[s] || {}
        var nome = String(sv.servico || '').trim()
        var valor = Number(sv.valor_mensal)
        if (SERVICOS_L.indexOf(nome) < 0) err.push('servico inválido: ' + nome)
        else if (!Number.isFinite(valor) || valor <= 0) err.push('valor_mensal > 0 p/ ' + nome)
        else servOk.push({ servico: nome, valor_mensal: valor })
      }
      if (err.length > 0) {
        erros.push({ planilha: 'A', linha: i + 1, erros: err })
        continue
      }
      var empresaExistente = empresaPorCnpj(cnpj)
      var contatoExistente = contatoPorEmail(cEmail)
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
      var item = {
        linha: i + 1,
        razao_social: razao,
        cnpj: cnpj,
        contato_nome: cNome,
        contato_email: cEmail,
        telefone: telefone,
        setor: setor,
        sistema: SISTEMAS_L.indexOf(sistema) >= 0 ? sistema : 'outro',
        sistema_outro: SISTEMAS_L.indexOf(sistema) >= 0 ? '' : sistemaOutro,
        data_inicio: dataInicio,
        vigencia: vigencia,
        natureza_registro: natureza,
        cargo_contato: cargo,
        analista_titular: analistaNome,
        analista_id: analista ? analista.id : '',
        servicos: servOk,
        empresa_existente_id: empresaExistente ? empresaExistente.id : '',
        contato_existente_id: contatoExistente ? contatoExistente.id : '',
        acao_empresa: acaoEmpresa,
        acao_contato: acaoContato,
      }
      validasA.push(item)
      mapaCnpj[cnpj] = item
    }
    // ---- planilha B ----
    var validasB = [],
      avisosB = []
    var dupB = 0
    for (var b = 0; b < linhasB.length; b++) {
      var B = linhasB[b] || {}
      var errB = []
      var cnpjB = soDigitos(B.cnpj)
      var nomeB = String(B.nome || '').trim()
      var emailB = String(B.email || '')
        .trim()
        .toLowerCase()
      var telB = String(B.telefone || '').trim()
      var cargoB = String(B.cargo || '').trim()
      var papeis = normPapeis(B.papel_operacional)
      if (!cnpjValido(cnpjB)) errB.push('CNPJ inválido')
      if (!nomeB) errB.push('nome obrigatório')
      if (emailB && emailB.indexOf('@') < 1) errB.push('email inválido')
      if (!papeis)
        errB.push(
          'papel_operacional inválido (autoriza_projecao | aprova_banco | aprova_faturamento | envia_informacao | apenas_informado, múltiplos separados por |)',
        )
      // CA-3-122: CNPJ precisa constar da planilha A ou da base
      var empresaAlvo = mapaCnpj[cnpjB] ? mapaCnpj[cnpjB] : null
      var empresaBaseId = ''
      if (!empresaAlvo) {
        var empBase = empresaPorCnpj(cnpjB)
        if (empBase) empresaBaseId = empBase.id
        else errB.push('CNPJ não consta da planilha A nem da base (CA-3-122)')
      }
      if (errB.length > 0) {
        erros.push({ planilha: 'B', linha: b + 1, erros: errB })
        continue
      }
      var itemB = {
        linha: b + 1,
        cnpj: cnpjB,
        nome: nomeB,
        email: emailB,
        telefone: telB,
        cargo: cargoB,
        papeis: papeis,
      }
      // destino: mesma pessoa do principal (CA-3-125)?
      itemB.mesmo_principal = false
      if (empresaAlvo && emailB && emailB === empresaAlvo.contato_email)
        itemB.mesmo_principal = true
      // CA-3-126/127: contato existente vinculado a outra empresa
      itemB.vinculo_existente_id = ''
      itemB.outra_empresa = ''
      if (emailB) {
        var existente = contatoPorEmail(emailB)
        if (existente) {
          dupB++
          var empAtual = String(existente.get('empresa') || '')
          var alvoId = empresaAlvo ? empresaAlvo.empresa_existente_id || '' : empresaBaseId
          if (empAtual && empAtual !== alvoId) {
            itemB.vinculo_existente_id = existente.id
            itemB.outra_empresa = nomeEmpresaSafe(empAtual)
            avisosB.push({
              linha: b + 1,
              nome: nomeB,
              outra_empresa: itemB.outra_empresa,
              aviso:
                'Contato já vinculado a "' +
                itemB.outra_empresa +
                '" — decisão manual obrigatória (vincular substitui o vínculo único; ignorar mantém como está).',
            })
          }
        }
      }
      validasB.push(itemB)
    }
    return {
      validas_a: validasA,
      validas_b: validasB,
      erros: erros,
      avisos_b: avisosB,
      dup_empresa: dupEmpresa,
      dup_contato: dupContato,
      dup_b: dupB,
      atualiza_empresa: atualizaEmpresa,
      atualiza_contato: atualizaContato,
    }
  }

  var actor = e.auth
  if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
  if (!papelPermitido(actor))
    return e.json(403, { error: 'Importador restrito a direção e coordenação.' })
  var body = e.requestInfo().body
  var linhasA = body.linhas
  if (!Array.isArray(linhasA) || linhasA.length === 0)
    return e.json(400, { error: 'Envie linhas[] da planilha A (empresas).' })
  if (linhasA.length > 500) return e.json(400, { error: 'Máximo de 500 linhas por lote.' })
  var linhasB = Array.isArray(body.linhas_b) ? body.linhas_b : []
  var r = processar(linhasA, linhasB, body.dedup || {})
  var amostra = []
  for (var i = 0; i < r.validas_a.length && i < 5; i++) amostra.push(r.validas_a[i])
  var amostraB = []
  for (var b = 0; b < r.validas_b.length && b < 10; b++) amostraB.push(r.validas_b[b])
  return e.json(200, {
    total_enviado: linhasA.length,
    total_b: linhasB.length,
    validas: r.validas_a.length,
    validas_b: r.validas_b.length,
    invalidas: r.erros.length,
    erros: r.erros,
    avisos_b: r.avisos_b,
    duplicadas_empresa: r.dup_empresa,
    duplicadas_contato: r.dup_contato,
    duplicadas_b: r.dup_b,
    atualizacoes_empresa: r.atualiza_empresa,
    atualizacoes_contato: r.atualiza_contato,
    amostra: amostra,
    amostra_b: amostraB,
    aviso: 'Pré-visualização é bloqueio obrigatório: nada grava sem POST /tipo1 com confirm=true.',
  })
})

routerAdd('POST', '/backend/v1/importador/tipo1', (e) => {
  var SISTEMAS_L = ['omie', 'nibo', 'olist', 'profilm', 'controle']
  var SERVICOS_L = ['bpo_financeiro', 'tesouraria', 'controladoria', 'cfo_as_a_service', 'outro']
  var NATUREZAS_L = ['cliente', 'empresa_grupo', 'projeto']
  var PAPEIS_L = [
    'autoriza_projecao',
    'aprova_banco',
    'aprova_faturamento',
    'envia_informacao',
    'apenas_informado',
  ]

  function soDigitos(s) {
    return String(s || '').replace(/\D/g, '')
  }
  function cnpjValido(c) {
    var d = soDigitos(c)
    if (d.length !== 14) return false
    if (/^(\d)\1+$/.test(d)) return false
    var P1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
      P2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    var s1 = 0
    for (var i = 0; i < 12; i++) s1 += Number(d[i]) * P1[i]
    var dv1 = s1 % 11 < 2 ? 0 : 11 - (s1 % 11)
    if (Number(d[12]) !== dv1) return false
    var s2 = 0
    for (var j = 0; j < 13; j++) s2 += Number(d[j]) * P2[j]
    var dv2 = s2 % 11 < 2 ? 0 : 11 - (s2 % 11)
    return Number(d[13]) === dv2
  }
  function normNatureza(s) {
    var t = String(s || '')
      .trim()
      .toLowerCase()
    if (t === 'cliente') return 'cliente'
    if (
      t === 'empresa do grupo' ||
      t === 'empresa_grupo' ||
      t === 'grupo' ||
      t === 'empresa do grupo '
    )
      return 'empresa_grupo'
    if (t === 'projeto') return 'projeto'
    return ''
  }
  function normPapel(s) {
    var t = String(s || '')
      .trim()
      .toLowerCase()
    if (PAPEIS_L.indexOf(t) >= 0) return t
    if (t.indexOf('autoriza') >= 0 && t.indexOf('proje') >= 0) return 'autoriza_projecao'
    if (t.indexOf('banco') >= 0) return 'aprova_banco'
    if (t.indexOf('faturamento') >= 0) return 'aprova_faturamento'
    if (t.indexOf('envia') >= 0) return 'envia_informacao'
    if (t.indexOf('informado') >= 0) return 'apenas_informado'
    return ''
  }
  function normPapeis(s) {
    var partes = String(s || '').split('|')
    var out = []
    for (var i = 0; i < partes.length; i++) {
      var p = normPapel(partes[i])
      if (!p) return null
      if (out.indexOf(p) < 0) out.push(p)
    }
    return out.length ? out : null
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
  function usuarioPorNome(nome) {
    var t = String(nome || '')
      .trim()
      .toLowerCase()
    if (!t) return null
    try {
      var us = $app.findRecordsByFilter('users', 'verified = true', '', 100, 0)
      for (var i = 0; i < us.length; i++) {
        var n = String(us[i].get('name') || '')
          .trim()
          .toLowerCase()
        if (n && n === t) return us[i]
      }
    } catch (_) {}
    return null
  }
  function empresaPorCnpj(cnpj) {
    try {
      var f = $app.findRecordsByFilter('empresas', 'cnpj = "' + cnpj + '"', '', 1, 0)
      return f.length ? f[0] : null
    } catch (_) {
      return null
    }
  }
  function contatoPorEmail(email) {
    try {
      var f = $app.findRecordsByFilter(
        'clientes',
        'email = "' + String(email).replace(/"/g, '') + '"',
        '',
        1,
        0,
      )
      return f.length ? f[0] : null
    } catch (_) {
      return null
    }
  }
  function nomeEmpresaSafe(id) {
    try {
      return String($app.findRecordById('empresas', id).get('nome') || '')
    } catch (_) {
      return ''
    }
  }

  // ---- processa planilha A + B; retorna {validas_a, validas_b, erros, avisos_b, contagens} ----
  function processar(linhasA, linhasB, dedup) {
    var validasA = [],
      erros = [],
      mapaCnpj = {}
    var dupEmpresa = 0,
      dupContato = 0,
      atualizaEmpresa = 0,
      atualizaContato = 0
    for (var i = 0; i < linhasA.length; i++) {
      var L = linhasA[i] || {}
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
      var natureza = normNatureza(L.natureza_registro)
      var cargo = String(L.cargo_contato || '').trim()
      var analistaNome = String(L.analista_titular || '').trim()
      var servicos = Array.isArray(L.servicos) ? L.servicos : []
      if (!razao) err.push('razao_social obrigatória')
      if (!cnpjValido(cnpj)) err.push('CNPJ inválido')
      if (!cNome) err.push('contato_nome obrigatório')
      if (!cEmail || cEmail.indexOf('@') < 1) err.push('contato_email obrigatório/inválido')
      if (SISTEMAS_L.indexOf(sistema) < 0 && !sistemaOutro)
        err.push('sistema obrigatório (lista ou sistema_outro)')
      if (!dataInicio || isNaN(Date.parse(dataInicio.replace(' ', 'T'))))
        err.push('data_inicio inválida (YYYY-MM-DD)')
      if (!natureza)
        err.push('natureza_registro obrigatória (cliente | empresa do grupo | projeto)')
      if (!cargo) err.push('cargo_contato obrigatório')
      var analista = null
      if (!analistaNome) err.push('analista_titular obrigatório')
      else {
        analista = usuarioPorNome(analistaNome)
        if (!analista) err.push('analista_titular inválido: ' + analistaNome)
      }
      var servOk = []
      if (servicos.length === 0) err.push('pelo menos um serviço')
      for (var s = 0; s < servicos.length; s++) {
        var sv = servicos[s] || {}
        var nome = String(sv.servico || '').trim()
        var valor = Number(sv.valor_mensal)
        if (SERVICOS_L.indexOf(nome) < 0) err.push('servico inválido: ' + nome)
        else if (!Number.isFinite(valor) || valor <= 0) err.push('valor_mensal > 0 p/ ' + nome)
        else servOk.push({ servico: nome, valor_mensal: valor })
      }
      if (err.length > 0) {
        erros.push({ planilha: 'A', linha: i + 1, erros: err })
        continue
      }
      var empresaExistente = empresaPorCnpj(cnpj)
      var contatoExistente = contatoPorEmail(cEmail)
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
      var item = {
        linha: i + 1,
        razao_social: razao,
        cnpj: cnpj,
        contato_nome: cNome,
        contato_email: cEmail,
        telefone: telefone,
        setor: setor,
        sistema: SISTEMAS_L.indexOf(sistema) >= 0 ? sistema : 'outro',
        sistema_outro: SISTEMAS_L.indexOf(sistema) >= 0 ? '' : sistemaOutro,
        data_inicio: dataInicio,
        vigencia: vigencia,
        natureza_registro: natureza,
        cargo_contato: cargo,
        analista_titular: analistaNome,
        analista_id: analista ? analista.id : '',
        servicos: servOk,
        empresa_existente_id: empresaExistente ? empresaExistente.id : '',
        contato_existente_id: contatoExistente ? contatoExistente.id : '',
        acao_empresa: acaoEmpresa,
        acao_contato: acaoContato,
      }
      validasA.push(item)
      mapaCnpj[cnpj] = item
    }
    // ---- planilha B ----
    var validasB = [],
      avisosB = []
    var dupB = 0
    for (var b = 0; b < linhasB.length; b++) {
      var B = linhasB[b] || {}
      var errB = []
      var cnpjB = soDigitos(B.cnpj)
      var nomeB = String(B.nome || '').trim()
      var emailB = String(B.email || '')
        .trim()
        .toLowerCase()
      var telB = String(B.telefone || '').trim()
      var cargoB = String(B.cargo || '').trim()
      var papeis = normPapeis(B.papel_operacional)
      if (!cnpjValido(cnpjB)) errB.push('CNPJ inválido')
      if (!nomeB) errB.push('nome obrigatório')
      if (emailB && emailB.indexOf('@') < 1) errB.push('email inválido')
      if (!papeis)
        errB.push(
          'papel_operacional inválido (autoriza_projecao | aprova_banco | aprova_faturamento | envia_informacao | apenas_informado, múltiplos separados por |)',
        )
      // CA-3-122: CNPJ precisa constar da planilha A ou da base
      var empresaAlvo = mapaCnpj[cnpjB] ? mapaCnpj[cnpjB] : null
      var empresaBaseId = ''
      if (!empresaAlvo) {
        var empBase = empresaPorCnpj(cnpjB)
        if (empBase) empresaBaseId = empBase.id
        else errB.push('CNPJ não consta da planilha A nem da base (CA-3-122)')
      }
      if (errB.length > 0) {
        erros.push({ planilha: 'B', linha: b + 1, erros: errB })
        continue
      }
      var itemB = {
        linha: b + 1,
        cnpj: cnpjB,
        nome: nomeB,
        email: emailB,
        telefone: telB,
        cargo: cargoB,
        papeis: papeis,
      }
      // destino: mesma pessoa do principal (CA-3-125)?
      itemB.mesmo_principal = false
      if (empresaAlvo && emailB && emailB === empresaAlvo.contato_email)
        itemB.mesmo_principal = true
      // CA-3-126/127: contato existente vinculado a outra empresa
      itemB.vinculo_existente_id = ''
      itemB.outra_empresa = ''
      if (emailB) {
        var existente = contatoPorEmail(emailB)
        if (existente) {
          dupB++
          var empAtual = String(existente.get('empresa') || '')
          var alvoId = empresaAlvo ? empresaAlvo.empresa_existente_id || '' : empresaBaseId
          if (empAtual && empAtual !== alvoId) {
            itemB.vinculo_existente_id = existente.id
            itemB.outra_empresa = nomeEmpresaSafe(empAtual)
            avisosB.push({
              linha: b + 1,
              nome: nomeB,
              outra_empresa: itemB.outra_empresa,
              aviso:
                'Contato já vinculado a "' +
                itemB.outra_empresa +
                '" — decisão manual obrigatória (vincular substitui o vínculo único; ignorar mantém como está).',
            })
          }
        }
      }
      validasB.push(itemB)
    }
    return {
      validas_a: validasA,
      validas_b: validasB,
      erros: erros,
      avisos_b: avisosB,
      dup_empresa: dupEmpresa,
      dup_contato: dupContato,
      dup_b: dupB,
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
  var linhasA = body.linhas
  if (!Array.isArray(linhasA) || linhasA.length === 0)
    return e.json(400, { error: 'Envie linhas[] da planilha A (empresas).' })
  var linhasB = Array.isArray(body.linhas_b) ? body.linhas_b : []
  var r = processar(linhasA, linhasB, body.dedup || {})
  if (r.erros.length > 0)
    return e.json(400, { error: 'Há linhas inválidas — corrija antes de gravar.', erros: r.erros })
  // CA-3-127: avisos de vínculo múltiplo exigem decisão explícita por linha
  var decisoesVinculo = body.decisoes_vinculo || {}
  for (var av = 0; av < r.avisos_b.length; av++) {
    var chave = 'B' + r.avisos_b[av].linha
    if (
      !decisoesVinculo[chave] ||
      (decisoesVinculo[chave] !== 'vincular' && decisoesVinculo[chave] !== 'ignorar')
    )
      return e.json(400, {
        error:
          'Decisão manual obrigatória (CA-3-127): linha B' +
          r.avisos_b[av].linha +
          ' (' +
          r.avisos_b[av].nome +
          ') já está vinculada a "' +
          r.avisos_b[av].outra_empresa +
          '". Envie decisoes_vinculo["' +
          chave +
          '"] = "vincular" | "ignorar".',
      })
  }
  var empresasCol = $app.findCollectionByNameOrId('empresas')
  var clientesCol = $app.findCollectionByNameOrId('clientes')
  var negociosCol = $app.findCollectionByNameOrId('negocios')
  var lotesCol = $app.findCollectionByNameOrId('importacoes_lotes')
  var fichasCol = $app.findCollectionByNameOrId('fichas_operacionais')
  var pessoasCol = $app.findCollectionByNameOrId('ficha_pessoas')
  var criados = { empresas: [], clientes: [], negocios: [], fichas: [], ficha_pessoas: [] }
  var atualizados = { empresas: [], clientes: [] }
  var ignorados = { empresas: 0, clientes: 0 }
  var contatoIdPorCnpj = {}
  var fichaIdPorCnpj = {}
  for (var i = 0; i < r.validas_a.length; i++) {
    var L = r.validas_a[i]
    var empresaId = L.empresa_existente_id
    if (empresaId && L.acao_empresa === 'atualizar') {
      var empUp = $app.findRecordById('empresas', empresaId)
      empUp.set('nome', L.razao_social)
      empUp.set('setor', L.setor || empUp.get('setor'))
      empUp.set('status', 'ativa')
      empUp.set('natureza_registro', L.natureza_registro)
      $app.save(empUp)
      atualizados.empresas.push(empresaId)
    } else if (!empresaId) {
      var emp = new Record(empresasCol)
      emp.set('nome', L.razao_social)
      emp.set('cnpj', L.cnpj)
      emp.set('setor', L.setor)
      emp.set('status', 'ativa')
      emp.set('natureza_registro', L.natureza_registro)
      $app.save(emp)
      empresaId = emp.id
      criados.empresas.push(empresaId)
    } else {
      ignorados.empresas++
    }
    // CA-3-128: ficha operacional automática (só se a empresa não tiver)
    var fichaId = ''
    var fichaExistente = null
    var fs = $app.findRecordsByFilter('fichas_operacionais', 'empresa = {:e}', '', 1, 0, {
      e: empresaId,
    })
    if (fs.length > 0) fichaExistente = fs[0]
    if (!fichaExistente) {
      var ficha = new Record(fichasCol)
      ficha.set('empresa', empresaId)
      ficha.set('status_operacional', 'em_implantacao')
      ficha.set('data_inicio_operacao', L.data_inicio)
      if (L.analista_id) ficha.set('responsavel_principal', L.analista_id)
      if (L.sistema !== 'outro') ficha.set('sistema', L.sistema)
      else if (L.sistema_outro) ficha.set('sistema', 'outro')
      $app.save(ficha)
      fichaId = ficha.id
      criados.fichas.push(fichaId)
    } else {
      fichaId = fichaExistente.id
    }
    fichaIdPorCnpj[L.cnpj] = fichaId
    // contato principal
    var contatoId = L.contato_existente_id
    if (contatoId && L.acao_contato === 'atualizar') {
      var cliUp = $app.findRecordById('clientes', contatoId)
      cliUp.set('nome', L.contato_nome)
      cliUp.set('telefone', L.telefone || cliUp.get('telefone'))
      cliUp.set('empresa', empresaId)
      cliUp.set('status', 'ativo')
      cliUp.set('cargo', L.cargo_contato)
      $app.save(cliUp)
      atualizados.clientes.push(contatoId)
    } else if (!contatoId) {
      var cli = new Record(clientesCol)
      cli.set('nome', L.contato_nome)
      cli.set('email', L.contato_email)
      cli.set('telefone', L.telefone)
      cli.set('empresa', empresaId)
      cli.set('status', 'ativo')
      cli.set('cargo', L.cargo_contato)
      $app.save(cli)
      contatoId = cli.id
      criados.clientes.push(contatoId)
    } else {
      ignorados.clientes++
    }
    contatoIdPorCnpj[L.cnpj] = contatoId
    // bloco 9: contato principal na ficha (sem papel definido na planilha A — apenas_informado não é assumido)
    var jaTem = $app.findRecordsByFilter(
      'ficha_pessoas',
      'ficha = "{:f}" && contato = "{:c}"',
      '',
      1,
      0,
      { f: fichaId, c: contatoId },
    )
    if (jaTem.length === 0) {
      var fp = new Record(pessoasCol)
      fp.set('ficha', fichaId)
      fp.set('contato', contatoId)
      fp.set('ativo', true)
      $app.save(fp)
      criados.ficha_pessoas.push(fp.id)
    }
    // negócios por serviço (migração) — APENAS natureza 'cliente' (CA-3-120: grupo/projeto fora de carteira/MRR)
    for (var s = 0; s < (L.natureza_registro === 'cliente' ? L.servicos.length : 0); s++) {
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
      neg.set('responsavel', L.analista_id || actor.id)
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
  // ---- planilha B: contatos adicionais + bloco 9 ----
  for (var b = 0; b < r.validas_b.length; b++) {
    var B = r.validas_b[b]
    var alvoCnpj = B.cnpj
    var fichaB = fichaIdPorCnpj[alvoCnpj]
    var empresaBId = ''
    if (!fichaB) {
      var empBase = empresaPorCnpj(alvoCnpj)
      empresaBId = empBase ? empBase.id : ''
      var fsB = $app.findRecordsByFilter('fichas_operacionais', 'empresa = {:e}', '', 1, 0, {
        e: empresaBId,
      })
      fichaB = fsB.length ? fsB[0].id : ''
    } else {
      for (var va = 0; va < r.validas_a.length; va++)
        if (r.validas_a[va].cnpj === alvoCnpj) {
          empresaBId = r.validas_a[va].empresa_existente_id || ''
          break
        }
      if (!empresaBId) {
        var eb2 = empresaPorCnpj(alvoCnpj)
        empresaBId = eb2 ? eb2.id : ''
      }
    }
    var decisao = decisoesVinculo['B' + B.linha] || ''
    var contatoBId = ''
    // CA-3-125: mesmo e-mail do principal = mesma pessoa, papéis somados
    if (B.mesmo_principal) {
      contatoBId = contatoIdPorCnpj[alvoCnpj]
      if (!contatoBId) {
        var principal = contatoPorEmail(B.email)
        contatoBId = principal ? principal.id : ''
      }
    } else if (B.vinculo_existente_id && decisao === 'vincular') {
      var cliB = $app.findRecordById('clientes', B.vinculo_existente_id)
      cliB.set('empresa', empresaBId)
      cliB.set('cargo', B.cargo || cliB.get('cargo'))
      if (B.telefone) cliB.set('telefone', B.telefone)
      $app.save(cliB)
      contatoBId = B.vinculo_existente_id
      atualizados.clientes.push(contatoBId)
    } else if (B.vinculo_existente_id && decisao === 'ignorar') {
      contatoBId = B.vinculo_existente_id
    } else if (!B.vinculo_existente_id) {
      var novoB = new Record(clientesCol)
      novoB.set('nome', B.nome)
      novoB.set('email', B.email)
      novoB.set('telefone', B.telefone)
      novoB.set('empresa', empresaBId)
      novoB.set('status', 'ativo')
      novoB.set('cargo', B.cargo)
      $app.save(novoB)
      contatoBId = novoB.id
      criados.clientes.push(contatoBId)
    }
    if (!contatoBId || !fichaB) continue
    // bloco 9: papel operacional (somar se já existe — CA-3-125)
    var existentes = $app.findRecordsByFilter(
      'ficha_pessoas',
      'ficha = "{:f}" && contato = "{:c}"',
      '',
      1,
      0,
      { f: fichaB, c: contatoBId },
    )
    if (existentes.length > 0) {
      var fpUp = existentes[0]
      var atuais = fpUp.get('papel_operacional') || []
      if (!Array.isArray(atuais)) atuais = []
      for (var p = 0; p < B.papeis.length; p++)
        if (atuais.indexOf(B.papeis[p]) < 0) atuais.push(B.papeis[p])
      fpUp.set('papel_operacional', atuais)
      fpUp.set('ativo', true)
      $app.save(fpUp)
    } else {
      var fpB = new Record(pessoasCol)
      fpB.set('ficha', fichaB)
      fpB.set('contato', contatoBId)
      fpB.set('papel_operacional', B.papeis)
      fpB.set('ativo', true)
      $app.save(fpB)
      criados.ficha_pessoas.push(fpB.id)
    }
  }
  var lote = new Record(lotesCol)
  lote.set('tipo', 'tipo1_clientes_ativos')
  lote.set('arquivo_nome', String(body.arquivo_nome || 'colado'))
  lote.set('origem_base', String(body.origem_base || ''))
  lote.set('status', 'aplicado')
  lote.set('contagens', {
    enviado: linhasA.length,
    enviado_b: linhasB.length,
    validas: r.validas_a.length,
    validas_b: r.validas_b.length,
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
    tipo: 'tipo1_v4',
    criados: criados,
    atualizados: atualizados,
    ignorados: ignorados,
  })
  return e.json(200, {
    lote_id: lote.id,
    criados: criados,
    atualizados: atualizados,
    ignorados: ignorados,
    aviso:
      'Lote registrado e desfazível via POST /importador/{id}/desfazer. Fichas criadas em em_implantacao — só bloco 9 preenchido (CA-3-128/129).',
  })
})

routerAdd('POST', '/backend/v1/importador/{id}/desfazer', (e) => {
  var SISTEMAS_L = ['omie', 'nibo', 'olist', 'profilm', 'controle']
  var SERVICOS_L = ['bpo_financeiro', 'tesouraria', 'controladoria', 'cfo_as_a_service', 'outro']
  var NATUREZAS_L = ['cliente', 'empresa_grupo', 'projeto']
  var PAPEIS_L = [
    'autoriza_projecao',
    'aprova_banco',
    'aprova_faturamento',
    'envia_informacao',
    'apenas_informado',
  ]

  function soDigitos(s) {
    return String(s || '').replace(/\D/g, '')
  }
  function cnpjValido(c) {
    var d = soDigitos(c)
    if (d.length !== 14) return false
    if (/^(\d)\1+$/.test(d)) return false
    var P1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
      P2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    var s1 = 0
    for (var i = 0; i < 12; i++) s1 += Number(d[i]) * P1[i]
    var dv1 = s1 % 11 < 2 ? 0 : 11 - (s1 % 11)
    if (Number(d[12]) !== dv1) return false
    var s2 = 0
    for (var j = 0; j < 13; j++) s2 += Number(d[j]) * P2[j]
    var dv2 = s2 % 11 < 2 ? 0 : 11 - (s2 % 11)
    return Number(d[13]) === dv2
  }
  function normNatureza(s) {
    var t = String(s || '')
      .trim()
      .toLowerCase()
    if (t === 'cliente') return 'cliente'
    if (
      t === 'empresa do grupo' ||
      t === 'empresa_grupo' ||
      t === 'grupo' ||
      t === 'empresa do grupo '
    )
      return 'empresa_grupo'
    if (t === 'projeto') return 'projeto'
    return ''
  }
  function normPapel(s) {
    var t = String(s || '')
      .trim()
      .toLowerCase()
    if (PAPEIS_L.indexOf(t) >= 0) return t
    if (t.indexOf('autoriza') >= 0 && t.indexOf('proje') >= 0) return 'autoriza_projecao'
    if (t.indexOf('banco') >= 0) return 'aprova_banco'
    if (t.indexOf('faturamento') >= 0) return 'aprova_faturamento'
    if (t.indexOf('envia') >= 0) return 'envia_informacao'
    if (t.indexOf('informado') >= 0) return 'apenas_informado'
    return ''
  }
  function normPapeis(s) {
    var partes = String(s || '').split('|')
    var out = []
    for (var i = 0; i < partes.length; i++) {
      var p = normPapel(partes[i])
      if (!p) return null
      if (out.indexOf(p) < 0) out.push(p)
    }
    return out.length ? out : null
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
  function usuarioPorNome(nome) {
    var t = String(nome || '')
      .trim()
      .toLowerCase()
    if (!t) return null
    try {
      var us = $app.findRecordsByFilter('users', 'verified = true', '', 100, 0)
      for (var i = 0; i < us.length; i++) {
        var n = String(us[i].get('name') || '')
          .trim()
          .toLowerCase()
        if (n && n === t) return us[i]
      }
    } catch (_) {}
    return null
  }
  function empresaPorCnpj(cnpj) {
    try {
      var f = $app.findRecordsByFilter('empresas', 'cnpj = "' + cnpj + '"', '', 1, 0)
      return f.length ? f[0] : null
    } catch (_) {
      return null
    }
  }
  function contatoPorEmail(email) {
    try {
      var f = $app.findRecordsByFilter(
        'clientes',
        'email = "' + String(email).replace(/"/g, '') + '"',
        '',
        1,
        0,
      )
      return f.length ? f[0] : null
    } catch (_) {
      return null
    }
  }
  function nomeEmpresaSafe(id) {
    try {
      return String($app.findRecordById('empresas', id).get('nome') || '')
    } catch (_) {
      return ''
    }
  }

  // ---- processa planilha A + B; retorna {validas_a, validas_b, erros, avisos_b, contagens} ----
  function processar(linhasA, linhasB, dedup) {
    var validasA = [],
      erros = [],
      mapaCnpj = {}
    var dupEmpresa = 0,
      dupContato = 0,
      atualizaEmpresa = 0,
      atualizaContato = 0
    for (var i = 0; i < linhasA.length; i++) {
      var L = linhasA[i] || {}
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
      var natureza = normNatureza(L.natureza_registro)
      var cargo = String(L.cargo_contato || '').trim()
      var analistaNome = String(L.analista_titular || '').trim()
      var servicos = Array.isArray(L.servicos) ? L.servicos : []
      if (!razao) err.push('razao_social obrigatória')
      if (!cnpjValido(cnpj)) err.push('CNPJ inválido')
      if (!cNome) err.push('contato_nome obrigatório')
      if (!cEmail || cEmail.indexOf('@') < 1) err.push('contato_email obrigatório/inválido')
      if (SISTEMAS_L.indexOf(sistema) < 0 && !sistemaOutro)
        err.push('sistema obrigatório (lista ou sistema_outro)')
      if (!dataInicio || isNaN(Date.parse(dataInicio.replace(' ', 'T'))))
        err.push('data_inicio inválida (YYYY-MM-DD)')
      if (!natureza)
        err.push('natureza_registro obrigatória (cliente | empresa do grupo | projeto)')
      if (!cargo) err.push('cargo_contato obrigatório')
      var analista = null
      if (!analistaNome) err.push('analista_titular obrigatório')
      else {
        analista = usuarioPorNome(analistaNome)
        if (!analista) err.push('analista_titular inválido: ' + analistaNome)
      }
      var servOk = []
      if (servicos.length === 0) err.push('pelo menos um serviço')
      for (var s = 0; s < servicos.length; s++) {
        var sv = servicos[s] || {}
        var nome = String(sv.servico || '').trim()
        var valor = Number(sv.valor_mensal)
        if (SERVICOS_L.indexOf(nome) < 0) err.push('servico inválido: ' + nome)
        else if (!Number.isFinite(valor) || valor <= 0) err.push('valor_mensal > 0 p/ ' + nome)
        else servOk.push({ servico: nome, valor_mensal: valor })
      }
      if (err.length > 0) {
        erros.push({ planilha: 'A', linha: i + 1, erros: err })
        continue
      }
      var empresaExistente = empresaPorCnpj(cnpj)
      var contatoExistente = contatoPorEmail(cEmail)
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
      var item = {
        linha: i + 1,
        razao_social: razao,
        cnpj: cnpj,
        contato_nome: cNome,
        contato_email: cEmail,
        telefone: telefone,
        setor: setor,
        sistema: SISTEMAS_L.indexOf(sistema) >= 0 ? sistema : 'outro',
        sistema_outro: SISTEMAS_L.indexOf(sistema) >= 0 ? '' : sistemaOutro,
        data_inicio: dataInicio,
        vigencia: vigencia,
        natureza_registro: natureza,
        cargo_contato: cargo,
        analista_titular: analistaNome,
        analista_id: analista ? analista.id : '',
        servicos: servOk,
        empresa_existente_id: empresaExistente ? empresaExistente.id : '',
        contato_existente_id: contatoExistente ? contatoExistente.id : '',
        acao_empresa: acaoEmpresa,
        acao_contato: acaoContato,
      }
      validasA.push(item)
      mapaCnpj[cnpj] = item
    }
    // ---- planilha B ----
    var validasB = [],
      avisosB = []
    var dupB = 0
    for (var b = 0; b < linhasB.length; b++) {
      var B = linhasB[b] || {}
      var errB = []
      var cnpjB = soDigitos(B.cnpj)
      var nomeB = String(B.nome || '').trim()
      var emailB = String(B.email || '')
        .trim()
        .toLowerCase()
      var telB = String(B.telefone || '').trim()
      var cargoB = String(B.cargo || '').trim()
      var papeis = normPapeis(B.papel_operacional)
      if (!cnpjValido(cnpjB)) errB.push('CNPJ inválido')
      if (!nomeB) errB.push('nome obrigatório')
      if (emailB && emailB.indexOf('@') < 1) errB.push('email inválido')
      if (!papeis)
        errB.push(
          'papel_operacional inválido (autoriza_projecao | aprova_banco | aprova_faturamento | envia_informacao | apenas_informado, múltiplos separados por |)',
        )
      // CA-3-122: CNPJ precisa constar da planilha A ou da base
      var empresaAlvo = mapaCnpj[cnpjB] ? mapaCnpj[cnpjB] : null
      var empresaBaseId = ''
      if (!empresaAlvo) {
        var empBase = empresaPorCnpj(cnpjB)
        if (empBase) empresaBaseId = empBase.id
        else errB.push('CNPJ não consta da planilha A nem da base (CA-3-122)')
      }
      if (errB.length > 0) {
        erros.push({ planilha: 'B', linha: b + 1, erros: errB })
        continue
      }
      var itemB = {
        linha: b + 1,
        cnpj: cnpjB,
        nome: nomeB,
        email: emailB,
        telefone: telB,
        cargo: cargoB,
        papeis: papeis,
      }
      // destino: mesma pessoa do principal (CA-3-125)?
      itemB.mesmo_principal = false
      if (empresaAlvo && emailB && emailB === empresaAlvo.contato_email)
        itemB.mesmo_principal = true
      // CA-3-126/127: contato existente vinculado a outra empresa
      itemB.vinculo_existente_id = ''
      itemB.outra_empresa = ''
      if (emailB) {
        var existente = contatoPorEmail(emailB)
        if (existente) {
          dupB++
          var empAtual = String(existente.get('empresa') || '')
          var alvoId = empresaAlvo ? empresaAlvo.empresa_existente_id || '' : empresaBaseId
          if (empAtual && empAtual !== alvoId) {
            itemB.vinculo_existente_id = existente.id
            itemB.outra_empresa = nomeEmpresaSafe(empAtual)
            avisosB.push({
              linha: b + 1,
              nome: nomeB,
              outra_empresa: itemB.outra_empresa,
              aviso:
                'Contato já vinculado a "' +
                itemB.outra_empresa +
                '" — decisão manual obrigatória (vincular substitui o vínculo único; ignorar mantém como está).',
            })
          }
        }
      }
      validasB.push(itemB)
    }
    return {
      validas_a: validasA,
      validas_b: validasB,
      erros: erros,
      avisos_b: avisosB,
      dup_empresa: dupEmpresa,
      dup_contato: dupContato,
      dup_b: dupB,
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
  if (!Array.isArray(criados.fichas)) criados.fichas = []
  if (!Array.isArray(criados.ficha_pessoas)) criados.ficha_pessoas = []
  var removidos = { negocios: 0, clientes: 0, empresas: 0, fichas: 0, ficha_pessoas: 0 }
  // CA-3-124: remove as duas planilhas — ficha_pessoas, fichas, negócios, contatos, empresas
  for (var fp = 0; fp < criados.ficha_pessoas.length; fp++) {
    try {
      $app.delete($app.findRecordById('ficha_pessoas', criados.ficha_pessoas[fp]))
      removidos.ficha_pessoas++
    } catch (errFP) {
      console.log('T322v4 delete ficha_pessoa falhou:', criados.ficha_pessoas[fp], String(errFP))
    }
  }
  for (var fi = 0; fi < criados.fichas.length; fi++) {
    try {
      $app.delete($app.findRecordById('fichas_operacionais', criados.fichas[fi]))
      removidos.fichas++
    } catch (errF) {
      console.log('T322v4 delete ficha falhou:', criados.fichas[fi], String(errF))
    }
  }
  for (var i = 0; i < criados.negocios.length; i++) {
    try {
      var perms = $app.findRecordsByFilter(
        'permanencias_negocio',
        'negocio = "' + criados.negocios[i] + '"',
        '',
        500,
        0,
      )
      for (var p = 0; p < perms.length; p++) {
        try {
          $app.delete(perms[p])
        } catch (errPerm) {
          console.log('T322 delete permanencia falhou:', criados.negocios[i], String(errPerm))
        }
      }
      $app.delete($app.findRecordById('negocios', criados.negocios[i]))
      removidos.negocios++
    } catch (errNeg) {
      console.log('T322 delete negocio falhou:', criados.negocios[i], String(errNeg))
    }
  }
  for (var j = 0; j < criados.clientes.length; j++) {
    try {
      $app.delete($app.findRecordById('clientes', criados.clientes[j]))
      removidos.clientes++
    } catch (errCli) {
      console.log('T322 delete cliente falhou:', criados.clientes[j], String(errCli))
    }
  }
  for (var k = 0; k < criados.empresas.length; k++) {
    try {
      $app.delete($app.findRecordById('empresas', criados.empresas[k]))
      removidos.empresas++
    } catch (errEmp) {
      console.log('T322 delete empresa falhou:', criados.empresas[k], String(errEmp))
    }
  }
  lote.set('status', 'desfeito')
  lote.set('desfeito_em', new Date().toISOString())
  $app.save(lote)
  auditar(actor, 'importacao_desfeita', lote.id, { removidos: removidos })
  return e.json(200, { lote_id: id, removidos: removidos, status: 'desfeito' })
})

routerAdd('GET', '/backend/v1/importador/lotes', (e) => {
  var SISTEMAS_L = ['omie', 'nibo', 'olist', 'profilm', 'controle']
  var SERVICOS_L = ['bpo_financeiro', 'tesouraria', 'controladoria', 'cfo_as_a_service', 'outro']
  var NATUREZAS_L = ['cliente', 'empresa_grupo', 'projeto']
  var PAPEIS_L = [
    'autoriza_projecao',
    'aprova_banco',
    'aprova_faturamento',
    'envia_informacao',
    'apenas_informado',
  ]

  function soDigitos(s) {
    return String(s || '').replace(/\D/g, '')
  }
  function cnpjValido(c) {
    var d = soDigitos(c)
    if (d.length !== 14) return false
    if (/^(\d)\1+$/.test(d)) return false
    var P1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
      P2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    var s1 = 0
    for (var i = 0; i < 12; i++) s1 += Number(d[i]) * P1[i]
    var dv1 = s1 % 11 < 2 ? 0 : 11 - (s1 % 11)
    if (Number(d[12]) !== dv1) return false
    var s2 = 0
    for (var j = 0; j < 13; j++) s2 += Number(d[j]) * P2[j]
    var dv2 = s2 % 11 < 2 ? 0 : 11 - (s2 % 11)
    return Number(d[13]) === dv2
  }
  function normNatureza(s) {
    var t = String(s || '')
      .trim()
      .toLowerCase()
    if (t === 'cliente') return 'cliente'
    if (
      t === 'empresa do grupo' ||
      t === 'empresa_grupo' ||
      t === 'grupo' ||
      t === 'empresa do grupo '
    )
      return 'empresa_grupo'
    if (t === 'projeto') return 'projeto'
    return ''
  }
  function normPapel(s) {
    var t = String(s || '')
      .trim()
      .toLowerCase()
    if (PAPEIS_L.indexOf(t) >= 0) return t
    if (t.indexOf('autoriza') >= 0 && t.indexOf('proje') >= 0) return 'autoriza_projecao'
    if (t.indexOf('banco') >= 0) return 'aprova_banco'
    if (t.indexOf('faturamento') >= 0) return 'aprova_faturamento'
    if (t.indexOf('envia') >= 0) return 'envia_informacao'
    if (t.indexOf('informado') >= 0) return 'apenas_informado'
    return ''
  }
  function normPapeis(s) {
    var partes = String(s || '').split('|')
    var out = []
    for (var i = 0; i < partes.length; i++) {
      var p = normPapel(partes[i])
      if (!p) return null
      if (out.indexOf(p) < 0) out.push(p)
    }
    return out.length ? out : null
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
  function usuarioPorNome(nome) {
    var t = String(nome || '')
      .trim()
      .toLowerCase()
    if (!t) return null
    try {
      var us = $app.findRecordsByFilter('users', 'verified = true', '', 100, 0)
      for (var i = 0; i < us.length; i++) {
        var n = String(us[i].get('name') || '')
          .trim()
          .toLowerCase()
        if (n && n === t) return us[i]
      }
    } catch (_) {}
    return null
  }
  function empresaPorCnpj(cnpj) {
    try {
      var f = $app.findRecordsByFilter('empresas', 'cnpj = "' + cnpj + '"', '', 1, 0)
      return f.length ? f[0] : null
    } catch (_) {
      return null
    }
  }
  function contatoPorEmail(email) {
    try {
      var f = $app.findRecordsByFilter(
        'clientes',
        'email = "' + String(email).replace(/"/g, '') + '"',
        '',
        1,
        0,
      )
      return f.length ? f[0] : null
    } catch (_) {
      return null
    }
  }
  function nomeEmpresaSafe(id) {
    try {
      return String($app.findRecordById('empresas', id).get('nome') || '')
    } catch (_) {
      return ''
    }
  }

  // ---- processa planilha A + B; retorna {validas_a, validas_b, erros, avisos_b, contagens} ----
  function processar(linhasA, linhasB, dedup) {
    var validasA = [],
      erros = [],
      mapaCnpj = {}
    var dupEmpresa = 0,
      dupContato = 0,
      atualizaEmpresa = 0,
      atualizaContato = 0
    for (var i = 0; i < linhasA.length; i++) {
      var L = linhasA[i] || {}
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
      var natureza = normNatureza(L.natureza_registro)
      var cargo = String(L.cargo_contato || '').trim()
      var analistaNome = String(L.analista_titular || '').trim()
      var servicos = Array.isArray(L.servicos) ? L.servicos : []
      if (!razao) err.push('razao_social obrigatória')
      if (!cnpjValido(cnpj)) err.push('CNPJ inválido')
      if (!cNome) err.push('contato_nome obrigatório')
      if (!cEmail || cEmail.indexOf('@') < 1) err.push('contato_email obrigatório/inválido')
      if (SISTEMAS_L.indexOf(sistema) < 0 && !sistemaOutro)
        err.push('sistema obrigatório (lista ou sistema_outro)')
      if (!dataInicio || isNaN(Date.parse(dataInicio.replace(' ', 'T'))))
        err.push('data_inicio inválida (YYYY-MM-DD)')
      if (!natureza)
        err.push('natureza_registro obrigatória (cliente | empresa do grupo | projeto)')
      if (!cargo) err.push('cargo_contato obrigatório')
      var analista = null
      if (!analistaNome) err.push('analista_titular obrigatório')
      else {
        analista = usuarioPorNome(analistaNome)
        if (!analista) err.push('analista_titular inválido: ' + analistaNome)
      }
      var servOk = []
      if (servicos.length === 0) err.push('pelo menos um serviço')
      for (var s = 0; s < servicos.length; s++) {
        var sv = servicos[s] || {}
        var nome = String(sv.servico || '').trim()
        var valor = Number(sv.valor_mensal)
        if (SERVICOS_L.indexOf(nome) < 0) err.push('servico inválido: ' + nome)
        else if (!Number.isFinite(valor) || valor <= 0) err.push('valor_mensal > 0 p/ ' + nome)
        else servOk.push({ servico: nome, valor_mensal: valor })
      }
      if (err.length > 0) {
        erros.push({ planilha: 'A', linha: i + 1, erros: err })
        continue
      }
      var empresaExistente = empresaPorCnpj(cnpj)
      var contatoExistente = contatoPorEmail(cEmail)
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
      var item = {
        linha: i + 1,
        razao_social: razao,
        cnpj: cnpj,
        contato_nome: cNome,
        contato_email: cEmail,
        telefone: telefone,
        setor: setor,
        sistema: SISTEMAS_L.indexOf(sistema) >= 0 ? sistema : 'outro',
        sistema_outro: SISTEMAS_L.indexOf(sistema) >= 0 ? '' : sistemaOutro,
        data_inicio: dataInicio,
        vigencia: vigencia,
        natureza_registro: natureza,
        cargo_contato: cargo,
        analista_titular: analistaNome,
        analista_id: analista ? analista.id : '',
        servicos: servOk,
        empresa_existente_id: empresaExistente ? empresaExistente.id : '',
        contato_existente_id: contatoExistente ? contatoExistente.id : '',
        acao_empresa: acaoEmpresa,
        acao_contato: acaoContato,
      }
      validasA.push(item)
      mapaCnpj[cnpj] = item
    }
    // ---- planilha B ----
    var validasB = [],
      avisosB = []
    var dupB = 0
    for (var b = 0; b < linhasB.length; b++) {
      var B = linhasB[b] || {}
      var errB = []
      var cnpjB = soDigitos(B.cnpj)
      var nomeB = String(B.nome || '').trim()
      var emailB = String(B.email || '')
        .trim()
        .toLowerCase()
      var telB = String(B.telefone || '').trim()
      var cargoB = String(B.cargo || '').trim()
      var papeis = normPapeis(B.papel_operacional)
      if (!cnpjValido(cnpjB)) errB.push('CNPJ inválido')
      if (!nomeB) errB.push('nome obrigatório')
      if (emailB && emailB.indexOf('@') < 1) errB.push('email inválido')
      if (!papeis)
        errB.push(
          'papel_operacional inválido (autoriza_projecao | aprova_banco | aprova_faturamento | envia_informacao | apenas_informado, múltiplos separados por |)',
        )
      // CA-3-122: CNPJ precisa constar da planilha A ou da base
      var empresaAlvo = mapaCnpj[cnpjB] ? mapaCnpj[cnpjB] : null
      var empresaBaseId = ''
      if (!empresaAlvo) {
        var empBase = empresaPorCnpj(cnpjB)
        if (empBase) empresaBaseId = empBase.id
        else errB.push('CNPJ não consta da planilha A nem da base (CA-3-122)')
      }
      if (errB.length > 0) {
        erros.push({ planilha: 'B', linha: b + 1, erros: errB })
        continue
      }
      var itemB = {
        linha: b + 1,
        cnpj: cnpjB,
        nome: nomeB,
        email: emailB,
        telefone: telB,
        cargo: cargoB,
        papeis: papeis,
      }
      // destino: mesma pessoa do principal (CA-3-125)?
      itemB.mesmo_principal = false
      if (empresaAlvo && emailB && emailB === empresaAlvo.contato_email)
        itemB.mesmo_principal = true
      // CA-3-126/127: contato existente vinculado a outra empresa
      itemB.vinculo_existente_id = ''
      itemB.outra_empresa = ''
      if (emailB) {
        var existente = contatoPorEmail(emailB)
        if (existente) {
          dupB++
          var empAtual = String(existente.get('empresa') || '')
          var alvoId = empresaAlvo ? empresaAlvo.empresa_existente_id || '' : empresaBaseId
          if (empAtual && empAtual !== alvoId) {
            itemB.vinculo_existente_id = existente.id
            itemB.outra_empresa = nomeEmpresaSafe(empAtual)
            avisosB.push({
              linha: b + 1,
              nome: nomeB,
              outra_empresa: itemB.outra_empresa,
              aviso:
                'Contato já vinculado a "' +
                itemB.outra_empresa +
                '" — decisão manual obrigatória (vincular substitui o vínculo único; ignorar mantém como está).',
            })
          }
        }
      }
      validasB.push(itemB)
    }
    return {
      validas_a: validasA,
      validas_b: validasB,
      erros: erros,
      avisos_b: avisosB,
      dup_empresa: dupEmpresa,
      dup_contato: dupContato,
      dup_b: dupB,
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
