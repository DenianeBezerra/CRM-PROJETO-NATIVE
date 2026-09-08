// Protege o aceite operacional: usuário, finalidade, versão, data e filtros são controlados.
onRecordCreateRequest((e) => {
  const actor = e.auth
  const exportPurpose = 'Uso interno na gestão comercial.'
  if (!actor) throw new Error('Autenticação necessária para registrar o aceite.')

  const requestedUser = e.record.get('usuario')
  if (requestedUser !== actor.id) throw new Error('O aceite deve pertencer ao usuário autenticado.')
  if (e.record.get('finalidade') !== exportPurpose)
    throw new Error('Finalidade de exportação inválida.')
  if (e.record.get('versao_termo') !== 'v1') throw new Error('Versão do termo inválida.')

  const quantity = Number(e.record.get('quantidade'))
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error('Quantidade inválida.')

  const entity = e.record.get('entidade')
  if (entity !== 'clientes' && entity !== 'negocios') throw new Error('Entidade inválida.')

  let filters
  try {
    filters = JSON.parse(String(e.record.get('filtros') || '{}'))
  } catch {
    throw new Error('Filtros inválidos.')
  }
  if (!filters || typeof filters !== 'object' || Array.isArray(filters))
    throw new Error('Filtros inválidos.')
  for (const key of Object.keys(filters)) {
    if (!['q', 'entity', 'status', 'stage'].includes(key)) throw new Error('Filtro não permitido.')
    if (typeof filters[key] !== 'string') throw new Error('Valor de filtro inválido.')
  }
  e.next()
}, 'aceites_exportacao')

onRecordUpdateRequest((e) => {
  throw new Error('Aceites de exportação são imutáveis.')
}, 'aceites_exportacao')

onRecordDeleteRequest((e) => {
  throw new Error('Aceites de exportação não podem ser excluídos.')
}, 'aceites_exportacao')
