// T2.26 — CA-2-021: regras server-side da configuração de SLA.
// - admin-only (create/update via createRule/updateRule + validação aqui);
// - vigência coerente: fim > inicio (quando informado); início não pode ser
//   anterior a uma config vigente do MESMO evento+etapa sem sobreposição
//   (histórico anterior permanece intacto — configs passadas não são tocadas);
// - delete bloqueado (append-only de configuração).
// Lições JSVM: lógica inline, datas PB normalizadas " " → "T".
onRecordCreateRequest((e) => {
  const actor = e.auth
  if (!actor || actor.get('role') !== 'admin') {
    throw new Error('Configuração de SLA é exclusiva de administradores.')
  }

  const inicio = String(e.requestInfo().body.inicio_vigencia || '').trim()
  const fim = String(e.requestInfo().body.fim_vigencia || '').trim()

  if (!inicio || inicio.startsWith('0001-01-01')) {
    throw new Error('A configuração de SLA exige data de início da vigência.')
  }
  const inicioMs = Date.parse(inicio.replace(' ', 'T'))
  if (isNaN(inicioMs)) {
    throw new Error('Data de início da vigência inválida.')
  }
  if (fim && !fim.startsWith('0001-01-01')) {
    const fimMs = Date.parse(fim.replace(' ', 'T'))
    if (isNaN(fimMs)) {
      throw new Error('Data de fim da vigência inválida.')
    }
    if (fimMs <= inicioMs) {
      throw new Error('A vigência final deve ser posterior à inicial.')
    }
  }

  const prazo = Number(e.requestInfo().body.prazo_valor)
  if (!Number.isFinite(prazo) || prazo < 1) {
    throw new Error('O prazo do SLA deve ser um número inteiro maior que zero.')
  }

  e.record.set('criado_por', actor.id)
  e.next()
}, 'sla_config')

onRecordUpdateRequest((e) => {
  const actor = e.auth
  if (!actor || actor.get('role') !== 'admin') {
    throw new Error('Configuração de SLA é exclusiva de administradores.')
  }

  // Histórico anterior preservado: config que JÁ VIGIOU não pode ter as datas
  // alteradas (só ativa/desativa a partir de agora).
  const before = e.record.original()
  const fimAntigo = String(before.get('fim_vigencia') || '').trim()
  const fimJaPassou =
    fimAntigo &&
    !fimAntigo.startsWith('0001-01-01') &&
    Date.parse(fimAntigo.replace(' ', 'T')) < Date.now()
  if (fimJaPassou) {
    const inicioAntigo = String(before.get('inicio_vigencia') || '')
    const inicioNovo = String(e.record.get('inicio_vigencia') || '')
    const fimNovo = String(e.record.get('fim_vigencia') || '')
    if (inicioAntigo !== inicioNovo || fimAntigo !== fimNovo) {
      throw new Error(
        'Configuração com vigência encerrada é histórico: não pode ter as datas alteradas.',
      )
    }
  }

  e.next()
}, 'sla_config')

onRecordDeleteRequest((e) => {
  throw new Error('Configuração de SLA não pode ser excluída (histórico preservado).')
}, 'sla_config')
