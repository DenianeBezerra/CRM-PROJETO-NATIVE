// T2.11 — CA-2-006: validação server-side da configuração de perguntas de
// qualificação. Model hooks (dentro da transação do próprio save) — padrão
// comercial_fields_rules.js. Regras: texto não vazio, tipo válido (garantido
// pelo select), ordem inteira >= 0, opções exigidas para escolha_unica,
// e unicidade de ordem entre perguntas ativas.
onRecordCreate((e) => {
  const texto = String(e.record.get('texto') || '').trim()
  if (texto.length < 3) {
    throw new Error('A pergunta precisa de um texto com ao menos 3 caracteres.')
  }

  const ordemRaw = e.record.get('ordem')
  const ordem = Number(ordemRaw)
  if (!Number.isFinite(ordem) || !Number.isInteger(ordem) || ordem < 0) {
    throw new Error('A ordem deve ser um número inteiro não negativo.')
  }

  const tipo = String(e.record.get('tipo') || '').trim()
  if (tipo === 'escolha_unica') {
    const opcoes = String(e.record.get('opcoes') || '').trim()
    if (
      !opcoes ||
      opcoes.split(';').filter(function (o) {
        return o.trim()
      }).length < 2
    ) {
      throw new Error('Pergunta de escolha única exige ao menos 2 opções separadas por ";".')
    }
  }

  // Unicidade de ordem entre perguntas ativas (exceto a própria, no update).
  let conflitos = []
  try {
    conflitos = $app.findRecordsByFilter(
      'perguntas_qualificacao',
      'ativa = true && ordem = {:o}',
      '-created',
      2,
      0,
      { o: ordem },
    )
  } catch (err) {
    $app.logger().error('Falha ao checar ordem de perguntas', 'error', String(err))
    throw new Error('Falha ao validar a ordem da pergunta.')
  }
  for (let i = 0; i < conflitos.length; i++) {
    if (conflitos[i].id !== e.record.id) {
      throw new Error('Já existe uma pergunta ativa com a ordem ' + ordem + '.')
    }
  }

  e.next()
}, 'perguntas_qualificacao')

onRecordUpdate((e) => {
  const texto = String(e.record.get('texto') || '').trim()
  if (texto.length < 3) {
    throw new Error('A pergunta precisa de um texto com ao menos 3 caracteres.')
  }

  const ordem = Number(e.record.get('ordem'))
  if (!Number.isFinite(ordem) || !Number.isInteger(ordem) || ordem < 0) {
    throw new Error('A ordem deve ser um número inteiro não negativo.')
  }

  const tipo = String(e.record.get('tipo') || '').trim()
  if (tipo === 'escolha_unica') {
    const opcoes = String(e.record.get('opcoes') || '').trim()
    if (
      !opcoes ||
      opcoes.split(';').filter(function (o) {
        return o.trim()
      }).length < 2
    ) {
      throw new Error('Pergunta de escolha única exige ao menos 2 opções separadas por ";".')
    }
  }

  let conflitos = []
  try {
    conflitos = $app.findRecordsByFilter(
      'perguntas_qualificacao',
      'ativa = true && ordem = {:o}',
      '-created',
      2,
      0,
      { o: ordem },
    )
  } catch (err) {
    $app.logger().error('Falha ao checar ordem de perguntas', 'error', String(err))
    throw new Error('Falha ao validar a ordem da pergunta.')
  }
  for (let i = 0; i < conflitos.length; i++) {
    if (conflitos[i].id !== e.record.id) {
      throw new Error('Já existe uma pergunta ativa com a ordem ' + ordem + '.')
    }
  }

  e.next()
}, 'perguntas_qualificacao')
