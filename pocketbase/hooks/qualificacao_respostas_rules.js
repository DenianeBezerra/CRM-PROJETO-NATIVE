// T2.12 — CA-2-007: validação server-side das respostas de qualificação.
// Lições v0.0.169–0.0.171:
// (1) campo date do PocketBase exige formato "YYYY-MM-DD HH:MM:SS.mmmZ"
//     (espaço, não "T") — toISOString() puro falha a validação com 400 genérico;
// (2) índice UNIQUE composto sobre relations derruba todo INSERT com 400
//     genérico — unicidade por (negocio, pergunta) é validada aqui no hook;
// (3) funções auxiliares devem ser declaradas inline dentro do callback ou
//     como function declaration simples (padrão JSVM).
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
  const numero = e.record.get('resposta_numero')
  const bool = e.record.get('resposta_bool')

  if (tipo === 'texto_livre' && texto === '') {
    throw new Error('Resposta obrigatória: informe o texto.')
  }
  if (tipo === 'numero' && (numero === undefined || numero === null || String(numero) === '')) {
    throw new Error('Resposta obrigatória: informe o número.')
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

  // Unicidade por par (negocio + pergunta) — validada aqui (o índice UNIQUE
  // composto sobre relations derrubava todo INSERT com erro genérico).
  let existentes = []
  try {
    existentes = $app.findRecordsByFilter(
      'respostas_qualificacao',
      'negocio = {:n} && pergunta = {:p}',
      '-created',
      2,
      0,
      { n: e.record.get('negocio'), p: e.record.get('pergunta') },
    )
  } catch (err) {
    $app.logger().error('Falha ao checar duplicidade de resposta', 'error', String(err))
    throw new Error('Falha ao validar a resposta.')
  }
  for (let i = 0; i < existentes.length; i++) {
    if (existentes[i].id !== e.record.id) {
      throw new Error(
        'Esta pergunta já foi respondida para esta oportunidade. Edite a resposta existente.',
      )
    }
  }

  // respondido_em é autodate (preenchido automaticamente no create/update) —
  // set() manual em campo autodate gera erro 400 genérico (lição v0.0.171).
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
  const numero = e.record.get('resposta_numero')

  if (tipo === 'texto_livre' && texto === '') {
    throw new Error('Resposta obrigatória: informe o texto.')
  }
  if (tipo === 'numero' && (numero === undefined || numero === null || String(numero) === '')) {
    throw new Error('Resposta obrigatória: informe o número.')
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

  // respondido_em é autodate — set() manual gera 400 genérico (lição v0.0.171).
  e.next()
}, 'respostas_qualificacao')
