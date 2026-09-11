// T2.36 — CA-2-031: dicionário de métricas (leitura).
// GET /backend/v1/metricas/dicionario — autenticado; operador lê, só admin
// edita (regras da coleção). Retorna todas as métricas com fórmula, fonte,
// evento inicial/final, fuso, exclusões e dono — a receita de cada número.
routerAdd(
  'GET',
  '/backend/v1/metricas/dicionario',
  (e) => {
    if (!e.auth) {
      return e.json(401, { error: 'Autenticação obrigatória.' })
    }
    let rows = []
    try {
      rows = $app.findRecordsByFilter('dicionario_metricas', '', 'chave', 500, 0)
    } catch (err) {
      return e.json(500, { error: 'Falha ao consultar o dicionário: ' + String(err) })
    }
    const metricas = []
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      metricas.push({
        chave: String(r.get('chave') || ''),
        nome: String(r.get('nome') || ''),
        formula: String(r.get('formula') || ''),
        fonte: String(r.get('fonte') || ''),
        evento_inicial: String(r.get('evento_inicial') || ''),
        evento_final: String(r.get('evento_final') || ''),
        fuso: String(r.get('fuso') || ''),
        exclusoes: String(r.get('exclusoes') || ''),
        dono: String(r.get('dono') || ''),
        endpoint: String(r.get('endpoint') || ''),
        ativa: r.get('ativa') === true,
      })
    }
    return e.json(200, {
      total: metricas.length,
      fuso_padrao: 'America/Sao_Paulo',
      metricas: metricas,
    })
  },
  $apis.requireAuth(),
)
