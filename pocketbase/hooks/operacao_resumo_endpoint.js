// Tela inicial v2.1 (CEO 13/09) — A-23: a tela de entrada diz onde está o
// problema. Resumo mínimo de pendências operacionais para os contadores da
// home (Operação do dia). Admin-only (mesmo papel da visão de coordenação):
// analista vê o próprio Meu dia; a visão consolidada é da coordenação.
// Somente leitura, sem dados pessoais (padrão AP-2026-09-13-2225).
routerAdd(
  'GET',
  '/backend/v1/visao/operacao-resumo',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    if (String(actor.get('role') || '') !== 'admin')
      return e.json(403, { error: 'Resumo operacional consolidado é exclusivo da coordenação.' })
    var hoje = new Date().toISOString().slice(0, 10)
    var atrasadas = 0
    try {
      var obrs = $app.findRecordsByFilter(
        'obrigacoes',
        'concluida != true && data_prevista < {:hoje}',
        '',
        500,
        0,
        { hoje: hoje },
      )
      atrasadas = obrs.length
    } catch (err1) {
      return e.json(500, { error: 'Falha ao consultar obrigações: ' + String(err1) })
    }
    var excecoes = 0
    try {
      var exs = $app.findRecordsByFilter('excecoes', 'status = {:aberta}', '', 500, 0, {
        aberta: 'aberta',
      })
      excecoes = exs.length
    } catch (err2) {
      return e.json(500, { error: 'Falha ao consultar exceções: ' + String(err2) })
    }
    return e.json(200, { atrasadas_efetivas: atrasadas, excecoes_abertas: excecoes })
  },
  $apis.requireAuth(),
)
