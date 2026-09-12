// T3.02b — regra server-side da ficha (v2): motivo_atualizacao obrigatório no
// CREATE; no UPDATE, exigido somente quando o CONTEÚDO muda (versão avança ou
// campos de leitura são alterados) — PATCH sem mudança real não reexige
// (idempotência), e PATCH que muda conteúdo sem motivo é bloqueado (400).
onRecordCreateRequest((e) => {
  var motivo = String(e.record.get('motivo_atualizacao') || '').trim()
  if (motivo.length < 10) {
    throw new Error('Informe o motivo da atualização (mínimo 10 caracteres).')
  }
  e.next()
}, 'fichas_proposta')

onRecordUpdateRequest((e) => {
  var before = e.record.original()
  var motivo = String(e.record.get('motivo_atualizacao') || '').trim()
  var motivoAnterior = String(before.get('motivo_atualizacao') || '').trim()

  var campos = [
    'solucao_recomendada',
    'escopo_sugerido',
    'frequencia_atuacao',
    'senioridade',
    'entregaveis',
    'premissas_precificacao',
    'pontos_a_confirmar',
  ]
  var conteudoMudou = false
  for (var i = 0; i < campos.length; i++) {
    if (String(e.record.get(campos[i]) || '') !== String(before.get(campos[i]) || '')) {
      conteudoMudou = true
    }
  }
  var versaoNova = Number(e.record.get('versao') || 0)
  var versaoAnterior = Number(before.get('versao') || 0)
  if (versaoNova !== versaoAnterior) conteudoMudou = true

  if (conteudoMudou) {
    if (motivo.length < 10) {
      throw new Error('Informe o motivo da atualização (mínimo 10 caracteres).')
    }
  } else if (motivo.length < 10 && motivoAnterior.length >= 10) {
    // PATCH sem mudança de conteúdo: preserva o motivo anterior (idempotência).
    e.record.set('motivo_atualizacao', motivoAnterior)
  }
  e.next()
}, 'fichas_proposta')
