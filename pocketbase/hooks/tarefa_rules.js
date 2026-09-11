// T2.27 — CA-2-022: regras server-side das tarefas vinculadas.
// - criação: título ≥ 3, responsável existente e ativo, prioridade válida,
//   prazo (quando informado) futuro, negócio existente, status nasce 'aberta';
// - conclusão: exige resultado obrigatório (≥ 10 chars) e grava concluida_em/por;
// - tarefa concluída não volta para aberta nem muda conteúdo;
// - delete bloqueado (histórico operacional preservado).
// Lições JSVM: datas PB normalizadas " " → "T", lógica inline nos callbacks.
onRecordCreateRequest((e) => {
  const titulo = String(e.requestInfo().body.titulo || '').trim()
  if (titulo.length < 3) {
    throw new Error('A tarefa exige um título com pelo menos 3 caracteres.')
  }

  const prioridade = String(e.requestInfo().body.prioridade || '').trim()
  if (['baixa', 'media', 'alta'].indexOf(prioridade) < 0) {
    throw new Error('Prioridade inválida: use baixa, media ou alta.')
  }

  const responsavel = String(e.requestInfo().body.responsavel || '').trim()
  if (!responsavel) {
    throw new Error('A tarefa exige um responsável (atribuição).')
  }
  try {
    const resp = $app.findRecordById('_pb_users_auth_', responsavel)
    if (resp.get('active') === false) {
      throw new Error('O responsável informado está inativo.')
    }
  } catch (err) {
    if (String(err).indexOf('inativo') >= 0) throw err
    throw new Error('Responsável não encontrado.')
  }

  const prazo = String(e.requestInfo().body.prazo || '').trim()
  if (prazo && !prazo.startsWith('0001-01-01')) {
    const ms = Date.parse(prazo.replace(' ', 'T'))
    if (isNaN(ms) || ms < Date.now() - 60 * 1000) {
      throw new Error('O prazo da tarefa deve ser uma data futura.')
    }
  }

  const negocioId = String(e.requestInfo().body.negocio || '').trim()
  try {
    $app.findRecordById('negocios', negocioId)
  } catch (_) {
    throw new Error('Oportunidade da tarefa não encontrada.')
  }

  e.record.set('titulo', titulo)
  e.record.set('prioridade', prioridade)
  e.record.set('status', 'aberta')
  if (prazo) e.record.set('prazo', prazo.replace('T', ' '))
  if (!e.record.get('criado_por')) {
    e.record.set('criado_por', e.auth ? e.auth.id : '')
  }
  e.next()
}, 'tarefas')

onRecordUpdateRequest((e) => {
  const antes = String(e.record.original().get('status') || '')
  const depois = String(e.record.get('status') || '')

  if (antes === 'concluida') {
    // Tarefa concluída é imutável: histórico operacional preservado.
    const campos = [
      'titulo',
      'descricao',
      'responsavel',
      'prioridade',
      'prazo',
      'status',
      'resultado',
    ]
    for (let i = 0; i < campos.length; i++) {
      const campo = campos[i]
      if (String(e.record.original().get(campo)) !== String(e.record.get(campo))) {
        throw new Error('Tarefa concluída é imutável.')
      }
    }
    e.next()
    return
  }

  // Transição aberta → concluida exige resultado obrigatório.
  if (antes === 'aberta' && depois === 'concluida') {
    const resultado = String(e.record.get('resultado') || '').trim()
    if (resultado.length < 10) {
      throw new Error(
        'Concluir a tarefa exige o resultado: descreva o que foi feito (mínimo 10 caracteres).',
      )
    }
    e.record.set('resultado', resultado)
    e.record.set('concluida_em', new Date().toISOString().replace('T', ' '))
    if (e.auth) e.record.set('concluida_por', e.auth.id)
    e.next()
    return
  }

  // Edição de tarefa aberta: revalida campos alteráveis.
  const prioridade = String(e.record.get('prioridade') || '').trim()
  if (['baixa', 'media', 'alta'].indexOf(prioridade) < 0) {
    throw new Error('Prioridade inválida: use baixa, media ou alta.')
  }
  if (depois !== 'aberta') {
    throw new Error('Status inválido: a tarefa só pode ficar aberta ou concluída.')
  }
  e.next()
}, 'tarefas')

onRecordDeleteRequest((e) => {
  throw new Error('Tarefa não pode ser excluída (histórico operacional preservado).')
}, 'tarefas')
