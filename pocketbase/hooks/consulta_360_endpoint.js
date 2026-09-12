// T2.20 — CA-2-015: consulta 360º da oportunidade.
// GET /backend/v1/negocios/{id}/consulta-360 (autenticado, somente leitura).
// Retorna: versão atual + histórico do diagnóstico, qualificação (percentual
// e pendências), responsável, próxima ação e lista EXPLÍCITA de campos
// ausentes — o quadro consolidado da oportunidade em uma leitura.
routerAdd(
  'GET',
  '/backend/v1/negocios/{id}/consulta-360',
  (e) => {
    const actor = e.auth
    if (!actor) {
      return e.json(403, { error: 'Autenticação necessária.' })
    }

    const negocioId = e.request.pathValue('id')
    let negocio
    try {
      negocio = $app.findRecordById('negocios', negocioId)
    } catch (_) {
      return e.json(404, { error: 'Oportunidade não encontrada.' })
    }

    // --- Diagnóstico: versão atual (maior) + histórico completo ---
    let diagnosticos = []
    try {
      diagnosticos = $app.findRecordsByFilter(
        'diagnosticos',
        'negocio = "' + negocio.id + '"',
        '-versao',
        200,
        0,
      )
    } catch (err) {
      $app.logger().error('T220 falha ao consultar diagnósticos', 'error', String(err))
    }
    const historico = []
    for (let i = 0; i < diagnosticos.length; i++) {
      const d = diagnosticos[i]
      historico.push({
        versao: Number(d.get('versao')),
        resumo: String(d.get('resumo') || ''),
        motivo_atualizacao: String(d.get('motivo_atualizacao') || ''),
        criado_por: String(d.get('criado_por') || ''),
        criado_em: String(d.get('created') || ''),
      })
    }
    const diagnosticoAtual = historico.length > 0 ? historico[0] : null

    // --- Qualificação: reusa o cálculo da T2.12 (mesma lógica server-side) ---
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
      $app.logger().error('T220 falha ao consultar perguntas', 'error', String(err))
    }
    const etapa = String(negocio.get('estagio') || '')
    const aplicaveis = perguntas.filter(function (p) {
      const a = String(p.get('aplicavel_a') || 'todas')
      return a === 'todas' || a === etapa
    })
    let respostas = []
    try {
      respostas = $app.findRecordsByFilter(
        'respostas_qualificacao',
        'negocio = "' + negocio.id + '"',
        '-respondido_em',
        500,
        0,
      )
    } catch (err) {
      $app.logger().error('T220 falha ao consultar respostas', 'error', String(err))
    }
    const respondidasMap = {}
    for (let i = 0; i < respostas.length; i++) {
      respondidasMap[respostas[i].get('pergunta')] = respostas[i]
    }
    let respondidas = 0
    const pendenciasQualificacao = []
    for (let i = 0; i < aplicaveis.length; i++) {
      const p = aplicaveis[i]
      const r = respondidasMap[p.id]
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
        pendenciasQualificacao.push({
          texto: String(p.get('texto') || p.id),
          obrigatoria: !!p.get('obrigatoria'),
        })
      }
    }
    const totalPerguntas = aplicaveis.length
    const percentualQualificacao =
      totalPerguntas > 0 ? Math.round((respondidas / totalPerguntas) * 100) : 0

    // --- Responsável (nome) e próxima ação ---
    let responsavelNome = ''
    const respId = String(negocio.get('responsavel') || '')
    if (respId) {
      try {
        const resp = $app.findRecordById('_pb_users_auth_', respId)
        responsavelNome = String(resp.get('name') || respId)
      } catch (_) {
        responsavelNome = respId
      }
    }
    const proximaAcaoEm = String(negocio.get('proxima_acao_em') || '').trim()
    const proximaAcaoDescricao = String(negocio.get('proxima_acao_descricao') || '').trim()

    // --- Handoff (T2.35 — CA-2-030): estado, pendências abertas e tempo ---
    // Leitura explícita: dado ausente aparece como "nenhum", nunca é omitido
    // nem maquiado. Tempo até aceite: aceito = aceito_em - criado_em;
    // pendente = decorrido; devolvido = null (aguardando reenvio).
    let handoffs = []
    try {
      handoffs = $app.findRecordsByFilter(
        'handoffs',
        'negocio = "' + negocio.id + '"',
        '-created',
        1,
        0,
      )
    } catch (err) {
      $app.logger().error('T235 falha ao consultar handoff', 'error', String(err))
    }

    let handoff = { estado: 'nenhum' }
    if (handoffs.length > 0) {
      const h = handoffs[0]
      const status = String(h.get('status') || 'pendente')

      let pendenciasAbertas = []
      try {
        const rawP = h.get('pendencias')
        const pStr = typeof rawP === 'string' ? rawP : rawP ? String(rawP) : ''
        if (pStr && pStr !== 'null') {
          const p = JSON.parse(pStr)
          if (p && p.itens && Array.isArray(p.itens)) {
            pendenciasAbertas = p.itens.filter(function (it) {
              return it && !it.resolvida_em
            })
          }
        }
      } catch (_) {
        pendenciasAbertas = []
      }

      const criadoEm = String(h.get('criado_em') || '')
      const aceitoEm = String(h.get('aceito_em') || '')
      let tempoSegundos = null
      let tempoBase = ''
      if (status === 'aceito' && aceitoEm && !aceitoEm.startsWith('0001-01-01')) {
        const msC = Date.parse(criadoEm.replace(' ', 'T'))
        const msA = Date.parse(aceitoEm.replace(' ', 'T'))
        if (!isNaN(msC) && !isNaN(msA)) {
          tempoSegundos = Math.max(0, Math.floor((msA - msC) / 1000))
          tempoBase = 'aceito_em - criado_em'
        }
      } else if (status === 'pendente' && criadoEm && !criadoEm.startsWith('0001-01-01')) {
        const msC = Date.parse(criadoEm.replace(' ', 'T'))
        if (!isNaN(msC)) {
          tempoSegundos = Math.max(0, Math.floor((Date.now() - msC) / 1000))
          tempoBase = 'decorrido'
        }
      }

      handoff = {
        estado: status,
        criado_em: criadoEm,
        decidido_em: status === 'aceito' ? aceitoEm : String(h.get('devolvido_em') || ''),
        motivo_devolucao: String(h.get('motivo_devolucao') || ''),
        pendencias_abertas: pendenciasAbertas,
        tempo_ate_aceite_segundos: tempoSegundos,
        tempo_base: tempoBase,
      }
    }

    // --- WhatsApp (T3.03 — CA-3-006/007): total, última interação e próxima ação ---
    let whatsapp = { total: 0, ultima: null, proxima_acao: null }
    try {
      const waRegs = $app.findRecordsByFilter(
        'interacoes_whatsapp',
        'negocio = "' + negocio.id + '"',
        '-created',
        200,
        0,
      )
      whatsapp.total = waRegs.length
      if (waRegs.length > 0) {
        const u = waRegs[0]
        whatsapp.ultima = {
          direcao: String(u.get('direcao') || ''),
          resultado: String(u.get('resultado') || ''),
          created: String(u.get('created') || ''),
        }
        // próxima ação mais recente registrada via WhatsApp (futura ou não —
        // leitura explícita, nunca omitida)
        for (let w = 0; w < waRegs.length; w++) {
          const desc = String(waRegs[w].get('proxima_acao_descricao') || '').trim()
          if (desc) {
            whatsapp.proxima_acao = {
              descricao: desc,
              em: String(waRegs[w].get('proxima_acao_em') || ''),
            }
            break
          }
        }
      }
    } catch (err) {
      $app.logger().error('T303 falha ao consultar interações WhatsApp', 'error', String(err))
    }

    // --- Campos ausentes (explícitos) ---
    const camposAusentes = []
    if (!diagnosticoAtual) {
      camposAusentes.push('diagnostico')
    }
    if (!respId) {
      camposAusentes.push('responsavel')
    }
    let proximaOk = false
    if (proximaAcaoEm && !proximaAcaoEm.startsWith('0001-01-01')) {
      const ms = Date.parse(proximaAcaoEm.replace(' ', 'T'))
      if (!isNaN(ms) && ms >= Date.now() - 60 * 1000) proximaOk = true
    }
    if (!proximaOk) {
      camposAusentes.push('proxima_acao_futura')
    }
    if (totalPerguntas > 0 && respondidas < totalPerguntas) {
      camposAusentes.push('qualificacao_completa')
    }

    return e.json(200, {
      negocio: negocio.id,
      titulo: String(negocio.get('titulo') || ''),
      etapa: etapa,
      diagnostico: {
        atual: diagnosticoAtual,
        total_versoes: historico.length,
        historico: historico,
      },
      qualificacao: {
        percentual: percentualQualificacao,
        respondidas: respondidas,
        total_perguntas: totalPerguntas,
        pendencias: pendenciasQualificacao,
      },
      responsavel: { id: respId, nome: responsavelNome },
      proxima_acao: { em: proximaAcaoEm, descricao: proximaAcaoDescricao, futura: proximaOk },
      handoff: handoff,
      whatsapp: whatsapp,
      campos_ausentes: camposAusentes,
      calculado_em: new Date().toISOString(),
    })
  },
  $apis.requireAuth(),
)
