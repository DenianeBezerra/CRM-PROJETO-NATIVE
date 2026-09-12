// T3.02b — regra server-side: motivo_atualizacao obrigatório (mín. 10 chars)
// em create e update de fichas_proposta (padrão do diagnóstico T2.17).
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
  // Idempotência: PATCH que não altera conteúdo (ex.: só leitura/reload) não reexige.
  if (motivo.length < 10 && motivoAnterior.length >= 10) {
    e.record.set('motivo_atualizacao', motivoAnterior)
  } else if (motivo.length < 10) {
    throw new Error('Informe o motivo da atualização (mínimo 10 caracteres).')
  }
  e.next()
}, 'fichas_proposta')
