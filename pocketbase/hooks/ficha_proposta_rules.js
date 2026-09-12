// T3.02b — regra server-side da ficha (v3): motivo_atualizacao obrigatório no
// CREATE; no UPDATE, exigido quando a VERSÃO avança ou o CONTEÚDO muda.
// PATCH sem mudança real preserva o motivo anterior (idempotência).
// Nota: e.record.original() pode refletir o payload parcial no JSVM — por isso
// a versão anterior é lida ANTES do PATCH e comparada com a versão enviada.
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
    var novo = e.record.get(campos[i])
    var antigo = before.get(campos[i])
    // Só compara se o campo veio no payload (undefined = não enviado).
    if (
      novo !== undefined &&
      novo !== null &&
      String(novo) !== String(antigo === null || antigo === undefined ? '' : antigo)
    ) {
      conteudoMudou = true
    }
  }
  var versaoNova = Number(e.record.get('versao') || 0)
  var versaoAnterior = Number(before.get('versao') || 0)
  if (versaoNova > versaoAnterior) conteudoMudou = true

  if (conteudoMudou) {
    if (motivo.length < 10) {
      throw new Error('Informe o motivo da atualização (mínimo 10 caracteres).')
    }
  } else if (motivo.length < 10 && motivoAnterior.length >= 10) {
    e.record.set('motivo_atualizacao', motivoAnterior)
  }
  e.next()
}, 'fichas_proposta')
