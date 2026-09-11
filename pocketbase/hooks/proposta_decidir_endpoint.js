// T2.24 — CA-2-019: decisão humana na proposta (aceite ou recusa).
// POST /backend/v1/propostas/{id}/decidir  { decisao: 'aceita'|'recusada', canal, observacao }
// - DECISÃO É HUMANA: exige autenticação (401 sem) e é sempre uma ação
//   explícita de um usuário — nenhum processo automático chama este endpoint;
// - só proposta EMITIDA pode ser decidida (rascunho/aceita/recusada → 400);
// - canal obrigatório (ui/whatsapp/email/presencial/telefone), observação
//   obrigatória (mín. 10 caracteres);
// - registra ator (decidida_por), data (decidida_em), canal e observação;
// - ATÔMICO: re-checagem + save dentro de runInTransaction (padrão T2.23).
routerAdd(
  'POST',
  '/backend/v1/propostas/{id}/decidir',
  (e) => {
    const actor = e.auth
    if (!actor) {
      return e.json(403, { error: 'Autenticação necessária. A decisão é humana e registrada.' })
    }

    let body
    try {
      body = e.requestInfo().body || {}
    } catch (_) {
      return e.json(400, { error: 'Corpo da requisição inválido.' })
    }

    const decisao = String(body.decisao || '').trim()
    if (decisao !== 'aceita' && decisao !== 'recusada') {
      return e.json(400, { error: "Decisão deve ser 'aceita' ou 'recusada'." })
    }

    const canal = String(body.canal || '').trim()
    const canaisValidos = ['ui', 'whatsapp', 'email', 'presencial', 'telefone']
    if (canaisValidos.indexOf(canal) < 0) {
      return e.json(400, {
        error: 'Canal da decisão obrigatório (ui, whatsapp, email, presencial ou telefone).',
      })
    }

    const observacao = String(body.observacao || '').trim()
    if (observacao.length < 10) {
      return e.json(400, {
        error: 'Observação da decisão obrigatória (mínimo 10 caracteres).',
      })
    }

    const pid = e.request.pathValue('id')
    let resultado = null
    let erroDecisao = ''

    try {
      $app.runInTransaction((txApp) => {
        let proposta
        try {
          proposta = txApp.findRecordById('propostas', pid)
        } catch (_) {
          erroDecisao = 'Proposta não encontrada.'
          return
        }

        const status = String(proposta.get('status') || '')
        if (status !== 'emitida') {
          erroDecisao =
            'Somente uma proposta emitida pode ser decidida (status atual: ' + status + ').'
          return
        }

        proposta.set('status', decisao)
        proposta.set('decidida_em', new Date().toISOString())
        proposta.set('decidida_por', actor.id)
        proposta.set('canal_decisao', canal)
        proposta.set('observacao_decisao', observacao)
        try {
          txApp.save(proposta)
        } catch (err) {
          $app.logger().error('T224 falha ao registrar decisão', 'error', String(err))
          erroDecisao = 'Falha ao registrar a decisão.'
          return
        }

        resultado = {
          id: proposta.id,
          versao: Number(proposta.get('versao')),
          status: decisao,
          decidida_em: String(proposta.get('decidida_em') || ''),
          decidida_por: actor.id,
          canal_decisao: canal,
          observacao_decisao: observacao,
        }
      })
    } catch (txErr) {
      $app.logger().error('T224 transação de decisão falhou', 'error', String(txErr))
      return e.json(500, { error: 'Falha ao registrar a decisão (transação).' })
    }

    if (erroDecisao) {
      const eh404 = erroDecisao === 'Proposta não encontrada.'
      return e.json(eh404 ? 404 : 400, { error: erroDecisao })
    }

    return e.json(200, resultado)
  },
  $apis.requireAuth(),
)
