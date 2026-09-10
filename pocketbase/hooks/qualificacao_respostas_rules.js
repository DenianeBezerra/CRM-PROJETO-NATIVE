// T2.12 — CA-2-007: validação server-side das respostas de qualificação.
// Lições v0.0.169–0.0.174:
// (1) respondido_em é autodate — set() manual gera 400 genérico;
// (2) índice UNIQUE composto sobre relations derruba todo INSERT — unicidade
//     por (negocio, pergunta) é validada aqui no hook;
// (3) findFirstRecordByFilter NÃO aceita sort; bind params {:x} falhou neste
//     JSVM — interpolação direta de IDs (PocketBase IDs são [a-z0-9], seguros);
// (4) número ausente vira 0 no model hook (zero value) — a checagem de
//     "número obrigatório vazio" precisa do corpo cru da requisição.

onRecordCreateRequest((e) => {
  const body = e.requestInfo().body || {}
  const perguntaId = String(body.pergunta || '')
  if (perguntaId === '') {
    throw new Error('Pergunta de qualificação obrigatória.')
  }
  let pergunta
  try {
    pergunta = $app.findRecordById('perguntas_qualificacao', perguntaId)
  } catch (_) {
    throw new Error('Pergunta de qualificação não encontrada.')
  }
  if (String(pergunta.get('tipo') || '') === 'numero') {
    const bruto = body.resposta_numero
    if (bruto === undefined || bruto === null || bruto === '') {
      throw new Error('Resposta obrigatória: informe o número.')
    }
  }
  e.next()
}, 'respostas_qualificacao')

onRecordCreate((e) => {
  let pergunta
  try {
    pergunta = $app.findRecordById('perguntas_qualificacao', e.record.get('pergunta'))
  } catch (_) {
    throw new Error('Pergunta de qualificação não encontrada.')
  }

  if (!pergunta.get('ativa')) {
    throw new Error('Pergunta inativa: reative-a na administração antes de responder.')
  }

  const tipo = String(pergunta.get('tipo') || '')
  const texto = String(e.record.get('resposta_texto') || '').trim()
  const bool = e.record.get('resposta_bool')

  if (tipo === 'texto_livre' && texto === '') {
    throw new Error('Resposta obrigatória: informe o texto.')
  }
  if (tipo === 'escolha_unica') {
    const opcoes = String(pergunta.get('opcoes') || '')
      .split(';')
      .map(function (o) {
        return o.trim()
      })
      .filter(function (o) {
        return o
      })
    if (!texto || opcoes.indexOf(texto) === -1) {
      throw new Error('Escolha uma das opções configuradas para esta pergunta.')
    }
  }
  if (tipo === 'sim_nao' && bool === undefined) {
    throw new Error('Resposta obrigatória: selecione sim ou não.')
  }

  // Unicidade por par (negocio + pergunta) — interpolação direta de IDs.
  let duplicada = null
  try {
    duplicada = $app.findFirstRecordByFilter(
      'respostas_qualificacao',
      'negocio = "' +
        e.record.get('negocio') +
        '" && pergunta = "' +
        e.record.get('pergunta') +
        '"',
    )
  } catch (_) {
    duplicada = null // nenhum registro = esperado
  }
  if (duplicada && duplicada.id !== e.record.id) {
    throw new Error(
      'Esta pergunta já foi respondida para esta oportunidade. Edite a resposta existente.',
    )
  }

  e.next()
}, 'respostas_qualificacao')

onRecordUpdate((e) => {
  let pergunta
  try {
    pergunta = $app.findRecordById('perguntas_qualificacao', e.record.get('pergunta'))
  } catch (_) {
    throw new Error('Pergunta de qualificação não encontrada.')
  }

  const tipo = String(pergunta.get('tipo') || '')
  const texto = String(e.record.get('resposta_texto') || '').trim()

  if (tipo === 'texto_livre' && texto === '') {
    throw new Error('Resposta obrigatória: informe o texto.')
  }
  if (tipo === 'escolha_unica') {
    const opcoes = String(pergunta.get('opcoes') || '')
      .split(';')
      .map(function (o) {
        return o.trim()
      })
      .filter(function (o) {
        return o
      })
    if (!texto || opcoes.indexOf(texto) === -1) {
      throw new Error('Escolha uma das opções configuradas para esta pergunta.')
    }
  }

  e.next()
}, 'respostas_qualificacao')
