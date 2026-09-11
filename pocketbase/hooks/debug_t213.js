// T2.13 — rota de debug TEMPORÁRIA (remover antes do teste humano).
// GET /backend/v1/debug/t213?negocio=<id> — admin-only, somente leitura.
routerAdd(
  'GET',
  '/backend/v1/debug/t213',
  (e) => {
    const actor = e.auth
    if (!actor || actor.get('role') !== 'admin') {
      return e.json(403, { error: 'admin only' })
    }
    const nid = String((e.requestInfo().query || {}).negocio || '')
    const out = { negocio: nid }
    let excecoes = []
    try {
      excecoes = $app.findRecordsByFilter(
        'excecoes_qualificacao',
        'negocio = "' + nid + '"',
        '-created',
        50,
        0,
      )
    } catch (err) {
      out.excecoes_erro = String(err)
    }
    out.excecoes_count = excecoes.length
    const lista = []
    for (let i = 0; i < excecoes.length; i++) {
      const raw = String(excecoes[i].get('validade') || '')
      lista.push({
        id: excecoes[i].id,
        validade_raw: raw,
        validade_tipo: typeof excecoes[i].get('validade'),
        parsed_com_T: Date.parse(raw.replace(' ', 'T')),
        parsed_sem_T: Date.parse(raw),
        agora: Date.now(),
        motivo: String(excecoes[i].get('motivo') || ''),
      })
    }
    out.excecoes = lista
    let respostas = []
    try {
      respostas = $app.findRecordsByFilter(
        'respostas_qualificacao',
        'negocio = "' + nid + '"',
        '-created',
        500,
        0,
      )
    } catch (err) {
      out.respostas_erro = String(err)
    }
    out.respostas_count = respostas.length
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
      out.perguntas_erro = String(err)
    }
    const apl = []
    for (let i = 0; i < perguntas.length; i++) {
      apl.push({
        id: perguntas[i].id,
        texto: String(perguntas[i].get('texto') || ''),
        obrigatoria: !!perguntas[i].get('obrigatoria'),
        aplicavel_a: String(perguntas[i].get('aplicavel_a') || ''),
      })
    }
    out.perguntas_ativas = apl
    return e.json(200, out)
  },
  $apis.requireAuth(),
)
