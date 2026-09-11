// T2.28 — CA-2-023: filas operacionais distintas e reproduzíveis.
// GET /backend/v1/filas/operacionais (autenticado) — leitura pura, sem write.
//
// Três filas com critérios explícitos:
// 1) tarefas_vencidas — tarefas status='aberta' com prazo no passado;
//    operator vê só as suas (responsavel), admin vê todas;
// 2) sem_proxima_acao — oportunidades ativas (não finais, não arquivadas)
//    com proxima_acao_em vazia OU passada e SEM exceção vigente
//    (mesmo critério do hook oportunidade_saudavel, T2.18);
// 3) excecoes_vigentes — exceções de qualificação com validade futura;
//    fila administrativa: admin vê todas, operator não vê (lista vazia
//    com flag visivel_para_operator=false).
//
// Lições JSVM: lógica inline nos callbacks, datas PB " " → "T",
// findRecordsByFilter com sort/limit.
routerAdd(
  'GET',
  '/backend/v1/filas/operacionais',
  (e) => {
    const actor = e.auth
    if (!actor) {
      return e.json(403, { error: 'Autenticação necessária.' })
    }
    const ehAdmin = actor.get('role') === 'admin'
    const agora = Date.now()
    const FINAL_STAGES = ['fechado_ganho', 'fechado_perdido']

    // ---------- Fila 1: tarefas vencidas ----------
    let filtroTarefas = "status = 'aberta'"
    if (!ehAdmin) filtroTarefas += ' && responsavel = "' + actor.id + '"'
    const tarefasVencidas = []
    try {
      const abertas = $app.findRecordsByFilter('tarefas', filtroTarefas, '-prazo', 500, 0)
      for (let i = 0; i < abertas.length; i++) {
        const t = abertas[i]
        const prazo = String(t.get('prazo') || '').replace(' ', 'T')
        if (!prazo || prazo.startsWith('0001-01-01')) continue // sem prazo não é vencida
        const ms = Date.parse(prazo)
        if (isNaN(ms) || ms >= agora) continue // prazo futuro não entra
        let titulo = ''
        try {
          const neg = $app.findRecordById('negocios', String(t.get('negocio') || ''))
          titulo = String(neg.get('titulo') || '')
        } catch (_) {
          titulo = '(oportunidade removida)'
        }
        tarefasVencidas.push({
          tarefa: t.id,
          negocio: String(t.get('negocio') || ''),
          titulo_negocio: titulo,
          titulo_tarefa: String(t.get('titulo') || ''),
          prioridade: String(t.get('prioridade') || ''),
          prazo: String(t.get('prazo') || ''),
          responsavel: String(t.get('responsavel') || ''),
        })
      }
    } catch (err) {
      $app.logger().error('T228 falha na fila de tarefas', 'error', String(err))
      return e.json(500, { error: 'Falha ao consultar a fila de tarefas.' })
    }

    // ---------- Fila 2: oportunidades sem próxima ação ----------
    const semProximaAcao = []
    try {
      const deals = $app.findRecordsByFilter('negocios', '', '-created', 20000, 0)
      for (let i = 0; i < deals.length; i++) {
        const d = deals[i]
        if (d.getBool('arquivado')) continue
        const estagio = String(d.get('estagio') || '')
        if (FINAL_STAGES.indexOf(estagio) >= 0) continue
        const quando = String(d.get('proxima_acao_em') || '').replace(' ', 'T')
        let semAcao = true
        if (quando && !quando.startsWith('0001-01-01')) {
          const ms = Date.parse(quando)
          if (!isNaN(ms) && ms >= agora) semAcao = false // ação futura = saudável
        }
        if (!semAcao) continue
        // Exceção vigente libera (mesmo critério do hook oportunidade_saudavel).
        let liberada = false
        try {
          const excecoes = $app.findRecordsByFilter(
            'excecoes_qualificacao',
            'negocio = "' + d.id + '"',
            '-created',
            50,
            0,
          )
          for (let j = 0; j < excecoes.length; j++) {
            const validade = Date.parse(String(excecoes[j].get('validade') || '').replace(' ', 'T'))
            if (!isNaN(validade) && validade >= agora) {
              liberada = true
              break
            }
          }
        } catch (_) {
          liberada = false
        }
        if (liberada) continue
        semProximaAcao.push({
          negocio: d.id,
          titulo: String(d.get('titulo') || ''),
          estagio: estagio,
          proxima_acao_em: String(d.get('proxima_acao_em') || ''),
          responsavel: String(d.get('responsavel') || ''),
        })
      }
    } catch (err) {
      $app.logger().error('T228 falha na fila sem próxima ação', 'error', String(err))
      return e.json(500, { error: 'Falha ao consultar a fila de oportunidades.' })
    }

    // ---------- Fila 3: exceções vigentes (administrativa) ----------
    const excecoesVigentes = []
    if (ehAdmin) {
      try {
        const excecoes = $app.findRecordsByFilter('excecoes_qualificacao', '', '-validade', 500, 0)
        for (let i = 0; i < excecoes.length; i++) {
          const x = excecoes[i]
          const validade = String(x.get('validade') || '').replace(' ', 'T')
          const ms = Date.parse(validade)
          if (isNaN(ms) || ms < agora) continue // expirada não entra
          let titulo = ''
          try {
            const neg = $app.findRecordById('negocios', String(x.get('negocio') || ''))
            titulo = String(neg.get('titulo') || '')
          } catch (_) {
            titulo = '(oportunidade removida)'
          }
          excecoesVigentes.push({
            excecao: x.id,
            negocio: String(x.get('negocio') || ''),
            titulo_negocio: titulo,
            motivo: String(x.get('motivo') || ''),
            validade: String(x.get('validade') || ''),
            criado_por: String(x.get('criado_por') || ''),
          })
        }
      } catch (err) {
        $app.logger().error('T228 falha na fila de exceções', 'error', String(err))
        return e.json(500, { error: 'Falha ao consultar a fila de exceções.' })
      }
    }

    return e.json(200, {
      tarefas_vencidas: { itens: tarefasVencidas, total: tarefasVencidas.length },
      sem_proxima_acao: { itens: semProximaAcao, total: semProximaAcao.length },
      excecoes_vigentes: {
        itens: excecoesVigentes,
        total: excecoesVigentes.length,
        visivel_para_operator: false,
      },
      consultado_em: new Date().toISOString(),
    })
  },
  $apis.requireAuth(),
)
