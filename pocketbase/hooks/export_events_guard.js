// T2.03/CA-2-038: eventos de exportação (cancelado/negado/falha) são append-only.
// Server-side: valida ator, entidade, evento, quantidade e motivo; bloqueia update/delete.

onRecordCreateRequest((e) => {
  const actor = e.auth
  if (!actor) throw new Error('Autenticação necessária para registrar o evento.')

  const requestedUser = e.record.get('usuario')
  if (requestedUser !== actor.id) throw new Error('O evento deve pertencer ao usuário autenticado.')

  const entity = e.record.get('entidade')
  if (entity !== 'clientes' && entity !== 'negocios') throw new Error('Entidade inválida.')

  const evento = e.record.get('evento')
  if (evento !== 'cancelado' && evento !== 'negado' && evento !== 'falha')
    throw new Error('Evento inválido.')

  const quantity = Number(e.record.get('quantidade') ?? 0)
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error('Quantidade inválida.')

  const motivo = String(e.record.get('motivo') || '')
  if (evento === 'falha' && !motivo.trim()) throw new Error('Falha de exportação exige motivo.')

  if (!e.record.get('ocorrido_em')) throw new Error('Data do evento é obrigatória.')

  e.next()
}, 'eventos_exportacao')

onRecordUpdateRequest((e) => {
  throw new Error('Eventos de exportação são imutáveis.')
}, 'eventos_exportacao')

onRecordDeleteRequest((e) => {
  throw new Error('Eventos de exportação não podem ser excluídos.')
}, 'eventos_exportacao')
