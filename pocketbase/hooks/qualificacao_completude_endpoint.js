// T2.12 — CA-2-007: endpoint server-side de completude da qualificação.
// GET /backend/v1/qualificacao/{negocio}/completude
// Recalcula no servidor: perguntas ativas aplicáveis à etapa atual do negócio,
// respostas existentes, percentual e pendências (com destaque das obrigatórias).
// Autenticado (admin e operator leem); somente leitura, sem efeitos colaterais.
routerAdd(
  'GET',
  '/backend/v1/qualificacao/{negocio}/completude',
  (e) => {
    const actor = e.auth
    if (!actor) {
      return e.json(403, { error: 'Autenticação necessária.' })
    }

    const negocioId = e.request.pathValue('negocio')
    let negocio
    try {
      negocio = $app.findRecordById('negocios', negocioId)
    } catch (_) {
      return e.json(404, { error: 'Oportunidade não encontrada.' })
    }

    const etapa = String(negocio.get('estagio') || '')

    // Perguntas ativas aplicáveis: "todas" ou cujo aplicavel_a == etapa atual.
    let perguntas = []
    try {
      perguntas = $app.findRecordsByFilter(
        'perguntas_qualificacao',
        'ativa = true',
        'ordem',
        500,
        0,
      )
    } catch (err) {
      return e.json(500, { error: 'Falha ao consultar perguntas: ' + String(err) })
    }
    const aplicaveis = perguntas.filter(function (p) {
      const a = String(p.get('aplicavel_a') || 'todas')
      return a === 'todas' || a === etapa
    })

    // Respostas existentes para este negócio.
    // (Sort por respondido_em — campo autodate da coleção; "updated" não existe aqui.)
    let respostas = []
    try {
      respostas = $app.findRecordsByFilter(
        'respostas_qualificacao',
        'negocio = {:n}',
        '-respondido_em',
        500,
        0,
        { n: negocioId },
      )
    } catch (err) {
      return e.json(500, { error: 'Falha ao consultar respostas: ' + String(err) })
    }
    const porPergunta = {}
    for (let i = 0; i < respostas.length; i++) {
      porPergunta[respostas[i].get('pergunta')] = respostas[i]
    }

    // Completude: respondida = existe resposta com conteúdo não vazio.
    const pendencias = []
    let respondidas = 0
    let obrigatoriasPendentes = 0
    for (let i = 0; i < aplicaveis.length; i++) {
      const p = aplicaveis[i]
      const r = porPergunta[p.id]
      let preenchida = false
      if (r) {
        const tipo = String(p.get('tipo') || '')
        if (tipo === 'numero') {
          const n = r.get('resposta_numero')
          preenchida = n !== undefined && n !== null && String(n) !== ''
        } else if (tipo === 'sim_nao') {
          preenchida = r.get('resposta_bool') !== undefined && r.get('resposta_bool') !== null
        } else {
          preenchida = String(r.get('resposta_texto') || '').trim() !== ''
        }
      }
      if (preenchida) {
        respondidas++
      } else {
        const obrigatoria = !!p.get('obrigatoria')
        if (obrigatoria) obrigatoriasPendentes++
        pendencias.push({
          pergunta_id: p.id,
          ordem: p.get('ordem'),
          texto: p.get('texto'),
          tipo: p.get('tipo'),
          obrigatoria: obrigatoria,
        })
      }
    }

    const total = aplicaveis.length
    const percentual = total > 0 ? Math.round((respondidas / total) * 100) : 0

    return e.json(200, {
      negocio: negocioId,
      etapa: etapa,
      total_perguntas: total,
      respondidas: respondidas,
      percentual: percentual,
      obrigatorias_pendentes: obrigatoriasPendentes,
      qualificacao_configurada: total > 0,
      pendencias: pendencias,
      calculado_em: new Date().toISOString(),
    })
  },
  $apis.requireAuth(),
)
