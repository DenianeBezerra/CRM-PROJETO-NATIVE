// T2.25 — CA-2-020: fila do responsável.
// GET /backend/v1/filas/propostas-vencidas (autenticado).
// - operator vê as propostas vencidas onde é o responsável;
// - admin vê todas;
// - leitura pura: não altera resultado comercial (nenhum write aqui).
routerAdd(
  'GET',
  '/backend/v1/filas/propostas-vencidas',
  (e) => {
    const actor = e.auth
    if (!actor) {
      return e.json(403, { error: 'Autenticação necessária.' })
    }

    const ehAdmin = actor.get('role') === 'admin'
    let filtro = ''
    if (!ehAdmin) {
      filtro = 'responsavel = "' + actor.id + '"'
    }

    let registros = []
    try {
      registros = $app.findRecordsByFilter('fila_propostas_vencidas', filtro, '-validade', 500, 0)
    } catch (err) {
      $app.logger().error('T225 falha ao consultar fila', 'error', String(err))
      return e.json(500, { error: 'Falha ao consultar a fila.' })
    }

    // Deduplica por proposta (mantém o registro mais recente) e enriquece
    // com título da oportunidade e status atual da proposta.
    const porProposta = {}
    for (let i = 0; i < registros.length; i++) {
      const r = registros[i]
      const pid = String(r.get('proposta') || '')
      if (!porProposta[pid]) porProposta[pid] = r
    }

    const itens = []
    for (const pid in porProposta) {
      const r = porProposta[pid]
      let titulo = ''
      let statusProposta = ''
      try {
        const neg = $app.findRecordById('negocios', String(r.get('negocio') || ''))
        titulo = String(neg.get('titulo') || '')
      } catch (_) {
        titulo = '(oportunidade removida)'
      }
      try {
        const prop = $app.findRecordById('propostas', pid)
        statusProposta = String(prop.get('status') || '')
      } catch (_) {
        statusProposta = '(proposta removida)'
      }
      itens.push({
        proposta: pid,
        negocio: String(r.get('negocio') || ''),
        titulo: titulo,
        status_proposta: statusProposta,
        versao: Number(r.get('versao_proposta')) || 0,
        valor: Number(r.get('valor')) || 0,
        validade: String(r.get('validade') || ''),
        dia_referencia: String(r.get('dia_referencia') || ''),
        responsavel: String(r.get('responsavel') || ''),
      })
    }

    return e.json(200, {
      itens: itens,
      total: itens.length,
      consultado_em: new Date().toISOString(),
    })
  },
  $apis.requireAuth(),
)
