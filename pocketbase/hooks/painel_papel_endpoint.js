// T3.10 — SPEC-3-010: painel por papel + metas + comparativo de período.
// GET /backend/v1/painel/{papel}?periodo_inicio=&periodo_fim=
// Papéis: direcao (12 KPIs) | comercial (6) | controladoria (6) | administracao
// (redireciona para o dashboard comercial existente — sem duplicação).
// Comparativo: período anterior de MESMA duração; variacao_pct null quando
// anterior = 0 ou sem dado (zero não é dado). Metas: metas_indicadores ativas
// do papel → pct_meta e atingida. Somente leitura; guard T2.18 intacto.
// Premissa MRR (CEO 13/09): BPO/Tesouraria/Controladoria = 12 meses renováveis
// automaticamente (valor = mensalidade); Consultoria/CFO só entram se
// recorrencia = mensal (campo decidido no ganho).
// Runtime goja: lógica inline em cada callback (AP-0200); datas PB " " → "T".
// T3.18 — SPEC-3-018: 6 KPIs novos no painel de direção (negócios por etapa,
// taxa de conversão por etapa, ciclo médio de venda, origem dos ganhos, motivo
// de perda, negócios parados — completando os 10 indicadores do backlog §2.2)
// + POST/PATCH /metas admin-only (metas editáveis pela CEO, auditadas).
routerAdd(
  'GET',
  '/backend/v1/painel/{papel}',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var papel = String(e.request.pathValue('papel') || '').trim()
    var Papeis = ['direcao', 'comercial', 'controladoria', 'administracao']
    var papelOk = false
    for (var p = 0; p < Papeis.length; p++) if (Papeis[p] === papel) papelOk = true
    if (!papelOk)
      return e.json(400, {
        error: 'Papel inválido. Use: direcao, comercial, controladoria ou administracao.',
      })

    if (papel === 'administracao') {
      return e.json(200, {
        papel: 'administracao',
        redireciona_para: '/dashboard',
        aviso:
          'A administração usa o dashboard comercial completo (drill-down e exportação já existentes).',
      })
    }

    // ---- Período: mês corrente por padrão; custom validado ----
    var q = e.request.url.query()
    var inicioStr = String(q.get('periodo_inicio') || '').trim()
    var fimStr = String(q.get('periodo_fim') || '').trim()
    var agora = new Date()
    var inicio, fim
    if (inicioStr || fimStr) {
      if (!inicioStr || !fimStr) {
        return e.json(400, { error: 'Informe periodo_inicio E periodo_fim (ou nenhum).' })
      }
      inicio = Date.parse(inicioStr.replace(' ', 'T'))
      fim = Date.parse(fimStr.replace(' ', 'T'))
      if (isNaN(inicio) || isNaN(fim))
        return e.json(400, { error: 'Período inválido. Use YYYY-MM-DD.' })
      if (fim <= inicio)
        return e.json(400, { error: 'Período invertido: fim deve ser depois do início.' })
    } else {
      // Mês corrente: do dia 1 00:00 até agora.
      var d = new Date(agora.getFullYear(), agora.getMonth(), 1)
      inicio = d.getTime()
      fim = agora.getTime()
    }
    var duracao = fim - inicio
    var anteriorFim = inicio
    var anteriorInicio = inicio - duracao
    var iso = function (ms) {
      return new Date(ms).toISOString().replace('T', ' ').substring(0, 19)
    }
    var dentro = function (raw, i, f) {
      var s = String(raw || '')
      if (!s || s.indexOf('0001-01-01') === 0) return false
      var ms = Date.parse(s.replace(' ', 'T'))
      if (isNaN(ms)) return false
      return ms >= i && ms < f
    }

    // ---- Fonte única: negocios + tarefas + propostas + leads_entrada ----
    var fontesComErro = []
    var negocios = []
    try {
      negocios = $app.findRecordsByFilter('negocios', '', '-created', 20000, 0)
    } catch (errN) {
      fontesComErro.push('negocios')
    }
    var tarefas = []
    try {
      tarefas = $app.findRecordsByFilter('tarefas', "status = 'aberta'", '', 20000, 0)
    } catch (errT) {
      fontesComErro.push('tarefas')
    }
    var propostas = []
    try {
      propostas = $app.findRecordsByFilter('propostas', '', '-created', 20000, 0)
    } catch (errP) {
      fontesComErro.push('propostas')
    }
    var leadsEntrada = []
    try {
      leadsEntrada = $app.findRecordsByFilter('leads_entrada', '', '-created', 20000, 0)
    } catch (errL) {
      fontesComErro.push('leads_entrada')
    }
    var permanencias = []
    try {
      permanencias = $app.findRecordsByFilter('permanencias_negocio', '', '-created', 20000, 0)
    } catch (errPe) {
      fontesComErro.push('permanencias_negocio')
    }

    var FINAL = ['fechado_ganho', 'fechado_perdido']
    var SERV_REC = ['bpo_financeiro', 'tesouraria', 'controladoria'] // 12m renovável — sempre mensal

    var mrrDe = function (neg) {
      var servico = String(neg.get('servico') || '')
      var valor = Number(neg.get('valor') || 0)
      if (!valor) return 0
      if (SERV_REC.indexOf(servico) >= 0) return valor
      // Consultoria / CFO: só se recorrencia = mensal (decisão no ganho)
      if (String(neg.get('recorrencia') || 'mensal') === 'mensal') return valor
      return 0
    }

    // ---- Calculadora de KPIs por período ----
    var calc = function (i, f) {
      var novosNegocios = 0
      var ganhos = 0
      var receitaNova = 0
      var mrr = 0
      var ativas = 0
      var propostasAbertas = 0
      var valorPropostasAbertas = 0
      var propostasParadas = 0
      var leadsNovos = 0
      var tarefasVencidas = 0
      var paradas = 0
      var decisoes = []
      var diasDecisao = []
      var limiteParadaDias = 10
      try {
        var cfgs = $app.findRecordsByFilter(
          'configuracoes_operacionais',
          "chave = 'limite_oportunidade_parada_dias'",
          '',
          1,
          0,
        )
        if (cfgs.length > 0) {
          var v = Number(cfgs[0].get('valor_numero'))
          if (Number.isFinite(v) && v >= 0) limiteParadaDias = v
        }
      } catch (_) {}
      var agoraMs = Date.now()

      for (var i2 = 0; i2 < negocios.length; i2++) {
        var n = negocios[i2]
        if (dentro(n.get('created'), i, f)) novosNegocios++
        var status = String(n.get('status') || '')
        var estagio = String(n.get('estagio') || '')
        var arquivado = n.get('arquivado') === true
        // Ganho no período → receita nova (T3.22/CA-3-115: migração FORA — entra só no MRR)
        if (
          status === 'ganho' &&
          String(n.get('entrada_origem') || '') !== 'migracao' &&
          dentro(n.get('data_ganho') || n.get('updated'), i, f)
        ) {
          ganhos++
          receitaNova += Number(n.get('valor') || 0)
        }
        // MRR: ganhos ativos (não arquivados, não perdidos)
        if (status === 'ganho' && !arquivado) mrr += mrrDe(n)
        // Ativas
        if (!arquivado && FINAL.indexOf(estagio) < 0) ativas++
        // Paradas: permanência aberta acima do limite
        if (!arquivado && FINAL.indexOf(estagio) < 0) {
          var aberta = null
          for (var pe = 0; pe < permanencias.length; pe++) {
            if (String(permanencias[pe].get('negocio') || '') !== n.id) continue
            var saiu = String(permanencias[pe].get('saiu_em') || '')
            if (!saiu || saiu.indexOf('0001-01-01') === 0) {
              aberta = permanencias[pe]
              break
            }
          }
          if (aberta) {
            var entrou = Date.parse(String(aberta.get('entrou_em') || '').replace(' ', 'T'))
            if (!isNaN(entrou) && (agoraMs - entrou) / 86400000 > limiteParadaDias) paradas++
          }
        }
        // Tempo de decisão (ganhos/perdidos com data de decisão)
        if (status === 'ganho' || status === 'perdido') {
          var dG = String(n.get('data_ganho') || '')
          var dE = String(n.get('data_entrada') || '')
          if (dG && dG.indexOf('0001-01-01') !== 0 && dE && dE.indexOf('0001-01-01') !== 0) {
            var msG = Date.parse(dG.replace(' ', 'T'))
            var msE = Date.parse(dE.replace(' ', 'T'))
            if (!isNaN(msG) && !isNaN(msE) && msG > msE) diasDecisao.push((msG - msE) / 86400000)
          }
        }
      }
      // Propostas em aberto e paradas
      for (var pr = 0; pr < propostas.length; pr++) {
        var prop = propostas[pr]
        if (String(prop.get('status') || '') !== 'emitida') continue
        var negId = String(prop.get('negocio') || '')
        var negAtivo = false
        for (var n2 = 0; n2 < negocios.length; n2++) {
          if (negocios[n2].id === negId) {
            negAtivo =
              negocios[n2].get('arquivado') !== true &&
              FINAL.indexOf(String(negocios[n2].get('estagio') || '')) < 0
            break
          }
        }
        if (!negAtivo) continue
        propostasAbertas++
        valorPropostasAbertas += Number(prop.get('valor') || 0)
        var emitida = String(prop.get('emitida_em') || prop.get('created') || '')
        var msEm = Date.parse(emitida.replace(' ', 'T'))
        if (!isNaN(msEm) && (agoraMs - msEm) / 86400000 > 10) propostasParadas++
      }
      // Leads de entrada no período
      for (var le = 0; le < leadsEntrada.length; le++) {
        if (dentro(leadsEntrada[le].get('created'), i, f)) leadsNovos++
      }
      // Tarefas vencidas
      for (var t = 0; t < tarefas.length; t++) {
        var prazo = String(tarefas[t].get('prazo') || '')
        if (prazo && prazo.indexOf('0001-01-01') !== 0) {
          var msP = Date.parse(prazo.replace(' ', 'T'))
          if (!isNaN(msP) && msP < agoraMs) tarefasVencidas++
        }
      }
      // ---- T3.18: novos KPIs (backlog Etapa 3 §2.2) ----
      var porEtapa = {}
      var paradosSemAtividade = 0
      var cicloDias = []
      var origemGanhos = {}
      var motivoPerda = {}
      var entraramEtapa = {}
      var avancaramEtapa = {}
      for (var i3 = 0; i3 < negocios.length; i3++) {
        var n3 = negocios[i3]
        var st3 = String(n3.get('estagio') || '')
        var arq3 = n3.get('arquivado') === true
        if (!arq3 && FINAL.indexOf(st3) < 0) {
          var chaveEtapa = st3 || 'sem_etapa'
          var e3 = porEtapa[chaveEtapa] || { qtd: 0, valor: 0 }
          e3.qtd++
          e3.valor += Number(n3.get('valor') || 0)
          porEtapa[chaveEtapa] = e3
          // negócios parados: sem atividade registrada (updated) há mais de N dias
          var up3 = Date.parse(String(n3.get('updated') || '').replace(' ', 'T'))
          if (!isNaN(up3) && (agoraMs - up3) / 86400000 > limiteParadaDias) paradosSemAtividade++
        }
        if (
          String(n3.get('status') || '') === 'ganho' &&
          dentro(n3.get('data_ganho') || n3.get('updated'), i, f)
        ) {
          // T3.22/CA-3-115: migração FORA do ciclo de venda
          if (String(n3.get('entrada_origem') || '') !== 'migracao') {
            var dG3 = String(n3.get('data_ganho') || '')
            var dE3 = String(n3.get('data_entrada') || '')
            if (dG3 && dG3.indexOf('0001-01-01') !== 0 && dE3 && dE3.indexOf('0001-01-01') !== 0) {
              var msG3 = Date.parse(dG3.replace(' ', 'T'))
              var msE3 = Date.parse(dE3.replace(' ', 'T'))
              if (!isNaN(msG3) && !isNaN(msE3) && msG3 > msE3)
                cicloDias.push((msG3 - msE3) / 86400000)
            }
          }
          // T3.22/CA-3-115: migração FORA da origem dos ganhos
          if (String(n3.get('entrada_origem') || '') === 'migracao') continue
          var canal3 =
            String(n3.get('canal') || '') || String(n3.get('origem') || '') || 'sem_origem'
          var og3 = origemGanhos[canal3] || { qtd: 0, valor: 0 }
          og3.qtd++
          og3.valor += Number(n3.get('valor') || 0)
          origemGanhos[canal3] = og3
        }
        if (String(n3.get('status') || '') === 'perdido' && dentro(n3.get('updated'), i, f)) {
          var mp3 = String(n3.get('motivo_perda') || '') || 'sem_motivo'
          motivoPerda[mp3] = (motivoPerda[mp3] || 0) + 1
        }
      }
      // taxa de conversão por etapa: entraram vs. avançaram no período (permanencias)
      for (var pe3 = 0; pe3 < permanencias.length; pe3++) {
        var pm3 = permanencias[pe3]
        var et3 = String(pm3.get('etapa') || '') || 'sem_etapa'
        if (dentro(pm3.get('entrou_em'), i, f)) entraramEtapa[et3] = (entraramEtapa[et3] || 0) + 1
        var saiu3 = String(pm3.get('saiu_em') || '')
        if (saiu3 && saiu3.indexOf('0001-01-01') !== 0 && dentro(saiu3, i, f))
          avancaramEtapa[et3] = (avancaramEtapa[et3] || 0) + 1
      }
      var taxaPorEtapa = {}
      for (var et4 in entraramEtapa) {
        taxaPorEtapa[et4] = {
          entraram: entraramEtapa[et4],
          avancaram: avancaramEtapa[et4] || 0,
          taxa: entraramEtapa[et4] > 0 ? (avancaramEtapa[et4] || 0) / entraramEtapa[et4] : null,
        }
      }
      var cicloMedio = null
      if (cicloDias.length > 0) {
        var somaCiclo = 0
        for (var cd = 0; cd < cicloDias.length; cd++) somaCiclo += cicloDias[cd]
        cicloMedio = somaCiclo / cicloDias.length
      }

      // Primeira resposta p50 (permanencias: entrada → primeira mudança de etapa)
      var primeiras = []
      var porNegocio = {}
      for (var pe2 = 0; pe2 < permanencias.length; pe2++) {
        var pid = String(permanencias[pe2].get('negocio') || '')
        if (!porNegocio[pid]) porNegocio[pid] = []
        porNegocio[pid].push(permanencias[pe2])
      }
      for (var pid2 in porNegocio) {
        var lista = porNegocio[pid2]
        if (lista.length < 2) continue
        // ordenar por entrou_em asc
        lista.sort(function (a, b) {
          return (
            Date.parse(String(a.get('entrou_em') || '').replace(' ', 'T')) -
            Date.parse(String(b.get('entrou_em') || '').replace(' ', 'T'))
          )
        })
        var e0 = Date.parse(String(lista[0].get('entrou_em') || '').replace(' ', 'T'))
        var e1 = Date.parse(String(lista[1].get('entrou_em') || '').replace(' ', 'T'))
        if (!isNaN(e0) && !isNaN(e1) && e1 > e0) primeiras.push((e1 - e0) / 1000)
      }
      primeiras.sort(function (a, b) {
        return a - b
      })
      var p50 = primeiras.length ? primeiras[Math.floor(primeiras.length / 2)] : null
      diasDecisao.sort(function (a, b) {
        return a - b
      })
      var tempoDecisao = diasDecisao.length ? diasDecisao[Math.floor(diasDecisao.length / 2)] : null

      return {
        novos_negocios: novosNegocios,
        leads_entrada: leadsNovos,
        taxa_lead_negocio: leadsNovos > 0 ? novosNegocios / leadsNovos : null,
        oportunidades_ativas: ativas,
        propostas_abertas: propostasAbertas,
        valor_propostas_abertas: valorPropostasAbertas,
        propostas_paradas: propostasParadas,
        conversao:
          ganhos + perdasNoPeriodo(negocios, i, f, true) > 0
            ? ganhos / (ganhos + perdasNoPeriodo(negocios, i, f, true))
            : null,
        mrr: mrr,
        receita_nova: receitaNova,
        ticket_medio: ganhos > 0 ? receitaNova / ganhos : null,
        tarefas_vencidas: tarefasVencidas,
        oportunidades_paradas: paradas,
        primeira_resposta_p50_segundos: p50,
        tempo_decisao_dias: tempoDecisao,
        negocios_por_etapa: porEtapa,
        taxa_conversao_por_etapa: taxaPorEtapa,
        ciclo_medio_venda_dias: cicloMedio,
        origem_ganhos: origemGanhos,
        motivo_perda: motivoPerda,
        negocios_parados: paradosSemAtividade,
      }
    }
    var perdasNoPeriodo = function (negs, i, f, excluirMigracao) {
      var c = 0
      for (var i2 = 0; i2 < negs.length; i2++) {
        if (
          String(negs[i2].get('status') || '') === 'perdido' &&
          (!excluirMigracao || String(negs[i2].get('entrada_origem') || '') !== 'migracao') &&
          dentro(negs[i2].get('updated'), i, f)
        )
          c++
      }
      return c
    }

    var atual = calc(inicio, fim)
    var anterior = calc(anteriorInicio, anteriorFim)

    // ---- Metas do papel ----
    var metas = {}
    try {
      var ms = $app.findRecordsByFilter(
        'metas_indicadores',
        'papel = {:p} && ativo = true',
        '',
        100,
        0,
        { p: papel },
      )
      for (var m = 0; m < ms.length; m++) {
        metas[String(ms[m].get('chave') || '')] = {
          valor: Number(ms[m].get('valor_meta') || 0),
          periodicidade: String(ms[m].get('periodicidade') || ''),
          descricao: String(ms[m].get('descricao') || ''),
        }
      }
    } catch (errM) {
      fontesComErro.push('metas_indicadores')
    }
    // Mapear KPI → chave de meta (mensal por padrão; semanal aplica quando período ≤ 7 dias)
    var ehSemanal = duracao <= 7 * 86400000 + 1000
    var metaDe = function (kpi, chaveMensal, chaveSemanal) {
      var chave = ehSemanal && chaveSemanal ? chaveSemanal : chaveMensal
      if (!chave || !metas[chave]) return null
      var m2 = metas[chave]
      var valor = atual[kpi]
      if (valor == null)
        return {
          chave: chave,
          valor: m2.valor,
          periodicidade: m2.periodicidade,
          pct: null,
          atingida: false,
          descricao: m2.descricao,
        }
      return {
        chave: chave,
        valor: m2.valor,
        periodicidade: m2.periodicidade,
        pct: m2.valor > 0 ? (valor / m2.valor) * 100 : null,
        atingida: m2.valor > 0 ? valor >= m2.valor : false,
        descricao: m2.descricao,
      }
    }

    var variacao = function (a, b) {
      if (a == null || b == null) return null
      if (typeof a === 'object' || typeof b === 'object') {
        var ta = 0
        var tb = 0
        if (a && typeof a === 'object')
          for (var k in a) ta += a[k] && a[k].qtd ? a[k].qtd : typeof a[k] === 'number' ? a[k] : 0
        if (b && typeof b === 'object')
          for (var k2 in b)
            tb += b[k2] && b[k2].qtd ? b[k2].qtd : typeof b[k2] === 'number' ? b[k2] : 0
        if (tb === 0) return null
        return ((ta - tb) / tb) * 100
      }
      if (b === 0) return null
      return ((a - b) / b) * 100
    }

    var kpi = function (nome, atualV, anteriorV, meta, unidade) {
      return {
        kpi: nome,
        valor: atualV,
        valor_anterior: anteriorV,
        variacao_pct: variacao(atualV, anteriorV),
        meta: meta || null,
        unidade: unidade || 'numero',
      }
    }

    // ---- Montagem por papel ----
    var grupos
    if (papel === 'direcao') {
      grupos = [
        {
          grupo: 'Aquisição',
          kpis: [
            kpi(
              'novos_negocios',
              atual.novos_negocios,
              anterior.novos_negocios,
              metaDe('novos_negocios', 'novos_negocios_mensal'),
              'numero',
            ),
            kpi('leads_entrada', atual.leads_entrada, anterior.leads_entrada, null, 'numero'),
            kpi(
              'taxa_lead_negocio',
              atual.taxa_lead_negocio,
              anterior.taxa_lead_negocio,
              null,
              'percentual',
            ),
            kpi('origem_ganhos', atual.origem_ganhos, anterior.origem_ganhos, null, 'distribuicao'),
          ],
        },
        {
          grupo: 'Pipeline',
          kpis: [
            kpi(
              'oportunidades_ativas',
              atual.oportunidades_ativas,
              anterior.oportunidades_ativas,
              null,
              'numero',
            ),
            kpi(
              'propostas_abertas',
              atual.propostas_abertas,
              anterior.propostas_abertas,
              null,
              'numero',
            ),
            kpi(
              'valor_propostas_abertas',
              atual.valor_propostas_abertas,
              anterior.valor_propostas_abertas,
              null,
              'moeda',
            ),
            kpi(
              'propostas_paradas',
              atual.propostas_paradas,
              anterior.propostas_paradas,
              null,
              'numero',
            ),
            kpi('conversao', atual.conversao, anterior.conversao, null, 'percentual'),
            kpi(
              'negocios_por_etapa',
              atual.negocios_por_etapa,
              anterior.negocios_por_etapa,
              null,
              'distribuicao',
            ),
            kpi(
              'taxa_conversao_por_etapa',
              atual.taxa_conversao_por_etapa,
              anterior.taxa_conversao_por_etapa,
              null,
              'distribuicao',
            ),
            kpi('motivo_perda', atual.motivo_perda, anterior.motivo_perda, null, 'distribuicao'),
            kpi(
              'negocios_parados',
              atual.negocios_parados,
              anterior.negocios_parados,
              null,
              'numero',
            ),
          ],
        },
        {
          grupo: 'Financeiro',
          kpis: [
            kpi('mrr', atual.mrr, anterior.mrr, null, 'moeda'),
            kpi('receita_nova', atual.receita_nova, anterior.receita_nova, null, 'moeda'),
            kpi('ticket_medio', atual.ticket_medio, anterior.ticket_medio, null, 'moeda'),
            kpi(
              'ciclo_medio_venda_dias',
              atual.ciclo_medio_venda_dias,
              anterior.ciclo_medio_venda_dias,
              null,
              'dias',
            ),
          ],
        },
        {
          grupo: 'Operação',
          kpis: [
            kpi(
              'tarefas_vencidas',
              atual.tarefas_vencidas,
              anterior.tarefas_vencidas,
              null,
              'numero',
            ),
            kpi(
              'oportunidades_paradas',
              atual.oportunidades_paradas,
              anterior.oportunidades_paradas,
              null,
              'numero',
            ),
            kpi(
              'primeira_resposta_p50_segundos',
              atual.primeira_resposta_p50_segundos,
              anterior.primeira_resposta_p50_segundos,
              null,
              'segundos',
            ),
            kpi(
              'tempo_decisao_dias',
              atual.tempo_decisao_dias,
              anterior.tempo_decisao_dias,
              null,
              'dias',
            ),
          ],
        },
      ]
    } else if (papel === 'comercial') {
      grupos = [
        {
          grupo: 'Comercial',
          kpis: [
            kpi('novos_negocios', atual.novos_negocios, anterior.novos_negocios, null, 'numero'),
            kpi(
              'propostas_abertas',
              atual.propostas_abertas,
              anterior.propostas_abertas,
              null,
              'numero',
            ),
            kpi(
              'valor_propostas_abertas',
              atual.valor_propostas_abertas,
              anterior.valor_propostas_abertas,
              null,
              'moeda',
            ),
            kpi(
              'propostas_paradas',
              atual.propostas_paradas,
              anterior.propostas_paradas,
              null,
              'numero',
            ),
            kpi('conversao', atual.conversao, anterior.conversao, null, 'percentual'),
            kpi(
              'tarefas_vencidas',
              atual.tarefas_vencidas,
              anterior.tarefas_vencidas,
              null,
              'numero',
            ),
          ],
        },
      ]
    } else {
      // controladoria
      grupos = [
        {
          grupo: 'Controladoria',
          kpis: [
            kpi('mrr', atual.mrr, anterior.mrr, null, 'moeda'),
            kpi('receita_nova', atual.receita_nova, anterior.receita_nova, null, 'moeda'),
            kpi('ticket_medio', atual.ticket_medio, anterior.ticket_medio, null, 'moeda'),
            kpi(
              'oportunidades_paradas',
              atual.oportunidades_paradas,
              anterior.oportunidades_paradas,
              null,
              'numero',
            ),
            kpi(
              'tempo_decisao_dias',
              atual.tempo_decisao_dias,
              anterior.tempo_decisao_dias,
              null,
              'dias',
            ),
            kpi(
              'oportunidades_ativas',
              atual.oportunidades_ativas,
              anterior.oportunidades_ativas,
              null,
              'numero',
            ),
          ],
        },
      ]
    }

    return e.json(200, {
      papel: papel,
      periodo: { inicio: iso(inicio), fim: iso(fim) },
      periodo_anterior: { inicio: iso(anteriorInicio), fim: iso(anteriorFim) },
      premissa_mrr:
        'MRR = mensalidade de contratos de 12 meses renováveis automaticamente (BPO, Tesouraria, Controladoria) + parcelas recorrentes de Consultoria/CFO marcadas como mensal.',
      grupos: grupos,
      fontes_com_erro: fontesComErro,
    })
  },
  $apis.requireAuth(),
)

// CRUD de metas via API admin (a UI usa a coleção diretamente; regras já
// garantem admin-only). Endpoint de listagem para o painel mostrar metas.
// T3.18: POST cria e PATCH edita — admin-only, auditado (meta_configurada).
routerAdd(
  'POST',
  '/backend/v1/metas',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    if (String(actor.get('role') || '') !== 'admin')
      return e.json(403, { error: 'Edição de metas é exclusiva do admin.' })
    var body = e.requestInfo().body
    var chave = String(body.chave || '').trim()
    var papel = String(body.papel || '').trim()
    var valor = Number(body.valor_meta)
    var periodicidade = String(body.periodicidade || 'mensal').trim()
    var descricao = String(body.descricao || '').trim()
    if (!chave) return e.json(400, { error: 'Informe a chave do indicador.' })
    var Papeis = ['direcao', 'comercial', 'controladoria', 'administracao']
    if (Papeis.indexOf(papel) < 0)
      return e.json(400, {
        error: 'Papel inválido. Use: direcao, comercial, controladoria ou administracao.',
      })
    if (!Number.isFinite(valor) || valor < 0)
      return e.json(400, { error: 'valor_meta deve ser número maior ou igual a zero.' })
    if (['mensal', 'semanal', 'trimestral', 'anual'].indexOf(periodicidade) < 0)
      return e.json(400, {
        error: 'Periodicidade inválida. Use: mensal, semanal, trimestral ou anual.',
      })
    var dup = []
    try {
      dup = $app.findRecordsByFilter(
        'metas_indicadores',
        'chave = {:c} && papel = {:p} && ativo = true',
        '',
        1,
        0,
        { c: chave, p: papel },
      )
    } catch (_) {}
    if (dup.length > 0)
      return e.json(400, {
        error: 'Já existe meta ativa para este indicador e papel. Edite a existente.',
      })
    var col = $app.findCollectionByNameOrId('metas_indicadores')
    var rec = new Record(col)
    rec.set('chave', chave)
    rec.set('papel', papel)
    rec.set('valor_meta', valor)
    rec.set('periodicidade', periodicidade)
    rec.set('ativo', body.ativo !== false)
    rec.set('descricao', descricao)
    try {
      $app.save(rec)
    } catch (err) {
      return e.json(400, { error: 'Falha ao salvar meta: ' + String(err) })
    }
    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var ev = new Record(audit)
      ev.set('entidade', 'metas_indicadores')
      ev.set('registro_id', rec.id)
      ev.set('acao', 'meta_configurada')
      ev.set('ator_id', actor.id)
      ev.set('ocorrido_em', new Date().toISOString())
      ev.set('estado_anterior', '')
      ev.set(
        'estado_posterior',
        JSON.stringify({
          chave: chave,
          papel: papel,
          valor_meta: valor,
          periodicidade: periodicidade,
        }),
      )
      $app.save(ev)
    } catch (errA) {
      $app.logger().error('T318 auditoria meta falhou', 'error', String(errA))
    }
    return e.json(200, { ok: true, id: rec.id, chave: chave, papel: papel, valor_meta: valor })
  },
  $apis.requireAuth(),
)

routerAdd(
  'PATCH',
  '/backend/v1/metas/{id}',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    if (String(actor.get('role') || '') !== 'admin')
      return e.json(403, { error: 'Edição de metas é exclusiva do admin.' })
    var id = e.request.pathValue('id')
    var rec = null
    try {
      rec = $app.findRecordById('metas_indicadores', id)
    } catch (_) {
      return e.json(404, { error: 'Meta não encontrada.' })
    }
    var body = e.requestInfo().body
    var antes = {
      chave: String(rec.get('chave') || ''),
      papel: String(rec.get('papel') || ''),
      valor_meta: Number(rec.get('valor_meta') || 0),
      periodicidade: String(rec.get('periodicidade') || ''),
      ativo: rec.get('ativo') === true,
      descricao: String(rec.get('descricao') || ''),
    }
    if (body.valor_meta !== undefined) {
      var v = Number(body.valor_meta)
      if (!Number.isFinite(v) || v < 0)
        return e.json(400, { error: 'valor_meta deve ser número maior ou igual a zero.' })
      rec.set('valor_meta', v)
    }
    if (body.ativo !== undefined) rec.set('ativo', body.ativo === true)
    if (body.descricao !== undefined) rec.set('descricao', String(body.descricao || '').trim())
    if (body.periodicidade !== undefined) {
      var per = String(body.periodicidade || '').trim()
      if (['mensal', 'semanal', 'trimestral', 'anual'].indexOf(per) < 0)
        return e.json(400, {
          error: 'Periodicidade inválida. Use: mensal, semanal, trimestral ou anual.',
        })
      rec.set('periodicidade', per)
    }
    try {
      $app.save(rec)
    } catch (err) {
      return e.json(400, { error: 'Falha ao salvar meta: ' + String(err) })
    }
    try {
      var audit2 = $app.findCollectionByNameOrId('auditoria')
      var ev2 = new Record(audit2)
      ev2.set('entidade', 'metas_indicadores')
      ev2.set('registro_id', rec.id)
      ev2.set('acao', 'meta_configurada')
      ev2.set('ator_id', actor.id)
      ev2.set('ocorrido_em', new Date().toISOString())
      ev2.set('estado_anterior', JSON.stringify(antes))
      ev2.set(
        'estado_posterior',
        JSON.stringify({
          valor_meta: Number(rec.get('valor_meta') || 0),
          ativo: rec.get('ativo') === true,
        }),
      )
      $app.save(ev2)
    } catch (errA2) {
      $app.logger().error('T318 auditoria meta falhou', 'error', String(errA2))
    }
    return e.json(200, { ok: true, id: rec.id })
  },
  $apis.requireAuth(),
)
routerAdd(
  'GET',
  '/backend/v1/metas',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var ms = []
    try {
      ms = $app.findRecordsByFilter('metas_indicadores', '', 'papel', 200, 0)
    } catch (err) {
      return e.json(500, { error: 'Falha ao consultar metas.' })
    }
    var itens = []
    for (var i = 0; i < ms.length; i++) {
      itens.push({
        id: ms[i].id,
        chave: String(ms[i].get('chave') || ''),
        papel: String(ms[i].get('papel') || ''),
        valor_meta: Number(ms[i].get('valor_meta') || 0),
        periodicidade: String(ms[i].get('periodicidade') || ''),
        ativo: ms[i].get('ativo') === true,
        descricao: String(ms[i].get('descricao') || ''),
      })
    }
    return e.json(200, { total: itens.length, itens: itens })
  },
  $apis.requireAuth(),
)
