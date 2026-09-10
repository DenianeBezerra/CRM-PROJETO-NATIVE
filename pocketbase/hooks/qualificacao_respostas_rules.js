// T2.12 — CA-2-007: validação server-side das respostas de qualificação.
// Regras: pergunta deve estar ATIVA; resposta obrigatória não pode ser vazia;
// tipo da resposta deve bater com o tipo da pergunta; unicidade por par
// (negocio+pergunta) garantida pelo índice único, com mensagem clara aqui.
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
    // sim_nao admite true/false; undefined = não respondido
    throw new Error('Resposta obrigatória: selecione sim ou não.')
  }

  // Unicidade por par (o índice único também protege; mensagem amigável aqui).
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

  e.next()
}, 'respostas_qualificacao')
