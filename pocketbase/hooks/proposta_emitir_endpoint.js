// T2.22/T2.23 — CA-2-017/CA-2-018: emissão da proposta congela a versão e é
// ATÔMICA contra emissão concorrente.
// POST /backend/v1/propostas/{id}/emitir (autenticado; operator e admin).
// - só rascunho pode ser emitida (emitida/aceita/recusada → 400);
// - grava status=emitida, emitida_em (agora) e emitida_por (ator);
// - ATOMICIDADE: a re-checagem do status e o save acontecem DENTRO de
//   runInTransaction — o SQLite serializa as transações, então duas emissões
//   paralelas do mesmo rascunho resultam em exatamente uma emissão (a segunda
//   lê status=emitida e falha com 400).
routerAdd(
  'POST',
  '/backend/v1/propostas/{id}/emitir',
  (e) => {
    const actor = e.auth
    if (!actor) {
      return e.json(403, { error: 'Autenticação necessária.' })
    }

    const pid = e.request.pathValue('id')
    let resultado = null
    let erroEmissao = ''

    try {
      $app.runInTransaction((txApp) => {
        let proposta
        try {
          proposta = txApp.findRecordById('propostas', pid)
        } catch (_) {
          erroEmissao = 'Proposta não encontrada.'
          return
        }

        const status = String(proposta.get('status') || '')
        if (status !== 'rascunho') {
          erroEmissao =
            'Somente uma proposta em rascunho pode ser emitida (status atual: ' + status + ').'
          return
        }

        proposta.set('status', 'emitida')
        proposta.set('emitida_em', new Date().toISOString())
        proposta.set('emitida_por', actor.id)
        try {
          txApp.save(proposta)
        } catch (err) {
          $app.logger().error('T222 falha ao emitir proposta', 'error', String(err))
          erroEmissao = 'Falha ao emitir a proposta.'
          return
        }

        resultado = {
          id: proposta.id,
          versao: Number(proposta.get('versao')),
          status: 'emitida',
          emitida_em: String(proposta.get('emitida_em') || ''),
          emitida_por: actor.id,
          valor: Number(proposta.get('valor')),
        }
      })
    } catch (txErr) {
      $app.logger().error('T222 transação de emissão falhou', 'error', String(txErr))
      return e.json(500, { error: 'Falha ao emitir a proposta (transação).' })
    }

    if (erroEmissao) {
      const eh404 = erroEmissao === 'Proposta não encontrada.'
      return e.json(eh404 ? 404 : 400, { error: erroEmissao })
    }

    return e.json(200, resultado)
  },
  $apis.requireAuth(),
)
