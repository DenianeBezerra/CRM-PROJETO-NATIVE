migrate(
  (app) => {
    // T2.36 — seed do dicionário com as 5 métricas existentes. Fórmulas e
    // exclusões extraídas do código real (operational_queues.js,
    // fila_propostas_vencidas_cron.js) — nada inventado.
    const DONO = 'Deniane Bezerra (CFO)'
    const FUSO = 'America/Sao_Paulo'
    const metricas = [
      {
        chave: 'oportunidades_por_status',
        nome: 'Oportunidades por status',
        formula:
          'Contagem de registros em negocios agrupados por: ativas (estagio fora de fechado_ganho/fechado_perdido e arquivado=false), arquivadas (arquivado=true), fechado_ganho, fechado_perdido.',
        fonte: 'negocios',
        evento_inicial: 'Criação da oportunidade (created)',
        evento_final: 'Transição para fechado_ganho ou fechado_perdido (estagio)',
        exclusoes:
          'Nenhuma: todas as oportunidades entram exatamente em um grupo; arquivadas são contadas em grupo próprio.',
        endpoint: 'GET /backend/v1/operacional/resumo',
      },
      {
        chave: 'tempo_por_etapa',
        nome: 'Tempo por etapa',
        formula:
          'Soma de duracao_segundos das permanencias_negocio por etapa; intervalos encerrados usam saiu_em - entrou_em; intervalo aberto conta até o momento da consulta (now - entrou_em).',
        fonte: 'permanencias_negocio, etapas_negocio',
        evento_inicial:
          'Entrada na etapa (permanencias_negocio.entrou_em, gravado no model hook de mudança de estágio)',
        evento_final:
          'Saída da etapa (permanencias_negocio.saiu_em) ou momento da consulta para etapa aberta',
        exclusoes:
          'Permanências duplicadas abertas para o mesmo negócio não somam duas vezes (sinalizadas em estado_invalido); etapas inativas com tempo apurado aparecem marcadas ativa=false.',
        endpoint: 'GET /backend/v1/operacional/tempo-por-etapa',
      },
      {
        chave: 'acoes_vencidas',
        nome: 'Ações vencidas',
        formula:
          'Oportunidades com proxima_acao_em < agora (data parseável), não arquivadas e estagio fora de fechado_ganho/fechado_perdido.',
        fonte: 'negocios',
        evento_inicial: 'Registro da próxima ação (negocios.proxima_acao_em)',
        evento_final: 'Agora (momento da consulta) — a ação vence quando a data passa',
        exclusoes:
          'Arquivadas (arquivado=true) não entram; etapas finais (fechado_ganho/fechado_perdido) não entram; sem próxima ação ou data não parseável não entram.',
        endpoint: 'GET /backend/v1/operacional/acoes-vencidas',
      },
      {
        chave: 'oportunidades_paradas',
        nome: 'Oportunidades paradas',
        formula:
          'Oportunidades não arquivadas, fora de etapa final, com exatamente 1 permanência aberta cuja duração (now - entrou_em) excede o limite configurado (configuracoes_operacionais.limite_oportunidade_parada_dias, padrão 10 dias).',
        fonte: 'negocios, permanencias_negocio, configuracoes_operacionais',
        evento_inicial: 'Entrada na etapa atual (permanencias_negocio.entrou_em)',
        evento_final: 'Agora (momento da consulta) — parada enquanto a duração excede o limite',
        exclusoes:
          'Arquivadas não entram; etapas finais não entram; sem permanência aberta ou com múltiplas abertas (estado inválido) não entram.',
        endpoint: 'GET /backend/v1/operacional/paradas',
      },
      {
        chave: 'propostas_vencidas',
        nome: 'Propostas vencidas',
        formula:
          'Propostas em status rascunho/emitida cuja validade passou (data de validade < agora), apuradas pelo cron diário fila_propostas_vencidas_diaria (08:00) e sob demanda pelo endpoint de fila.',
        fonte: 'propostas',
        evento_inicial: 'Emissão da proposta (propostas.emitida_em) com data de validade',
        evento_final: 'Validade da proposta (data de validade) ou decisão humana (aceite/recusa)',
        exclusoes:
          'Propostas aceitas ou recusadas não entram (decisão humana encerra o ciclo); sem data de validade não entram.',
        endpoint: 'GET /backend/v1/operacional/propostas-vencidas + cron diário 08:00',
      },
    ]

    for (let i = 0; i < metricas.length; i++) {
      const m = metricas[i]
      let existente = []
      try {
        existente = $app.findRecordsByFilter('dicionario_metricas', 'chave = {:c}', '', 1, 0, {
          c: m.chave,
        })
      } catch (_) {}
      if (existente.length > 0) continue
      const rec = new Record(app.findCollectionByNameOrId('dicionario_metricas'))
      rec.set('chave', m.chave)
      rec.set('nome', m.nome)
      rec.set('formula', m.formula)
      rec.set('fonte', m.fonte)
      rec.set('evento_inicial', m.evento_inicial)
      rec.set('evento_final', m.evento_final)
      rec.set('fuso', FUSO)
      rec.set('exclusoes', m.exclusoes)
      rec.set('dono', DONO)
      rec.set('endpoint', m.endpoint)
      rec.set('ativa', true)
      app.save(rec)
    }
  },
  (app) => {},
)
