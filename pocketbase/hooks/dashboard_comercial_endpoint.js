// T2.38 — CA-2-033: dashboard comercial com N e filtros consistentes.
// GET /backend/v1/dashboard/comercial?periodo_inicio=&periodo_fim=&origem=
// Um único cálculo server-side: os MESMOS filtros (período + origem) são
// aplicados a todos os blocos — consistência provada por API.
// Cada bloco traz N (denominador explícito); dado ausente aparece em
// `cobertura`, nunca é omitido nem removido silenciosamente do denominador.
// Fórmulas idênticas às do dicionário de métricas (T2.36).
routerAdd(
  'GET',
  '/backend/v1/dashboard/comercial',
  (e) => {
    if (!e.auth) {
      return e.json(401, { error: 'Autenticação obrigatória.' })
    }

    const q = e.requestInfo().query
    const inicio = String(q.periodo_inicio || '').trim()
    const fim = String(q.periodo_fim || '').trim()
    const origemFiltro = String(q.origem || '').trim()

    let msInicio = 0
    let msFim = 0
    let temPeriodo = false
    if (inicio && fim) {
      msInicio = Date.parse(inicio + 'T00:00:00Z')
      msFim = Date.parse(fim + 'T23:59:59Z')
      if (isNaN(msInicio) || isNaN(msFim)) {
        return e.json(400, { error: 'Datas inválidas: use o formato YYYY-MM-DD.' })
      }
      if (msInicio > msFim) {
        return e.json(400, { error: 'Período inválido: inicio deve ser anterior ou igual a fim.' })
      }
      temPeriodo = true
    } else if (inicio || fim) {
      return e.json(400, { error: 'Informe periodo_inicio E periodo_fim (ou nenhum).' })
    }

    const noPeriodo = function (createdStr) {
      if (!temPeriodo) return true
      const ms = Date.parse(String(createdStr || '').replace(' ', 'T'))
      if (isNaN(ms)) return false
      return ms >= msInicio && ms <= msFim
    }

    // ---- Fonte única: negocios (com filtro de origem aplicado a tudo) ----
    let deals = []
    try {
      deals = $app.findRecordsByFilter('negocios', '', '-created', 20000, 0)
    } catch (err) {
      $app.logger().error('T238 falha ao consultar negocios', 'error', String(err))
    }
    const filtrados = deals.filter(function (d) {
      if (origemFiltro && d.getString('origem') !== origemFiltro) return false
      return noPeriodo(d.get('created'))
    })

    // ---- 1) Leads por origem (N total + por origem) ----
    const porOrigem = {}
    for (const d of filtrados) {
      const o = d.getString('origem') || 'sem_origem'
      porOrigem[o] = (porOrigem[o] || 0) + 1
    }
    const leadsPorOrigem = {
      n: filtrados.length,
      n_total_sem_filtro_origem: deals.filter(function (d) {
        return noPeriodo(d.get('created'))
      }).length,
      filtro_origem: origemFiltro || null,
      por_origem: porOrigem,
    }

    // ---- 2) Oportunidades por etapa (N por etapa) ----
    const porEtapa = {}
    for (const d of filtrados) {
      const st = d.getString('estagio') || 'sem_etapa'
      porEtapa[st] = (porEtapa[st] || 0) + 1
    }
    const oportunidadesPorEtapa = { n: filtrados.length, por_etapa: porEtapa }

    // ---- 3) Primeira resposta (novo_lead → contato_feito; percentis 50/90) ----
    let perms = []
    try {
      perms = $app.findRecordsByFilter('permanencias_negocio', '', 'entrou_em', 20000, 0)
    } catch (err) {
      $app.logger().error('T238 falha ao consultar permanencias', 'error', String(err))
    }
    const idsFiltrados = {}
    for (const d of filtrados) idsFiltrados[d.id] = true
    const abertasPorNegocio = {}
    const fechadasPorNegocio = {}
    for (const p of perms) {
      const nid = p.getString('negocio')
      if (!idsFiltrados[nid]) continue
      const saiuRaw = String(p.get('saiu_em') || '')
      const fechada = saiuRaw !== '' && !saiuRaw.startsWith('0001-01-01')
      if (fechada) {
        if (!fechadasPorNegocio[nid]) fechadasPorNegocio[nid] = []
        fechadasPorNegocio[nid].push(p)
      } else {
        abertasPorNegocio[nid] = (abertasPorNegocio[nid] || 0) + 1
      }
    }
    const primeirasRespostas = []
    for (const nid of Object.keys(fechadasPorNegocio)) {
      const seq = fechadasPorNegocio[nid]
      if (seq.length < 2) continue
      if (seq[0].getString('etapa') !== 'novo_lead') continue
      if (seq[1].getString('etapa') !== 'contato_feito') continue
      const t0 = new Date(String(seq[0].get('entrou_em') || '').replace(' ', 'T')).getTime()
      const t1 = new Date(String(seq[1].get('entrou_em') || '').replace(' ', 'T')).getTime()
      if (Number.isFinite(t0) && Number.isFinite(t1) && t1 >= t0) {
        primeirasRespostas.push(Math.floor((t1 - t0) / 1000))
      }
    }
    primeirasRespostas.sort(function (a, b) {
      return a - b
    })
    const pct = function (arr, p) {
      if (arr.length === 0) return null
      const idx = Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))
      return arr[idx]
    }
    const primeiraResposta = {
      n: primeirasRespostas.length,
      n_sem_transicao: Math.max(0, filtrados.length - primeirasRespostas.length),
      p50_segundos: pct(primeirasRespostas, 50),
      p90_segundos: pct(primeirasRespostas, 90),
    }

    // ---- 4) Tempo por etapa (fórmula do dicionário) ----
    const totaisEtapa = {}
    for (const p of perms) {
      const nid = p.getString('negocio')
      if (!idsFiltrados[nid]) continue
      const etapa = p.getString('etapa')
      const entrou = new Date(String(p.get('entrou_em') || '').replace(' ', 'T')).getTime()
      const saiuRaw = String(p.get('saiu_em') || '')
      const fechada = saiuRaw !== '' && !saiuRaw.startsWith('0001-01-01')
      let segundos = 0
      if (fechada) {
        const saiu = new Date(saiuRaw.replace(' ', 'T')).getTime()
        if (Number.isFinite(entrou) && Number.isFinite(saiu)) {
          segundos = Math.max(0, Math.floor((saiu - entrou) / 1000))
        }
      } else if (Number.isFinite(entrou)) {
        segundos = Math.max(0, Math.floor((Date.now() - entrou) / 1000))
      }
      totaisEtapa[etapa] = (totaisEtapa[etapa] || 0) + segundos
    }
    const tempoPorEtapa = { n: filtrados.length, por_etapa_segundos: totaisEtapa }

    // ---- 5) Propostas / ciclo ----
    let propostas = []
    try {
      propostas = $app.findRecordsByFilter('propostas', '', '-created', 20000, 0)
    } catch (err) {
      $app.logger().error('T238 falha ao consultar propostas', 'error', String(err))
    }
    const propostasFiltradas = propostas.filter(function (p) {
      if (!idsFiltrados[p.getString('negocio')]) return false
      return noPeriodo(p.get('created'))
    })
    let valorTotal = 0
    const porStatusProposta = {}
    const temposDecisao = []
    for (const p of propostasFiltradas) {
      const st = p.getString('status') || 'rascunho'
      porStatusProposta[st] = (porStatusProposta[st] || 0) + 1
      valorTotal += Number(p.get('valor')) || 0
      const emitidaEm = String(p.get('emitida_em') || '')
      const decididaEm = String(p.get('decidida_em') || '')
      if (
        emitidaEm &&
        decididaEm &&
        !emitidaEm.startsWith('0001') &&
        !decididaEm.startsWith('0001')
      ) {
        const tE = new Date(emitidaEm.replace(' ', 'T')).getTime()
        const tD = new Date(decididaEm.replace(' ', 'T')).getTime()
        if (Number.isFinite(tE) && Number.isFinite(tD) && tD >= tE) {
          temposDecisao.push(Math.floor((tD - tE) / 1000))
        }
      }
    }
    temposDecisao.sort(function (a, b) {
      return a - b
    })
    const propostasCiclo = {
      n: propostasFiltradas.length,
      por_status: porStatusProposta,
      valor_total: valorTotal,
      tempo_medio_decisao_segundos: temposDecisao.length
        ? Math.round(
            temposDecisao.reduce(function (a, b) {
              return a + b
            }, 0) / temposDecisao.length,
          )
        : null,
      n_com_tempo_decisao: temposDecisao.length,
    }

    // ---- 6) Conversão (com N explícito) ----
    let encerradas = 0
    let ganhas = 0
    for (const d of filtrados) {
      const st = d.getString('estagio')
      if (st === 'fechado_ganho') {
        ganhas++
        encerradas++
      } else if (st === 'fechado_perdido') {
        encerradas++
      }
    }
    const conversao = {
      n_encerradas: encerradas,
      n_ganhas: ganhas,
      taxa: encerradas > 0 ? Math.round((ganhas / encerradas) * 1000) / 10 : null,
    }

    // ---- 7) Perdas por motivo (estruturado, T2.14) ----
    const perdasPorMotivo = {}
    let nPerdas = 0
    for (const d of filtrados) {
      if (d.getString('estagio') !== 'fechado_perdido') continue
      nPerdas++
      const m = d.getString('motivo_perda') || 'sem_motivo'
      perdasPorMotivo[m] = (perdasPorMotivo[m] || 0) + 1
    }
    const perdas = { n: nPerdas, por_motivo: perdasPorMotivo }

    // ---- 8) Filas (N + itens) — arquivadas/finais fora (dicionário) ----
    const FINAL_STAGES = ['fechado_ganho', 'fechado_perdido']
    const agora = Date.now()
    const acoesVencidas = []
    const paradas = []
    for (const d of filtrados) {
      if (d.getBool('arquivado')) continue
      const st = d.getString('estagio')
      if (FINAL_STAGES.includes(st)) continue
      const when = d.get('proxima_acao_em')
      if (when) {
        const due = new Date(when).getTime()
        if (Number.isFinite(due) && due < agora) {
          acoesVencidas.push({ id: d.id, titulo: d.getString('titulo') })
        }
      }
    }
    let limiteDias = 10
    try {
      const cfgs = $app.findRecordsByFilter(
        'configuracoes_operacionais',
        "chave = 'limite_oportunidade_parada_dias'",
        '',
        1,
        0,
      )
      if (cfgs.length > 0) {
        const v = Number(cfgs[0].get('valor_numero'))
        if (Number.isFinite(v) && v >= 0) limiteDias = v
      }
    } catch (_) {}
    const abertasPorNegocio2 = {}
    for (const p of perms) {
      const nid = p.getString('negocio')
      if (!idsFiltrados[nid]) continue
      const saiuRaw = String(p.get('saiu_em') || '')
      if (saiuRaw === '' || saiuRaw.startsWith('0001-01-01')) {
        abertasPorNegocio2[nid] = (abertasPorNegocio2[nid] || 0) + 1
      }
    }
    for (const d of filtrados) {
      if (d.getBool('arquivado')) continue
      const st = d.getString('estagio')
      if (FINAL_STAGES.includes(st)) continue
      if ((abertasPorNegocio2[d.id] || 0) !== 1) continue
      const entrou = new Date(
        String(
          (
            perms.find(function (p) {
              return (
                p.getString('negocio') === d.id &&
                (String(p.get('saiu_em') || '') === '' ||
                  String(p.get('saiu_em') || '').startsWith('0001-01-01'))
              )
            }) || {}
          ).entrou_em || '',
        ).replace(' ', 'T'),
      ).getTime()
      if (!Number.isFinite(entrou)) continue
      const dias = Math.floor((agora - entrou) / 1000 / 86400)
      if (dias > limiteDias) {
        paradas.push({ id: d.id, titulo: d.getString('titulo'), dias_na_etapa: dias })
      }
    }
    const filas = {
      acoes_vencidas: { n: acoesVencidas.length, itens: acoesVencidas },
      oportunidades_paradas: { n: paradas.length, itens: paradas, limite_dias: limiteDias },
    }

    // ---- 9) Cobertura (dado ausente explícito — T2.39, CA-2-034) ----
    // Cada bloco declara n_com_dado / n_sem_dado sobre o MESMO denominador
    // (filtrados). Dado ausente NUNCA é removido do denominador: aparece
    // como cobertura incompleta, com aviso por bloco e na lista global.
    const negociosComPermanencia = {}
    for (const p of perms) {
      const nid = p.getString('negocio')
      if (idsFiltrados[nid]) negociosComPermanencia[nid] = true
    }
    const negociosComProposta = {}
    for (const p of propostasFiltradas) {
      negociosComProposta[p.getString('negocio')] = true
    }
    let nSemPermanencia = 0
    for (const d of filtrados) {
      if (!negociosComPermanencia[d.id]) nSemPermanencia++
    }
    let nSemProposta = 0
    for (const d of filtrados) {
      if (!negociosComProposta[d.id]) nSemProposta++
    }
    const nSemEncerramento = Math.max(0, filtrados.length - conversao.n_encerradas)
    const nEncerradasSemPerda = Math.max(0, conversao.n_encerradas - perdas.n)

    const coberturaPorBloco = {
      leads_por_origem: {
        n_com_dado: leadsPorOrigem.n,
        n_sem_dado: 0,
        aviso: leadsPorOrigem.n === 0 ? 'leads_por_origem: nenhum lead no filtro atual' : null,
      },
      oportunidades_por_etapa: {
        n_com_dado: oportunidadesPorEtapa.n,
        n_sem_dado: 0,
        aviso:
          oportunidadesPorEtapa.n === 0
            ? 'oportunidades_por_etapa: nenhuma oportunidade no filtro atual'
            : null,
      },
      primeira_resposta: {
        n_com_dado: primeiraResposta.n,
        n_sem_dado: primeiraResposta.n_sem_transicao,
        aviso:
          primeiraResposta.n === 0
            ? 'primeira_resposta: nenhuma transição novo_lead→contato_feito no período (' +
              primeiraResposta.n_sem_transicao +
              ' de ' +
              filtrados.length +
              ' sem a transição — permanecem no denominador)'
            : primeiraResposta.n_sem_transicao > 0
              ? 'primeira_resposta: cobertura parcial — ' +
                primeiraResposta.n_sem_transicao +
                ' de ' +
                filtrados.length +
                ' oportunidades sem transição novo_lead→contato_feito (permanecem no denominador)'
              : null,
      },
      tempo_por_etapa: {
        n_com_dado: filtrados.length - nSemPermanencia,
        n_sem_dado: nSemPermanencia,
        aviso:
          nSemPermanencia === filtrados.length && filtrados.length > 0
            ? 'tempo_por_etapa: nenhuma permanência registrada no filtro atual (' +
              nSemPermanencia +
              ' de ' +
              filtrados.length +
              ' sem permanência — permanecem no denominador)'
            : nSemPermanencia > 0
              ? 'tempo_por_etapa: cobertura parcial — ' +
                nSemPermanencia +
                ' de ' +
                filtrados.length +
                ' oportunidades sem permanência registrada (permanecem no denominador)'
              : null,
      },
      propostas_ciclo: {
        n_com_dado: propostasCiclo.n,
        n_sem_dado: nSemProposta,
        aviso:
          propostasCiclo.n === 0
            ? 'propostas_ciclo: nenhuma proposta no filtro atual (' +
              nSemProposta +
              ' de ' +
              filtrados.length +
              ' oportunidades sem proposta — permanecem no denominador)'
            : nSemProposta > 0
              ? 'propostas_ciclo: cobertura parcial — ' +
                nSemProposta +
                ' de ' +
                filtrados.length +
                ' oportunidades sem proposta (permanecem no denominador)'
              : null,
      },
      conversao: {
        n_com_dado: conversao.n_encerradas,
        n_sem_dado: nSemEncerramento,
        aviso:
          conversao.n_encerradas === 0
            ? 'conversao: nenhuma oportunidade encerrada no filtro atual (' +
              nSemEncerramento +
              ' de ' +
              filtrados.length +
              ' em aberto — permanecem fora da taxa, N declarado)'
            : nSemEncerramento > 0
              ? 'conversao: cobertura parcial — ' +
                nSemEncerramento +
                ' de ' +
                filtrados.length +
                ' oportunidades ainda em aberto (taxa calculada sobre N=' +
                conversao.n_encerradas +
                ' encerradas)'
              : null,
      },
      perdas: {
        n_com_dado: perdas.n,
        n_sem_dado: nEncerradasSemPerda,
        aviso:
          perdas.n === 0
            ? 'perdas: nenhuma perda no filtro atual (' +
              nEncerradasSemPerda +
              ' encerradas como ganho — permanecem no denominador de encerradas)'
            : null,
      },
      filas: {
        n_com_dado: filas.acoes_vencidas.n + filas.oportunidades_paradas.n,
        n_sem_dado: 0,
        aviso: null,
      },
    }
    const cobertura = []
    for (const bloco of Object.keys(coberturaPorBloco)) {
      const aviso = coberturaPorBloco[bloco].aviso
      if (aviso) cobertura.push(aviso)
    }

    return e.json(200, {
      filtros: {
        periodo_inicio: inicio || null,
        periodo_fim: fim || null,
        origem: origemFiltro || null,
      },
      leads_por_origem: leadsPorOrigem,
      oportunidades_por_etapa: oportunidadesPorEtapa,
      primeira_resposta: primeiraResposta,
      tempo_por_etapa: tempoPorEtapa,
      propostas_ciclo: propostasCiclo,
      conversao: conversao,
      perdas: perdas,
      filas: filas,
      cobertura: cobertura,
      cobertura_por_bloco: coberturaPorBloco,
      calculado_em: new Date().toISOString(),
    })
  },
  $apis.requireAuth(),
)
