// T3.04 — Timeline 360º (doc Onda 3 §13): consolidação cronológica da relação.
// Endpoint SOMENTE LEITURA (auth): GET /backend/v1/negocios/{id}/timeline
// Consolida eventos das coleções que JÁ existem — sem nova coleção, sem write.
// Fontes: negocios (entrada/origem/etapas/pausa/decisão), permanencias_negocio,
// formularios, interacoes_whatsapp, interacoes, diagnosticos, propostas,
// tarefas, handoffs.
// Regras: evento = { tipo, data, titulo, detalhe, autor }; ordenado desc;
// resumo truncado a 200 chars; limite 300 eventos com aviso; falha de fonte
// NÃO some com eventos — vira aviso em fontes_com_erro; nada é logado com
// conteúdo de resumo.
// Runtime goja: lógica inline no callback (AP-0200); datas PB " " → "T";
// 0001-01-01 = ausente; query string via e.request.url.query() (AP-0810).
routerAdd('GET', '/backend/v1/negocios/{id}/timeline', (e) => {
  var actor = e.auth
  if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
  var negocioId = e.request.pathValue('id')
  var negocio
  try {
    negocio = $app.findRecordById('negocios', negocioId)
  } catch (_) {
    return e.json(404, { error: 'Oportunidade não encontrada.' })
  }

  var eventos = []
  var fontesComErro = []
  var LIMITE_FONTE = 100
  var TRUNCA = 200

  var corta = function (txt) {
    var s = String(txt || '')
    if (s.length > TRUNCA) return s.slice(0, TRUNCA) + '…'
    return s
  }
  var dataOk = function (raw) {
    var s = String(raw || '').trim()
    if (!s || s.indexOf('0001-01-01') === 0) return ''
    return s
  }
  var nomeDe = function (colecao, id, campo) {
    if (!id) return ''
    try {
      return String($app.findRecordById(colecao, String(id)).get(campo || 'name') || '')
    } catch (_) {
      return ''
    }
  }
  var push = function (tipo, data, titulo, detalhe, autor) {
    eventos.push({
      tipo: tipo,
      data: dataOk(data),
      titulo: corta(titulo),
      detalhe: corta(detalhe),
      autor: String(autor || ''),
    })
  }

  // ---- Fonte: negocios (entrada, origem, pausa/reabertura, decisão) ----
  try {
    var entrada = dataOk(negocio.get('data_entrada')) || dataOk(negocio.get('created'))
    var canal = String(negocio.get('canal') || '')
    var origemEsp = String(negocio.get('origem_especifica') || '')
    var campanha = String(negocio.get('campanha') || '')
    var origemTxt = canal
    if (origemEsp) origemTxt += ' · ' + origemEsp
    if (campanha) origemTxt += ' · campanha: ' + campanha
    push(
      'entrada',
      entrada,
      'Entrada do lead',
      origemTxt || 'origem não registrada',
      nomeDe('_pb_users_auth_', negocio.get('criado_por'), 'name'),
    )
    var motivoPausa = String(negocio.get('motivo_pausa') || '')
    if (motivoPausa) push('etapa', '', 'Oportunidade pausada', motivoPausa, '')
    var justReab = String(negocio.get('justificativa_reabertura') || '')
    if (justReab) push('etapa', '', 'Reabertura', justReab, '')
    var status = String(negocio.get('status') || '')
    if (status === 'ganho') {
      push(
        'decisao',
        dataOk(negocio.get('data_ganho')),
        'Ganho',
        'Motivo: ' + String(negocio.get('motivo_ganho') || 'n/i'),
        '',
      )
    } else if (status === 'perdido') {
      push('decisao', '', 'Perdido', 'Motivo: ' + String(negocio.get('motivo_perda') || 'n/i'), '')
    }
  } catch (errF) {
    fontesComErro.push('negocios')
  }

  // ---- Fonte: permanencias_negocio (mudanças de etapa) ----
  try {
    var perms = $app.findRecordsByFilter(
      'permanencias_negocio',
      'negocio = {:n}',
      '-entrou_em',
      LIMITE_FONTE,
      0,
      { n: negocioId },
    )
    for (var pi = 0; pi < perms.length; pi++) {
      push(
        'etapa',
        perms[pi].get('entrou_em'),
        'Etapa: ' + String(perms[pi].get('etapa') || ''),
        '',
        '',
      )
    }
  } catch (errP) {
    fontesComErro.push('permanencias_negocio')
  }

  // ---- Fonte: formularios (gerado/enviado/respondido) ----
  try {
    var forms = $app.findRecordsByFilter(
      'formularios',
      'negocio = {:n}',
      '-created',
      LIMITE_FONTE,
      0,
      { n: negocioId },
    )
    for (var fi = 0; fi < forms.length; fi++) {
      var f = forms[fi]
      var fStatus = String(f.get('status') || '')
      var solucao = String(f.get('solucao') || '')
      push(
        'formulario',
        f.get('created'),
        'Formulário ' + solucao + ' — ' + fStatus,
        fStatus === 'respondido' ? corta(f.get('resumo')) : '',
        nomeDe('_pb_users_auth_', f.get('gerado_por'), 'name'),
      )
    }
  } catch (errFo) {
    fontesComErro.push('formularios')
  }

  // ---- Fonte: interacoes_whatsapp ----
  try {
    var was = $app.findRecordsByFilter(
      'interacoes_whatsapp',
      'negocio = {:n}',
      '-created',
      LIMITE_FONTE,
      0,
      { n: negocioId },
    )
    for (var wi = 0; wi < was.length; wi++) {
      var wa = was[wi]
      push(
        'whatsapp',
        wa.get('created'),
        'WhatsApp ' + String(wa.get('direcao') || '') + ' — ' + String(wa.get('resultado') || ''),
        wa.get('resumo'),
        nomeDe('_pb_users_auth_', wa.get('responsavel'), 'name'),
      )
    }
  } catch (errW) {
    fontesComErro.push('interacoes_whatsapp')
  }

  // ---- Fonte: interacoes (e-mail, reunião, ligação, outro) ----
  try {
    var inters = $app.findRecordsByFilter(
      'interacoes',
      'negocio = {:n}',
      '-created',
      LIMITE_FONTE,
      0,
      { n: negocioId },
    )
    for (var ii = 0; ii < inters.length; ii++) {
      var inter = inters[ii]
      push(
        String(inter.get('tipo') || 'outro'),
        dataOk(inter.get('data')) || inter.get('created'),
        'Interação: ' + String(inter.get('tipo') || ''),
        inter.get('resumo'),
        nomeDe('_pb_users_auth_', inter.get('registrado_por'), 'name'),
      )
    }
  } catch (errI) {
    fontesComErro.push('interacoes')
  }

  // ---- Fonte: diagnosticos (versões) ----
  try {
    var diags = $app.findRecordsByFilter(
      'diagnosticos',
      'negocio = {:n}',
      '-versao',
      LIMITE_FONTE,
      0,
      { n: negocioId },
    )
    for (var di = 0; di < diags.length; di++) {
      var dg = diags[di]
      push(
        'diagnostico',
        dg.get('created'),
        'Diagnóstico v' + String(dg.get('versao') || ''),
        dg.get('resumo'),
        nomeDe('_pb_users_auth_', dg.get('criado_por'), 'name'),
      )
    }
  } catch (errD) {
    fontesComErro.push('diagnosticos')
  }

  // ---- Fonte: propostas (rascunho/emitida/decisão) ----
  try {
    var props = $app.findRecordsByFilter(
      'propostas',
      'negocio = {:n}',
      '-created',
      LIMITE_FONTE,
      0,
      { n: negocioId },
    )
    for (var pri = 0; pri < props.length; pri++) {
      var pr = props[pri]
      var prStatus = String(pr.get('status') || '')
      var prTitulo = 'Proposta v' + String(pr.get('versao') || '') + ' — ' + prStatus
      var prDetalhe = ''
      var valor = pr.get('valor')
      if (valor !== null && valor !== undefined && valor !== '') {
        prDetalhe = 'Valor: R$ ' + String(valor)
      }
      push(
        'proposta',
        pr.get('created'),
        prTitulo,
        prDetalhe,
        nomeDe('_pb_users_auth_', pr.get('criado_por'), 'name'),
      )
      if (prStatus === 'aceita' || prStatus === 'recusada') {
        push(
          'decisao',
          dataOk(pr.get('decidida_em')),
          'Proposta ' + (prStatus === 'aceita' ? 'aceita' : 'recusada'),
          corta(pr.get('observacao_decisao')),
          nomeDe('_pb_users_auth_', pr.get('decidida_por'), 'name'),
        )
      }
    }
  } catch (errPr) {
    fontesComErro.push('propostas')
  }

  // ---- Fonte: tarefas (criação e conclusão) ----
  try {
    var tars = $app.findRecordsByFilter('tarefas', 'negocio = {:n}', '-created', LIMITE_FONTE, 0, {
      n: negocioId,
    })
    for (var ti = 0; ti < tars.length; ti++) {
      var tar = tars[ti]
      push(
        'tarefa',
        tar.get('created'),
        'Tarefa: ' + String(tar.get('titulo') || ''),
        String(tar.get('status') || '') === 'concluida'
          ? 'Concluída' + (tar.get('resultado') ? ' — ' + corta(tar.get('resultado')) : '')
          : 'Aberta',
        nomeDe('_pb_users_auth_', tar.get('criado_por'), 'name'),
      )
    }
  } catch (errT) {
    fontesComErro.push('tarefas')
  }

  // ---- Fonte: comentarios (T3.08 — 10ª fonte) ----
  try {
    var coms = $app.findRecordsByFilter(
      'comentarios',
      'negocio = {:n}',
      '-created',
      LIMITE_FONTE,
      0,
      { n: negocioId },
    )
    for (var ci = 0; ci < coms.length; ci++) {
      var cm = coms[ci]
      push(
        'comentario',
        cm.get('created'),
        'Comentário de ' + nomeDe('_pb_users_auth_', cm.get('autor'), 'name'),
        cm.get('texto'),
        nomeDe('_pb_users_auth_', cm.get('autor'), 'name'),
      )
    }
  } catch (errCo) {
    fontesComErro.push('comentarios')
  }

  // ---- Fonte: handoffs (criação, aceite, devolução) ----
  try {
    var hands = $app.findRecordsByFilter(
      'handoffs',
      'negocio = {:n}',
      '-created',
      LIMITE_FONTE,
      0,
      { n: negocioId },
    )
    for (var hi = 0; hi < hands.length; hi++) {
      var h = hands[hi]
      var hStatus = String(h.get('status') || 'pendente')
      push(
        'handoff',
        h.get('created'),
        'Handoff — ' + hStatus,
        hStatus === 'devolvido' ? corta(h.get('motivo_devolucao')) : '',
        nomeDe('_pb_users_auth_', h.get('responsavel_emissor'), 'name'),
      )
    }
  } catch (errH) {
    fontesComErro.push('handoffs')
  }

  // ---- Ordenação desc por data (sem data → fim, usa created como fallback já aplicado) ----
  eventos.sort(function (a, b) {
    var da = Date.parse(String(a.data || '').replace(' ', 'T'))
    var db = Date.parse(String(b.data || '').replace(' ', 'T'))
    if (isNaN(da) && isNaN(db)) return 0
    if (isNaN(da)) return 1
    if (isNaN(db)) return -1
    return db - da
  })

  var LIMITE_TOTAL = 300
  var truncado = eventos.length > LIMITE_TOTAL
  if (truncado) eventos = eventos.slice(0, LIMITE_TOTAL)

  return e.json(200, {
    negocio_id: negocioId,
    titulo: String(negocio.get('titulo') || ''),
    total: eventos.length,
    truncado: truncado,
    fontes_com_erro: fontesComErro,
    eventos: eventos,
  })
})
