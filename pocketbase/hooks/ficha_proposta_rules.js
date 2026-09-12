// T3.02b — regra server-side da ficha (v6): motivo_atualizacao obrigatório no
// CREATE; no UPDATE, exigido quando a VERSÃO avança ou o CONTEÚDO muda.
// PATCH sem mudança real preserva o motivo anterior (idempotência).
// v6: validação de UPDATE movida para onRecordUpdateRequest com leitura do
// registro original DIRETO DO BANCO por findRecordById (fonte da verdade —
// e.record.original() no request hook refletia o payload parcial).
onRecordCreateRequest((e) => {
  var motivo = String(e.record.get('motivo_atualizacao') || '').trim()
  if (motivo.length < 10) {
    throw new Error('Informe o motivo da atualização (mínimo 10 caracteres).')
  }
  e.next()
}, 'fichas_proposta')

onRecordUpdateRequest((e) => {
  var motivo = String(e.record.get('motivo_atualizacao') || '').trim()
  var motivoAnterior = ''
  var versaoBanco = 0
  var noBanco = null
  try {
    noBanco = $app.findRecordById('fichas_proposta', e.record.id)
    motivoAnterior = String(noBanco.get('motivo_atualizacao') || '').trim()
    versaoBanco = Number(noBanco.get('versao') || 0)
  } catch (_) {}

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
    if (novo !== undefined && novo !== null && noBanco) {
      var antigo = String(noBanco.get(campos[i]) || '')
      if (String(novo) !== antigo) conteudoMudou = true
    }
  }
  var versaoNova = Number(e.record.get('versao') || 0)
  if (versaoNova > versaoBanco) conteudoMudou = true

  if (conteudoMudou) {
    if (motivo.length < 10) {
      throw new Error('Informe o motivo da atualização (mínimo 10 caracteres).')
    }
  } else if (motivo.length < 10 && motivoAnterior.length >= 10) {
    e.record.set('motivo_atualizacao', motivoAnterior)
  }
  e.next()
}, 'fichas_proposta')
