// T2.13 — CA-2-008: endpoint admin de liberação por exceção.
// POST /backend/v1/qualificacao/{negocio}/excecao  { motivo, validade }
// - admin-only (operator recebe 403);
// - motivo obrigatório (mín. 10 caracteres), validade obrigatória (futura);
// - registra na coleção append-only excecoes_qualificacao (com ator);
// - a trilha de auditoria geral (audit_crm_changes) não cobre esta coleção,
//   mas o registro guarda criado_por + created (ator e data) e delete/update
//   são bloqueados por regra — a exceção não pode ser apagada sem trilha.
routerAdd(
  'POST',
  '/backend/v1/qualificacao/{negocio}/excecao',
  (e) => {
    const actor = e.auth
    if (!actor) {
      return e.json(403, { error: 'Autenticação necessária.' })
    }
    if (actor.get('role') !== 'admin') {
      return e.json(403, {
        error: 'Liberação por exceção é exclusiva de administradores.',
      })
    }

    const negocioId = e.request.pathValue('negocio')
    try {
      $app.findRecordById('negocios', negocioId)
    } catch (_) {
      return e.json(404, { error: 'Oportunidade não encontrada.' })
    }

    let motivo = ''
    let validade = ''
    try {
      const body = e.requestInfo().body || {}
      motivo = String(body.motivo || '').trim()
      validade = String(body.validade || '').trim()
    } catch (err) {
      return e.json(400, { error: 'Corpo da requisição inválido.' })
    }

    if (motivo.length < 10) {
      return e.json(400, {
        error: 'Motivo obrigatório (mínimo 10 caracteres) para liberar por exceção.',
      })
    }
    const validadeMs = Date.parse(validade)
    if (isNaN(validadeMs)) {
      return e.json(400, { error: 'Validade obrigatória (data válida).' })
    }
    if (validadeMs < Date.now()) {
      return e.json(400, { error: 'A validade da exceção deve ser futura.' })
    }

    const col = $app.findCollectionByNameOrId('excecoes_qualificacao')
    const rec = new Record(col)
    rec.set('negocio', negocioId)
    rec.set('motivo', motivo)
    // Campo date do PocketBase: formato "YYYY-MM-DD HH:MM:SS.mmmZ" (espaço).
    rec.set('validade', validade.replace('T', ' '))
    rec.set('criado_por', actor.id)
    try {
      $app.save(rec)
    } catch (err) {
      $app.logger().error('Falha ao registrar exceção', 'error', String(err))
      return e.json(500, { error: 'Falha ao registrar a exceção. Liberação não concedida.' })
    }

    // T2.15/CA-2-010: a criação via rota custom não passa pelos request hooks
    // de CRUD — o evento de auditoria é gravado aqui explicitamente.
    try {
      const audit = $app.findCollectionByNameOrId('auditoria')
      const event = new Record(audit)
      event.set('entidade', 'excecoes_qualificacao')
      event.set('registro_id', rec.id)
      event.set('acao', 'create')
      event.set('ator_id', actor.id)
      event.set('ocorrido_em', new Date().toISOString())
      event.set('estado_anterior', '')
      event.set(
        'estado_posterior',
        JSON.stringify({
          negocio: negocioId,
          motivo: motivo,
          validade: validade,
          criado_por: actor.id,
        }),
      )
      $app.save(event)
    } catch (auditErr) {
      $app.logger().error('Falha ao auditar exceção', 'error', String(auditErr))
    }

    return e.json(200, {
      id: rec.id,
      negocio: negocioId,
      motivo: motivo,
      validade: validade,
      criado_por: actor.id,
      criado_em: rec.get('created'),
    })
  },
  $apis.requireAuth(),
)
