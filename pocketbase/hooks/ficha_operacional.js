// T3.11 — SPEC-3-011 (Leva A): procedimento gerado + versionamento + bloqueio
// de credencial + acesso por carteira.
// Rotas:
//   GET  /backend/v1/fichas/{empresaId}              — ficha completa (com listas)
//   POST /backend/v1/fichas                          — cria ficha (admin)
//   PATCH /backend/v1/fichas/{id}                    — atualiza (auth; versiona)
//   GET  /backend/v1/fichas/{empresaId}/procedimento — texto gerado por serviço
//   GET  /backend/v1/fichas/{empresaId}/versoes      — histórico de versões
// REGRA DE OURO: nenhum campo aceita credencial — validação server-side rejeita
// valores com padrão de senha/token; campos item_cofre só aceitam identificadores.
// Acesso: admin tudo; operator só fichas onde é responsavel_principal ou reserva.
// Runtime goja: lógica inline em cada callback (AP-0200); datas PB " " → "T".

// Padrões de credencial — bloqueados em QUALQUER campo de texto.
var PADROES_CREDENCIAL = function () {
  return [
    /senha\s*[:=]/i,
    /password\s*[:=]/i,
    /token\s*[:=]/i,
    /chave\s*de\s*acesso/i,
    /api[_\s-]?key\s*[:=]/i,
    /Bearer\s+[A-Za-z0-9\-_.]{20,}/,
    /[A-Za-z0-9+/]{40,}={0,2}/, // base64 longo (possível segredo)
  ]
}

var temCredencial = function (obj) {
  var pads = PADROES_CREDENCIAL()
  for (var chave in obj) {
    var v = obj[chave]
    if (typeof v !== 'string') continue
    for (var i = 0; i < pads.length; i++) {
      if (pads[i].test(v)) return chave
    }
  }
  return null
}

var fichaDeEmpresa = function (empresaId) {
  var fs = $app.findRecordsByFilter('fichas_operacionais', 'empresa = {:e}', '', 1, 0, {
    e: empresaId,
  })
  return fs.length ? fs[0] : null
}

var podeVer = function (actor, ficha) {
  if (String(actor.get('role') || '') === 'admin') return true
  return (
    String(ficha.get('responsavel_principal') || '') === actor.id ||
    String(ficha.get('responsavel_reserva') || '') === actor.id
  )
}

// ---- GET ficha completa (com listas) ----
routerAdd(
  'GET',
  '/backend/v1/fichas/{empresaId}',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var ficha = fichaDeEmpresa(e.request.pathValue('empresaId'))
    if (!ficha) return e.json(404, { error: 'Ficha operacional não encontrada para esta empresa.' })
    if (!podeVer(actor, ficha)) return e.json(403, { error: 'Ficha fora da sua carteira.' })

    var canais = []
    var bancos = []
    var pessoas = []
    try {
      var cs = $app.findRecordsByFilter('ficha_canais', 'ficha = {:f}', '-created', 100, 0, {
        f: ficha.id,
      })
      for (var i = 0; i < cs.length; i++)
        canais.push({
          id: cs[i].id,
          tipo_canal: String(cs[i].get('tipo_canal') || ''),
          identificacao: String(cs[i].get('identificacao') || ''),
          frequencia_verificacao: String(cs[i].get('frequencia_verificacao') || ''),
          finalidade: String(cs[i].get('finalidade') || ''),
          observacao: String(cs[i].get('observacao') || ''),
        })
    } catch (_) {}
    try {
      var bs = $app.findRecordsByFilter('ficha_bancos', 'ficha = {:f}', '-created', 100, 0, {
        f: ficha.id,
      })
      for (var b = 0; b < bs.length; b++)
        bancos.push({
          id: bs[b].id,
          banco: String(bs[b].get('banco') || ''),
          apelido_conta: String(bs[b].get('apelido_conta') || ''),
          finalidade: String(bs[b].get('finalidade') || ''),
          perfil_acesso: String(bs[b].get('perfil_acesso') || ''),
          quem_aprova_no_banco: String(bs[b].get('quem_aprova_no_banco') || ''),
          item_cofre: String(bs[b].get('item_cofre') || ''),
          data_ultima_revisao_acesso: String(bs[b].get('data_ultima_revisao_acesso') || ''),
        })
    } catch (_) {}
    try {
      var ps = $app.findRecordsByFilter('ficha_pessoas', 'ficha = {:f}', '-created', 100, 0, {
        f: ficha.id,
      })
      for (var p = 0; p < ps.length; p++) {
        var contatoNome = ''
        try {
          contatoNome = String(
            $app.findRecordById('clientes', String(ps[p].get('contato') || '')).get('nome') || '',
          )
        } catch (_) {}
        pessoas.push({
          id: ps[p].id,
          contato: String(ps[p].get('contato') || ''),
          contato_nome: contatoNome,
          papel_operacional: String(ps[p].get('papel_operacional') || ''),
          canal_preferencial: String(ps[p].get('canal_preferencial') || ''),
          ativo: ps[p].get('ativo') === true,
        })
      }
    } catch (_) {}

    var nomeUsuario = function (id) {
      if (!id) return ''
      try {
        return String($app.findRecordById('_pb_users_auth_', String(id)).get('name') || '')
      } catch (_) {
        return ''
      }
    }

    return e.json(200, {
      id: ficha.id,
      empresa: String(ficha.get('empresa') || ''),
      status_operacional: String(ficha.get('status_operacional') || ''),
      data_inicio_operacao: String(ficha.get('data_inicio_operacao') || ''),
      responsavel_principal: String(ficha.get('responsavel_principal') || ''),
      responsavel_principal_nome: nomeUsuario(ficha.get('responsavel_principal')),
      responsavel_reserva: String(ficha.get('responsavel_reserva') || ''),
      responsavel_reserva_nome: nomeUsuario(ficha.get('responsavel_reserva')),
      servicos_contratados: String(ficha.get('servicos_contratados') || ''),
      fora_do_escopo: String(ficha.get('fora_do_escopo') || ''),
      volume_referencia_pagamentos: ficha.get('volume_referencia_pagamentos'),
      volume_referencia_notas: ficha.get('volume_referencia_notas'),
      sistema: String(ficha.get('sistema') || ''),
      identificacao_empresa_sistema: String(ficha.get('identificacao_empresa_sistema') || ''),
      item_cofre_sistema: String(ficha.get('item_cofre_sistema') || ''),
      periodicidade_projecao: String(ficha.get('periodicidade_projecao') || ''),
      dias_referencia: String(ficha.get('dias_referencia') || ''),
      autoriza_projecao: String(ficha.get('autoriza_projecao') || ''),
      canal_autorizacao: String(ficha.get('canal_autorizacao') || ''),
      prazo_resposta_horas: ficha.get('prazo_resposta_horas'),
      destino_comprovantes: String(ficha.get('destino_comprovantes') || ''),
      dia_emissao: String(ficha.get('dia_emissao') || ''),
      rotas_emissao: String(ficha.get('rotas_emissao') || ''),
      frequencia_conciliacao: String(ficha.get('frequencia_conciliacao') || ''),
      contabilidade_nome: String(ficha.get('contabilidade_nome') || ''),
      prazo_entrega: String(ficha.get('prazo_entrega') || ''),
      canais: canais,
      bancos: bancos,
      pessoas: pessoas,
    })
  },
  $apis.requireAuth(),
)

// ---- POST criar ficha (admin) ----
routerAdd(
  'POST',
  '/backend/v1/fichas',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    if (String(actor.get('role') || '') !== 'admin') {
      return e.json(403, { error: 'Criação de ficha é exclusiva de administradores.' })
    }
    var body = e.requestInfo().body || {}
    var empresaId = String(body.empresa || '').trim()
    if (!empresaId) return e.json(400, { error: 'Informe a empresa.' })
    try {
      $app.findRecordById('empresas', empresaId)
    } catch (_) {
      return e.json(400, { error: 'Empresa não encontrada.' })
    }
    if (fichaDeEmpresa(empresaId)) {
      return e.json(400, { error: 'Esta empresa já possui ficha operacional.' })
    }
    var campoCred = temCredencial(body)
    if (campoCred) {
      return e.json(400, {
        error:
          'O campo "' +
          campoCred +
          '" parece conter credencial. Registre apenas o IDENTIFICADOR do item no cofre de senhas.',
      })
    }
    var col = $app.findCollectionByNameOrId('fichas_operacionais')
    var rec = new Record(col)
    rec.set('empresa', empresaId)
    if (body.status_operacional) rec.set('status_operacional', String(body.status_operacional))
    var campos = [
      'data_inicio_operacao',
      'responsavel_principal',
      'responsavel_reserva',
      'servicos_contratados',
      'fora_do_escopo',
      'volume_referencia_pagamentos',
      'volume_referencia_notas',
      'sistema',
      'sistema_outro',
      'identificacao_empresa_sistema',
      'modulos_utilizados',
      'item_cofre_sistema',
      'periodicidade_projecao',
      'dias_referencia',
      'janela_coberta',
      'regra_conta_fixa',
      'regra_conta_variavel',
      'autoriza_projecao',
      'canal_autorizacao',
      'prazo_resposta_horas',
      'antecipacao_pagamento',
      'destino_comprovantes',
      'estrutura_adicional',
      'controle_externo_cliente',
      'origem_informacao',
      'dia_envio_relatorio',
      'aprova_relatorio',
      'dia_emissao',
      'rotas_emissao',
      'regra_rota',
      'destinatarios_nota',
      'cancelar_previsao',
      'destino_notas',
      'prazo_validacao_final',
      'regra_cobranca',
      'frequencia_conciliacao',
      'responsavel_conciliacao',
      'origem_extrato',
      'destino_comprovantes_conc',
      'controle_externo_conc',
      'contabilidade_nome',
      'contabilidade_contato',
      'formato_entrega',
      'canal_entrega',
      'prazo_entrega',
      'documentos_exigidos',
      'particularidades_fechamento',
    ]
    for (var i = 0; i < campos.length; i++) {
      var c = campos[i]
      if (body[c] !== undefined && body[c] !== null && body[c] !== '') rec.set(c, body[c])
    }
    try {
      $app.save(rec)
    } catch (err) {
      return e.json(400, { error: 'Falha ao salvar ficha: ' + String(err) })
    }
    // Auditoria
    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var ev = new Record(audit)
      ev.set('entidade', 'fichas_operacionais')
      ev.set('registro_id', rec.id)
      ev.set('acao', 'create')
      ev.set('ator_id', actor.id)
      ev.set('ocorrido_em', new Date().toISOString())
      ev.set('estado_anterior', '')
      ev.set('estado_posterior', JSON.stringify({ empresa: empresaId }))
      $app.save(ev)
    } catch (_) {}
    return e.json(200, { ok: true, id: rec.id })
  },
  $apis.requireAuth(),
)

// ---- PATCH atualizar ficha (auth; versiona procedimento) ----
routerAdd(
  'PATCH',
  '/backend/v1/fichas/{id}',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var ficha
    try {
      ficha = $app.findRecordById('fichas_operacionais', e.request.pathValue('id'))
    } catch (_) {
      return e.json(404, { error: 'Ficha não encontrada.' })
    }
    if (!podeVer(actor, ficha)) return e.json(403, { error: 'Ficha fora da sua carteira.' })
    var body = e.requestInfo().body || {}
    var campoCred = temCredencial(body)
    if (campoCred) {
      return e.json(400, {
        error:
          'O campo "' +
          campoCred +
          '" parece conter credencial. Registre apenas o IDENTIFICADOR do item no cofre de senhas.',
      })
    }
    var campos = [
      'status_operacional',
      'data_inicio_operacao',
      'responsavel_principal',
      'responsavel_reserva',
      'servicos_contratados',
      'fora_do_escopo',
      'volume_referencia_pagamentos',
      'volume_referencia_notas',
      'sistema',
      'sistema_outro',
      'identificacao_empresa_sistema',
      'modulos_utilizados',
      'item_cofre_sistema',
      'periodicidade_projecao',
      'dias_referencia',
      'janela_coberta',
      'regra_conta_fixa',
      'regra_conta_variavel',
      'autoriza_projecao',
      'canal_autorizacao',
      'prazo_resposta_horas',
      'antecipacao_pagamento',
      'destino_comprovantes',
      'estrutura_adicional',
      'controle_externo_cliente',
      'origem_informacao',
      'dia_envio_relatorio',
      'aprova_relatorio',
      'dia_emissao',
      'rotas_emissao',
      'regra_rota',
      'destinatarios_nota',
      'cancelar_previsao',
      'destino_notas',
      'prazo_validacao_final',
      'regra_cobranca',
      'frequencia_conciliacao',
      'responsavel_conciliacao',
      'origem_extrato',
      'destino_comprovantes_conc',
      'controle_externo_conc',
      'contabilidade_nome',
      'contabilidade_contato',
      'formato_entrega',
      'canal_entrega',
      'prazo_entrega',
      'documentos_exigidos',
      'particularidades_fechamento',
    ]
    var alterados = []
    var antes = {}
    for (var i = 0; i < campos.length; i++) {
      var c = campos[i]
      if (body[c] === undefined) continue
      var vAntes = String(ficha.get(c) || '')
      var vDepois = String(body[c])
      if (vAntes !== vDepois) {
        antes[c] = vAntes
        alterados.push(c)
        ficha.set(c, body[c])
      }
    }
    if (alterados.length === 0) return e.json(200, { ok: true, alterados: 0 })
    try {
      $app.save(ficha)
    } catch (err) {
      return e.json(400, { error: 'Falha ao salvar: ' + String(err) })
    }
    // Auditoria com campos alterados
    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var ev = new Record(audit)
      ev.set('entidade', 'fichas_operacionais')
      ev.set('registro_id', ficha.id)
      ev.set('acao', 'update')
      ev.set('ator_id', actor.id)
      ev.set('ocorrido_em', new Date().toISOString())
      ev.set('estado_anterior', JSON.stringify(antes).slice(0, 5000))
      ev.set('estado_posterior', JSON.stringify({ campos_alterados: alterados }))
      $app.save(ev)
    } catch (_) {}
    // Versionamento: regenera procedimento dos serviços afetados
    try {
      var servicos = String(ficha.get('servicos_contratados') || '').split(',')
      for (var s = 0; s < servicos.length; s++) {
        var servico = servicos[s].trim()
        if (!servico) continue
        // última versão deste serviço
        var ultimas = $app.findRecordsByFilter(
          'ficha_versions',
          'ficha = {:f} && servico = {:s}',
          '-versao',
          1,
          0,
          { f: ficha.id, s: servico },
        )
        var novaVersao = ultimas.length ? Number(ultimas[0].get('versao') || 0) + 1 : 1
        var verCol = $app.findCollectionByNameOrId('ficha_versions')
        var v = new Record(verCol)
        v.set('ficha', ficha.id)
        v.set('servico', servico)
        v.set('versao', novaVersao)
        v.set('conteudo', gerarProcedimento(ficha, servico))
        v.set('gerado_em', new Date().toISOString())
        v.set('gerado_por', actor.id)
        v.set('campos_alterados', JSON.stringify(alterados))
        $app.save(v)
      }
    } catch (errV) {
      $app.logger().warn('T311 versionamento falhou', 'err', String(errV))
    }
    return e.json(200, { ok: true, alterados: alterados.length, campos: alterados })
  },
  $apis.requireAuth(),
)

// ---- Gerador de procedimento (texto legível por serviço) ----
var gerarProcedimento = function (ficha, servico) {
  var L = []
  var nomeEmpresa = ''
  try {
    nomeEmpresa = String(
      $app.findRecordById('empresas', String(ficha.get('empresa') || '')).get('nome') || '',
    )
  } catch (_) {}
  L.push('PROCEDIMENTO OPERACIONAL — ' + servico.toUpperCase())
  L.push('Cliente: ' + nomeEmpresa)
  L.push('Gerado automaticamente pela Ficha Operacional do CRM Vibratto.')
  L.push('Status operacional: ' + String(ficha.get('status_operacional') || 'não informado'))
  L.push('')
  L.push('RESPONSABILIDADE')
  L.push('- Analista titular: ' + nomeUsuarioSafe(ficha.get('responsavel_principal')))
  L.push('- Analista reserva: ' + nomeUsuarioSafe(ficha.get('responsavel_reserva')))
  L.push('- Fora do escopo: ' + String(ficha.get('fora_do_escopo') || 'não informado'))
  L.push('')
  if (servico === 'contas_a_pagar') {
    L.push('CONTAS A PAGAR')
    L.push(
      '- Periodicidade da projeção: ' +
        String(ficha.get('periodicidade_projecao') || 'não informada'),
    )
    L.push('- Dias de referência: ' + String(ficha.get('dias_referencia') || 'não informados'))
    L.push('- Janela coberta: ' + String(ficha.get('janela_coberta') || 'não informada'))
    L.push('- Contas fixas: ' + String(ficha.get('regra_conta_fixa') || 'não informado'))
    L.push(
      '- Contas variáveis (exigem autorização prévia): ' +
        String(ficha.get('regra_conta_variavel') || 'não informado'),
    )
    L.push('- Autoriza a projeção: ' + String(ficha.get('autoriza_projecao') || 'não informado'))
    L.push('- Canal de autorização: ' + String(ficha.get('canal_autorizacao') || 'não informado'))
    L.push(
      '- Prazo de resposta esperado: ' +
        (ficha.get('prazo_resposta_horas') || 'não informado') +
        ' horas',
    )
    L.push(
      '- Antecipação de pagamento: ' +
        (ficha.get('antecipacao_pagamento') === true ? 'sim' : 'não'),
    )
    L.push(
      '- Destino dos comprovantes: ' + String(ficha.get('destino_comprovantes') || 'não informado'),
    )
    L.push('- Estrutura adicional: ' + String(ficha.get('estrutura_adicional') || 'não informada'))
    L.push(
      '- Controle externo do cliente: ' + String(ficha.get('controle_externo_cliente') || 'nenhum'),
    )
  }
  if (servico === 'faturamento') {
    L.push('FATURAMENTO')
    L.push('- Origem da informação: ' + String(ficha.get('origem_informacao') || 'não informada'))
    L.push(
      '- Dia de envio do relatório: ' + String(ficha.get('dia_envio_relatorio') || 'não informado'),
    )
    L.push('- Aprova o relatório: ' + String(ficha.get('aprova_relatorio') || 'não informado'))
    L.push('- Dia de emissão: ' + String(ficha.get('dia_emissao') || 'não informado'))
    L.push('- Rotas de emissão: ' + String(ficha.get('rotas_emissao') || 'não informadas'))
    L.push('- Regra da rota: ' + String(ficha.get('regra_rota') || 'não informada'))
    L.push(
      '- Destinatários da nota: ' + String(ficha.get('destinatarios_nota') || 'não informados'),
    )
    L.push(
      '- Cancelar previsão após emissão: ' +
        (ficha.get('cancelar_previsao') === true ? 'sim' : 'não'),
    )
    L.push('- Destino das notas: ' + String(ficha.get('destino_notas') || 'não informado'))
    L.push(
      '- Prazo de validação final: ' +
        String(ficha.get('prazo_validacao_final') || 'não informado'),
    )
    L.push('- Regra de cobrança: ' + String(ficha.get('regra_cobranca') || 'não informada'))
  }
  if (servico === 'conciliacao') {
    L.push('CONCILIAÇÃO')
    L.push('- Frequência: ' + String(ficha.get('frequencia_conciliacao') || 'não informada'))
    L.push('- Responsável: ' + nomeUsuarioSafe(ficha.get('responsavel_conciliacao')))
    L.push('- Origem do extrato: ' + String(ficha.get('origem_extrato') || 'não informada'))
    L.push(
      '- Destino dos comprovantes: ' +
        String(ficha.get('destino_comprovantes_conc') || 'não informado'),
    )
    L.push('- Controle externo: ' + String(ficha.get('controle_externo_conc') || 'nenhum'))
  }
  if (servico === 'fechamento') {
    L.push('FECHAMENTO MENSAL')
    L.push('- Contabilidade: ' + String(ficha.get('contabilidade_nome') || 'não informada'))
    L.push('- Contato: ' + String(ficha.get('contabilidade_contato') || 'não informado'))
    L.push('- Formato de entrega: ' + String(ficha.get('formato_entrega') || 'não informado'))
    L.push('- Canal de entrega: ' + String(ficha.get('canal_entrega') || 'não informado'))
    L.push('- Prazo de entrega: ' + String(ficha.get('prazo_entrega') || 'não informado'))
    L.push('- Documentos exigidos: ' + String(ficha.get('documentos_exigidos') || 'não informados'))
    L.push('- Particularidades: ' + String(ficha.get('particularidades_fechamento') || 'nenhuma'))
  }
  if (servico === 'tesouraria' || servico === 'controladoria') {
    L.push(servico.toUpperCase())
    L.push('- Serviço contratado; parâmetros específicos conforme contrato e rotina acordada.')
  }
  L.push('')
  L.push('SISTEMA DE GESTÃO')
  L.push('- Sistema: ' + String(ficha.get('sistema') || 'não informado'))
  L.push(
    '- Empresa no sistema: ' +
      String(ficha.get('identificacao_empresa_sistema') || 'não informada'),
  )
  L.push(
    '- Credenciais: NUNCA neste documento — usar o cofre de senhas (identificador: ' +
      String(ficha.get('item_cofre_sistema') || 'não informado') +
      ')',
  )
  L.push('')
  L.push('CONTAS BANCÁRIAS OPERADAS')
  try {
    var bs = $app.findRecordsByFilter('ficha_bancos', 'ficha = {:f}', '-created', 50, 0, {
      f: ficha.id,
    })
    if (bs.length === 0) L.push('- Nenhuma conta cadastrada.')
    for (var b = 0; b < bs.length; b++) {
      L.push(
        '- ' +
          String(bs[b].get('apelido_conta') || '') +
          ' (' +
          String(bs[b].get('banco') || '') +
          ') — finalidade: ' +
          String(bs[b].get('finalidade') || '') +
          '; aprova no banco: ' +
          String(bs[b].get('quem_aprova_no_banco') || 'não informado') +
          '; cofre: ' +
          String(bs[b].get('item_cofre') || 'não informado'),
      )
    }
  } catch (_) {
    L.push('- (falha ao listar contas)')
  }
  L.push('')
  L.push('CANAIS DE ENTRADA')
  try {
    var cs = $app.findRecordsByFilter('ficha_canais', 'ficha = {:f}', '-created', 50, 0, {
      f: ficha.id,
    })
    if (cs.length === 0) L.push('- Nenhum canal cadastrado.')
    for (var c2 = 0; c2 < cs.length; c2++) {
      L.push(
        '- ' +
          String(cs[c2].get('tipo_canal') || '') +
          ': ' +
          String(cs[c2].get('identificacao') || '') +
          ' — verificação ' +
          String(cs[c2].get('frequencia_verificacao') || 'não informada') +
          ' — finalidade: ' +
          String(cs[c2].get('finalidade') || ''),
      )
    }
  } catch (_) {
    L.push('- (falha ao listar canais)')
  }
  L.push('')
  L.push('PESSOAS DO CLIENTE')
  try {
    var ps = $app.findRecordsByFilter(
      'ficha_pessoas',
      'ficha = {:f} && ativo = true',
      '-created',
      50,
      0,
      { f: ficha.id },
    )
    if (ps.length === 0) L.push('- Nenhuma pessoa cadastrada.')
    for (var p2 = 0; p2 < ps.length; p2++) {
      var cn = ''
      try {
        cn = String(
          $app.findRecordById('clientes', String(ps[p2].get('contato') || '')).get('nome') || '',
        )
      } catch (_) {}
      L.push(
        '- ' +
          cn +
          ' — papel: ' +
          String(ps[p2].get('papel_operacional') || '') +
          ' — canal: ' +
          String(ps[p2].get('canal_preferencial') || ''),
      )
    }
  } catch (_) {
    L.push('- (falha ao listar pessoas)')
  }
  L.push('')
  L.push(
    'Este procedimento é gerado a partir da Ficha Operacional. Altere o cadastro, não o documento.',
  )
  return L.join('\n')
}

var nomeUsuarioSafe = function (id) {
  if (!id) return 'não atribuído'
  try {
    return String($app.findRecordById('_pb_users_auth_', String(id)).get('name') || 'não atribuído')
  } catch (_) {
    return 'não atribuído'
  }
}

// ---- GET procedimento vigente (gera on-the-fly; não persiste) ----
routerAdd(
  'GET',
  '/backend/v1/fichas/{empresaId}/procedimento',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var ficha = fichaDeEmpresa(e.request.pathValue('empresaId'))
    if (!ficha) return e.json(404, { error: 'Ficha operacional não encontrada para esta empresa.' })
    if (!podeVer(actor, ficha)) return e.json(403, { error: 'Ficha fora da sua carteira.' })
    var servico = String(e.request.url.query().get('servico') || '').trim()
    var servicos = String(ficha.get('servicos_contratados') || '').split(',')
    if (!servico) {
      // sem ?servico= → retorna todos os contratados
      var todos = {}
      for (var i = 0; i < servicos.length; i++) {
        var s = servicos[i].trim()
        if (s) todos[s] = gerarProcedimento(ficha, s)
      }
      return e.json(200, { servicos: todos })
    }
    var ok = false
    for (var j = 0; j < servicos.length; j++) if (servicos[j].trim() === servico) ok = true
    if (!ok) return e.json(400, { error: 'Serviço não contratado por este cliente.' })
    return e.json(200, { servico: servico, conteudo: gerarProcedimento(ficha, servico) })
  },
  $apis.requireAuth(),
)

// ---- GET histórico de versões ----
routerAdd(
  'GET',
  '/backend/v1/fichas/{empresaId}/versoes',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var ficha = fichaDeEmpresa(e.request.pathValue('empresaId'))
    if (!ficha) return e.json(404, { error: 'Ficha operacional não encontrada para esta empresa.' })
    if (!podeVer(actor, ficha)) return e.json(403, { error: 'Ficha fora da sua carteira.' })
    var vers = []
    try {
      var vs = $app.findRecordsByFilter('ficha_versions', 'ficha = {:f}', '-versao', 200, 0, {
        f: ficha.id,
      })
      for (var i = 0; i < vs.length; i++) {
        var gn = ''
        try {
          gn = String(
            $app
              .findRecordById('_pb_users_auth_', String(vs[i].get('gerado_por') || ''))
              .get('name') || '',
          )
        } catch (_) {}
        vers.push({
          id: vs[i].id,
          servico: String(vs[i].get('servico') || ''),
          versao: vs[i].get('versao'),
          gerado_em: String(vs[i].get('gerado_em') || ''),
          gerado_por: gn,
          campos_alterados: String(vs[i].get('campos_alterados') || '[]'),
        })
      }
    } catch (_) {}
    return e.json(200, { total: vers.length, itens: vers })
  },
  $apis.requireAuth(),
)
