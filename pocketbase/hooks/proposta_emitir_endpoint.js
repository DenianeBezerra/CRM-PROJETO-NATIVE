// T2.22 — CA-2-017: emissão da proposta congela a versão.
// POST /backend/v1/propostas/{id}/emitir (autenticado; operator e admin).
// - só rascunho pode ser emitida (emitida/aceita/recusada → 400);
// - grava status=emitida, emitida_em (agora) e emitida_por (ator);
// - o congelamento (imutabilidade do conteúdo) já vale pelo hook
//   proposta_rules (update em emitida com mudança de conteúdo → 400).
routerAdd(
  'POST',
  '/backend/v1/propostas/{id}/emitir',
  (e) => {
    const actor = e.auth
    if (!actor) {
      return e.json(403, { error: 'Autenticação necessária.' })
    }

    const pid = e.request.pathValue('id')
    let proposta
    try {
      proposta = $app.findRecordById('propostas', pid)
    } catch (_) {
      return e.json(404, { error: 'Proposta não encontrada.' })
    }

    const status = String(proposta.get('status') || '')
    if (status !== 'rascunho') {
      return e.json(400, {
        error: 'Somente uma proposta em rascunho pode ser emitida (status atual: ' + status + ').',
      })
    }

    proposta.set('status', 'emitida')
    proposta.set('emitida_em', new Date().toISOString())
    proposta.set('emitida_por', actor.id)
    try {
      $app.save(proposta)
    } catch (err) {
      $app.logger().error('T222 falha ao emitir proposta', 'error', String(err))
      return e.json(500, { error: 'Falha ao emitir a proposta.' })
    }

    return e.json(200, {
      id: proposta.id,
      versao: Number(proposta.get('versao')),
      status: 'emitida',
      emitida_em: String(proposta.get('emitida_em') || ''),
      emitida_por: actor.id,
      valor: Number(proposta.get('valor')),
    })
  },
  $apis.requireAuth(),
)
