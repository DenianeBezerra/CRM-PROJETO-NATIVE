// T2.40 — CA-2-035: drill-down e exportação agregada do dashboard comercial.
// GET /backend/v1/dashboard/comercial/drilldown?bloco=&chave=&periodo_inicio=&periodo_fim=&origem=
//   → retorna os registros que COMPÕEM o número exibido no bloco (mesma lógica
//     server-side do dashboard_comercial_endpoint.js), SEM dados pessoais
//     (LGPD: id, título, estágio, origem, status — nada de e-mail/telefone).
// GET /backend/v1/dashboard/comercial/export?periodo_inicio=&periodo_fim=&origem=
//   → CSV das AGREGAÇÕES exibidas (bloco;chave;valor;N), neutralização CSV
//     injection (padrão OWASP T2.03) em todo campo textual, trilha append-only
//     em `exportacoes` (entidade 'dashboard_comercial', migration 0107).
// Autenticação obrigatória (admin e operator — dado que ambos já consultam).
routerAdd(
  'GET',
  '/backend/v1/dashboard/comercial/drilldown',
  (e) => {
    if (!e.auth) {
      return e.json(401, { error: 'Autenticação obrigatória.' })
    }
    const q = e.requestInfo().query
    const bloco = String(q.bloco || '').trim()
    const chave = String(q.chave || '').trim()
    const inicio = String(q.periodo_inicio || '').trim()
    const fim = String(q.periodo_fim || '').trim()
    const origemFiltro = String(q.origem || '').trim()

    const BLOCOS = [
      'leads_por_origem',
      'oportunidades_por_etapa',
      'perdas',
      'propostas_ciclo',
      'conversao',
      'conversao_ganhas',
      'conversao_perdidas',
      'primeira_resposta',
      'tempo_por_etapa',
    ]
    if (BLOCOS.indexOf(bloco) < 0) {
      return e.json(400, { error: 'Bloco inválido. Blocos: ' + BLOCOS.join(', ') })
    }

    // Helpers inline (JSVM: funções top-level não são visíveis nos callbacks)
    const resumoDe = function (d) {
      // LGPD: só campos comerciais não sensíveis — sem e-mail, telefone ou contato.
      return {
        id: d.id,
        titulo: d.getString('titulo'),
        estagio: d.getString('estagio') || 'sem_etapa',
        origem: d.getString('origem') || 'sem_origem',
        status: d.getString('status') || '',
        valor: Number(d.get('valor')) || 0,
        arquivado: d.getBool('arquivado'),
      }
    }
    const findById = function (arr, id) {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i].id === id) return arr[i]
      }
      return null
    }

    // ---- Filtros idênticos ao dashboard (mesma validação, mesmo parse) ----
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

    let deals = []
    try {
      deals = $app.findRecordsByFilter('negocios', '', '-created', 20000, 0)
    } catch (err) {
      $app.logger().error('T240 falha ao consultar negocios', 'error', String(err))
    }
    const filtrados = deals.filter(function (d) {
      if (origemFiltro && d.getString('origem') !== origemFiltro) return false
      return noPeriodo(d.get('created'))
    })

    // ---- Composição do drill-down por bloco (mesma lógica do dashboard) ----
    const itens = []
    let n = 0
    if (bloco === 'leads_por_origem') {
      for (const d of filtrados) {
        const o = d.getString('origem') || 'sem_origem'
        if (chave && o !== chave) continue
        itens.push(resumoDe(d))
        n++
      }
    } else if (bloco === 'oportunidades_por_etapa') {
      for (const d of filtrados) {
        const st = d.getString('estagio') || 'sem_etapa'
        if (chave && st !== chave) continue
        itens.push(resumoDe(d))
        n++
      }
    } else if (bloco === 'perdas') {
      for (const d of filtrados) {
        if (d.getString('estagio') !== 'fechado_perdido') continue
        const m = d.getString('motivo_perda') || 'sem_motivo'
        if (chave && m !== chave) continue
        itens.push(resumoDe(d))
        n++
      }
    } else if (bloco === 'conversao_ganhas' || bloco === 'conversao_perdidas') {
      const alvo = bloco === 'conversao_ganhas' ? 'fechado_ganho' : 'fechado_perdido'
      for (const d of filtrados) {
        if (d.getString('estagio') !== alvo) continue
        itens.push(resumoDe(d))
        n++
      }
    } else if (bloco === 'conversao') {
      // Drill-down da conversão = todas as ENCERRADAS (denominador da taxa)
      for (const d of filtrados) {
        const st = d.getString('estagio')
        if (st !== 'fechado_ganho' && st !== 'fechado_perdido') continue
        itens.push(resumoDe(d))
        n++
      }
    } else if (bloco === 'propostas_ciclo') {
      let propostas = []
      try {
        propostas = $app.findRecordsByFilter('propostas', '', '-created', 20000, 0)
      } catch (err) {
        $app.logger().error('T240 falha ao consultar propostas', 'error', String(err))
      }
      const idsFiltrados = {}
      for (const d of filtrados) idsFiltrados[d.id] = true
      for (const p of propostas) {
        if (!idsFiltrados[p.getString('negocio')]) continue
        if (!noPeriodo(p.get('created'))) continue
        const st = p.getString('status') || 'rascunho'
        if (chave && st !== chave) continue
        itens.push({
          proposta_id: p.id,
          negocio_id: p.getString('negocio'),
          status: st,
          valor: Number(p.get('valor')) || 0,
          versao: Number(p.get('versao')) || 0,
        })
        n++
      }
    } else if (bloco === 'primeira_resposta' || bloco === 'tempo_por_etapa') {
      let perms = []
      try {
        perms = $app.findRecordsByFilter('permanencias_negocio', '', 'entrou_em', 20000, 0)
      } catch (err) {
        $app.logger().error('T240 falha ao consultar permanencias', 'error', String(err))
      }
      const idsFiltrados = {}
      for (const d of filtrados) idsFiltrados[d.id] = true
      if (bloco === 'primeira_resposta') {
        // Oportunidades COM a transição novo_lead→contato_feito (o N do bloco)
        const fechadasPorNegocio = {}
        for (const p of perms) {
          const nid = p.getString('negocio')
          if (!idsFiltrados[nid]) continue
          const saiuRaw = String(p.get('saiu_em') || '')
          if (saiuRaw !== '' && !saiuRaw.startsWith('0001-01-01')) {
            if (!fechadasPorNegocio[nid]) fechadasPorNegocio[nid] = []
            fechadasPorNegocio[nid].push(p)
          }
        }
        for (const nid of Object.keys(fechadasPorNegocio)) {
          const seq = fechadasPorNegocio[nid]
          if (seq.length < 2) continue
          if (seq[0].getString('etapa') !== 'novo_lead') continue
          if (seq[1].getString('etapa') !== 'contato_feito') continue
          const d = findById(deals, nid)
          if (d) {
            itens.push(resumoDe(d))
            n++
          }
        }
      } else {
        // tempo_por_etapa: negócios com permanência na etapa (chave) ou com
        // qualquer permanência (sem chave)
        const vistos = {}
        for (const p of perms) {
          const nid = p.getString('negocio')
          if (!idsFiltrados[nid]) continue
          const etapa = p.getString('etapa')
          if (chave && etapa !== chave) continue
          if (vistos[nid]) continue
          vistos[nid] = true
          const d = findById(deals, nid)
          if (d) {
            itens.push(resumoDe(d))
            n++
          }
        }
      }
    }

    return e.json(200, {
      bloco: bloco,
      chave: chave || null,
      filtros: {
        periodo_inicio: inicio || null,
        periodo_fim: fim || null,
        origem: origemFiltro || null,
      },
      n: n,
      itens: itens,
      calculado_em: new Date().toISOString(),
    })
  },
  $apis.requireAuth(),
)

// ---- Exportação agregada (CSV das agregações exibidas) ----
routerAdd(
  'GET',
  '/backend/v1/dashboard/comercial/export',
  (e) => {
    const actor = e.auth
    if (!actor) {
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

    let deals = []
    try {
      deals = $app.findRecordsByFilter('negocios', '', '-created', 20000, 0)
    } catch (err) {
      $app.logger().error('T240 falha ao consultar negocios', 'error', String(err))
    }
    const filtrados = deals.filter(function (d) {
      if (origemFiltro && d.getString('origem') !== origemFiltro) return false
      return noPeriodo(d.get('created'))
    })

    // ---- Agregações: MESMOS números do dashboard (mesma lógica) ----
    const linhas = []
    const porOrigem = {}
    for (const d of filtrados) {
      const o = d.getString('origem') || 'sem_origem'
      porOrigem[o] = (porOrigem[o] || 0) + 1
    }
    for (const o of Object.keys(porOrigem).sort()) {
      linhas.push(['leads_por_origem', o, porOrigem[o], filtrados.length])
    }
    if (Object.keys(porOrigem).length === 0) {
      linhas.push(['leads_por_origem', '(vazio)', 0, 0])
    }

    const porEtapa = {}
    for (const d of filtrados) {
      const st = d.getString('estagio') || 'sem_etapa'
      porEtapa[st] = (porEtapa[st] || 0) + 1
    }
    for (const st of Object.keys(porEtapa).sort()) {
      linhas.push(['oportunidades_por_etapa', st, porEtapa[st], filtrados.length])
    }

    let encerradas = 0
    let ganhas = 0
    const perdasPorMotivo = {}
    let nPerdas = 0
    for (const d of filtrados) {
      const st = d.getString('estagio')
      if (st === 'fechado_ganho') {
        ganhas++
        encerradas++
      } else if (st === 'fechado_perdido') {
        encerradas++
        nPerdas++
        const m = d.getString('motivo_perda') || 'sem_motivo'
        perdasPorMotivo[m] = (perdasPorMotivo[m] || 0) + 1
      }
    }
    linhas.push([
      'conversao',
      'taxa_percentual',
      encerradas > 0 ? Math.round((ganhas / encerradas) * 1000) / 10 : 0,
      encerradas,
    ])
    for (const m of Object.keys(perdasPorMotivo).sort()) {
      linhas.push(['perdas', m, perdasPorMotivo[m], nPerdas])
    }

    // ---- Neutralização CSV injection (padrão OWASP, T2.03/T2.04) ----
    const cell = function (value) {
      let text = value === null || value === undefined ? '' : String(value)
      if (text.length > 0) {
        const primeiro = text.charAt(0)
        if (primeiro === '=' || primeiro === '+' || primeiro === '-' || primeiro === '@') {
          text = "'" + text
        }
      }
      return '"' + text.split('"').join('""') + '"'
    }

    const headers = ['bloco', 'chave', 'valor', 'n_denominador']
    let csv = '\ufeff' + headers.map(cell).join(';')
    for (let i = 0; i < linhas.length; i++) {
      csv = csv + '\r\n' + linhas[i].map(cell).join(';')
    }

    // ---- Trilha append-only (coleção exportacoes, entidade dashboard_comercial) ----
    try {
      const trilha = $app.findCollectionByNameOrId('exportacoes')
      const evento = new Record(trilha)
      evento.set('usuario', actor.id)
      evento.set('entidade', 'dashboard_comercial')
      evento.set(
        'filtros',
        JSON.stringify({ periodo_inicio: inicio, periodo_fim: fim, origem: origemFiltro }),
      )
      evento.set('quantidade', linhas.length)
      evento.set('csv_gerado', true)
      const agora = new Date()
      const iso = agora.toISOString()
      evento.set('ocorrido_em', iso.substring(0, iso.length - 1))
      $app.save(evento)
    } catch (err) {
      $app.logger().error('T240 falha ao registrar trilha', 'error', String(err))
      return e.json(500, { error: 'Falha ao registrar a exportação. Arquivo não gerado.' })
    }

    const hoje = new Date().toISOString().slice(0, 10)
    return e.json(200, {
      filename: 'dashboard-comercial-' + hoje + '.csv',
      quantidade: linhas.length,
      csv: csv,
    })
  },
  $apis.requireAuth(),
)
