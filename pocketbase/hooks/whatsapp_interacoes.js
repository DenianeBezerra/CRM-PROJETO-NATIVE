// T3.03 — WhatsApp P1 (doc Onda 3 §14): registro estruturado de interações
// WhatsApp na oportunidade.
// Endpoints (auth):
//   POST /backend/v1/whatsapp/interacoes            — registra interação
//   GET  /backend/v1/whatsapp/interacoes?negocio=X  — lista do negócio (-created)
// Regras: negócio existe e não arquivado; resumo 5–5000 chars; resultado
// válido; responsável = ator autenticado; próxima ação futura atualiza a
// oportunidade (campos de contexto — nunca campos comerciais); auditoria em
// toda criação; delete bloqueado (deleteRule null na migration 0142).
// Runtime goja: callbacks NÃO enxergam escopo superior — TODA a lógica inline
// em cada callback (lição AP-2026-09-12-0200).
routerAdd(
  'POST',
  '/backend/v1/whatsapp/interacoes',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var body = e.requestInfo().body || {}
    var negocioId = String(body.negocio || '').trim()
    var contatoId = String(body.contato || '').trim()
    var direcao = String(body.direcao || '').trim()
    var resumo = String(body.resumo || '').trim()
    var resultado = String(body.resultado || '').trim()
    var proximaDescricao = String(body.proxima_acao_descricao || '').trim()
    var proximaEm = String(body.proxima_acao_em || '').trim()

    if (!negocioId) return e.json(400, { error: 'Informe a oportunidade.' })
    if (direcao !== 'entrada' && direcao !== 'saida') {
      return e.json(400, { error: 'Direção inválida. Use entrada ou saida.' })
    }
    if (resumo.length < 5 || resumo.length > 5000) {
      return e.json(400, { error: 'Resumo deve ter entre 5 e 5000 caracteres.' })
    }
    var RESULTADOS = [
      'sem_resposta',
      'resposta',
      'reuniao_agendada',
      'proposta_solicitada',
      'negativo',
    ]
    var resultadoOk = false
    for (var ri = 0; ri < RESULTADOS.length; ri++) {
      if (RESULTADOS[ri] === resultado) resultadoOk = true
    }
    if (!resultadoOk) {
      return e.json(400, {
        error:
          'Resultado inválido. Use sem_resposta, resposta, reuniao_agendada, proposta_solicitada ou negativo.',
      })
    }

    var negocio
    try {
      negocio = $app.findRecordById('negocios', negocioId)
    } catch (_) {
      return e.json(404, { error: 'Oportunidade não encontrada.' })
    }
    if (negocio.get('arquivado') === true) {
      return e.json(400, { error: 'Oportunidade arquivada não recebe interações.' })
    }

    if (contatoId) {
      try {
        $app.findRecordById('clientes', contatoId)
      } catch (_) {
        return e.json(404, { error: 'Contato não encontrado.' })
      }
    }

    var col
    try {
      col = $app.findCollectionByNameOrId('interacoes_whatsapp')
    } catch (err) {
      return e.json(500, { error: 'Coleção de interações WhatsApp indisponível.' })
    }

    var reg = new Record(col)
    reg.set('negocio', negocioId)
    if (contatoId) reg.set('contato', contatoId)
    reg.set('direcao', direcao)
    reg.set('resumo', resumo)
    reg.set('resultado', resultado)
    reg.set('responsavel', actor.id)
    if (proximaDescricao) reg.set('proxima_acao_descricao', proximaDescricao.slice(0, 1000))
    if (proximaEm) reg.set('proxima_acao_em', proximaEm)
    reg.set(
      'trilha',
      JSON.stringify([
        {
          evento: 'registrada',
          quando: new Date().toISOString(),
          detalhe: 'por ' + actor.id,
        },
      ]),
    )
    try {
      $app.save(reg)
    } catch (err) {
      return e.json(400, { error: 'Falha ao registrar interação: ' + String(err) })
    }

    // Auditoria com snapshot mínimo — nunca o conteúdo integral do resumo.
    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var ev = new Record(audit)
      ev.set('entidade', 'interacoes_whatsapp')
      ev.set('registro_id', reg.id)
      ev.set('acao', 'create')
      ev.set('ator_id', actor.id)
      ev.set('ocorrido_em', new Date().toISOString())
      ev.set('estado_anterior', '')
      ev.set(
        'estado_posterior',
        JSON.stringify({
          negocio: negocioId,
          direcao: direcao,
          resultado: resultado,
          com_proxima_acao: proximaDescricao !== '' && proximaEm !== '',
        }),
      )
      $app.save(ev)
    } catch (err) {
      $app.logger().error('T303 auditoria falhou', 'err', String(err))
    }

    // CA-3-007: próxima ação informada atualiza a oportunidade (só contexto).
    // Save de sistema ($app.save) não dispara request hooks — guard T2.18
    // intacto; campos comerciais (valor, estágio, responsável, atribuição)
    // NUNCA são tocados aqui.
    var proximaAtualizada = false
    if (proximaDescricao && proximaEm) {
      var quandoOk = false
      if (!proximaEm.startsWith('0001-01-01')) {
        var ms = Date.parse(proximaEm.replace(' ', 'T'))
        if (!isNaN(ms) && ms >= Date.now() - 60 * 1000) quandoOk = true
      }
      if (quandoOk) {
        try {
          negocio.set('proxima_acao_descricao', proximaDescricao.slice(0, 1000))
          negocio.set('proxima_acao_em', proximaEm)
          $app.save(negocio)
          proximaAtualizada = true
        } catch (err) {
          $app.logger().error('T303 falha ao atualizar próxima ação', 'err', String(err))
        }
      }
    }

    $app
      .logger()
      .info('T303 interacao whatsapp registrada', 'interacao', reg.id, 'negocio', negocioId)
    return e.json(200, {
      ok: true,
      id: reg.id,
      negocio: negocioId,
      direcao: direcao,
      resultado: resultado,
      proxima_acao_atualizada: proximaAtualizada,
    })
  },
  $apis.requireAuth(),
)

routerAdd('GET', '/backend/v1/whatsapp/interacoes', (e) => {
  var actor = e.auth
  if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
  var negocioId = String(e.request.query().get('negocio') || '').trim()
  if (!negocioId) return e.json(400, { error: 'Informe a oportunidade (?negocio=).' })
  var regs
  try {
    regs = $app.findRecordsByFilter('interacoes_whatsapp', 'negocio = {:n}', '-created', 200, 0, {
      n: negocioId,
    })
  } catch (_) {
    regs = []
  }
  var itens = []
  for (var i = 0; i < regs.length; i++) {
    var r = regs[i]
    var contatoNome = ''
    try {
      contatoNome = String(
        $app.findRecordById('clientes', String(r.get('contato') || '')).get('nome') || '',
      )
    } catch (_) {}
    var respNome = ''
    try {
      respNome = String(
        $app.findRecordById('_pb_users_auth_', String(r.get('responsavel') || '')).get('name') ||
          '',
      )
    } catch (_) {}
    itens.push({
      id: r.id,
      direcao: String(r.get('direcao') || ''),
      resultado: String(r.get('resultado') || ''),
      resumo: String(r.get('resumo') || ''),
      contato: contatoNome,
      responsavel: respNome,
      proxima_acao_descricao: String(r.get('proxima_acao_descricao') || ''),
      proxima_acao_em: String(r.get('proxima_acao_em') || ''),
      created: String(r.get('created') || ''),
    })
  }
  return e.json(200, { total: itens.length, interacoes: itens })
})
