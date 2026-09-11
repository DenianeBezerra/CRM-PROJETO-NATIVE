// T2.32 — CA-2-027: aceite do handoff bloqueado por item obrigatório ausente.
// Endpoint server-side (admin e operator autenticados; decisão humana fica
// registrada com ator e data). Regras:
// - só handoff em 'pendente' pode ser aceito (aceite/devolução idempotentes
//   por estado — re-save não reprocessa);
// - item obrigatório do checklist com feito=false IMPIDE o aceite: gera
//   pendências com dono (receptor por padrão) e prazo (futuro, obrigatório);
// - checklist completo → status 'aceito' com ator e data server-side;
// - 401 sem autenticação (rota protegida).
// Lições JSVM: lógica inline, datas PB " " → "T", runInTransaction para
// atomicidade (sem e.next() dentro).
routerAdd(
  'POST',
  '/backend/v1/handoffs/{id}/aceite',
  (e) => {
    const actor = e.auth
    if (!actor) {
      return e.json(401, { error: 'Autenticação obrigatória.' })
    }

    const id = e.request.pathValue('id')
    let handoff
    try {
      handoff = $app.findRecordById('handoffs', id)
    } catch (_) {
      return e.json(404, { error: 'Handoff não encontrado.' })
    }

    const status = String(handoff.get('status') || '')
    if (status !== 'pendente') {
      return e.json(400, {
        error: 'Somente handoff em pendente pode ser aceito (status atual: ' + status + ').',
      })
    }

    const body = e.requestInfo().body
    let checklist = []
    try {
      // Lição T2.32: campo JSON do JSVM chega como ARRAY DE CHAR CODES
      // ([91,123,34,...] = '[{"...'). String(raw) reconstrói a string correta;
      // iterar o valor direto retorna lixo (1 item por char code).
      const raw = handoff.get('checklist')
      const rawStr = typeof raw === 'string' ? raw : String(raw)
      checklist = JSON.parse(rawStr)
    } catch (_) {
      checklist = []
    }
    if (!Array.isArray(checklist)) checklist = []

    // Itens obrigatórios pendentes bloqueiam o aceite.
    const obrigatoriosPendentes = []
    for (let i = 0; i < checklist.length; i++) {
      const it = checklist[i]
      if (it && it.obrigatorio === true && it.feito !== true) {
        obrigatoriosPendentes.push(String(it.item || 'item ' + (i + 1)))
      }
    }

    if (obrigatoriosPendentes.length > 0) {
      // CA-2-027: gera pendências com dono e prazo.
      const dono = String(body.dono_pendencia || handoff.get('responsavel_receptor') || actor.id)
      const prazo = String(body.prazo_pendencia || '').trim()
      let prazoOk = false
      if (prazo && !prazo.startsWith('0001-01-01')) {
        const ms = Date.parse(prazo.replace(' ', 'T'))
        if (!isNaN(ms) && ms >= Date.now() - 60 * 1000) prazoOk = true
      }
      if (!prazoOk) {
        return e.json(400, {
          error:
            'Aceite bloqueado: ' +
            obrigatoriosPendentes.length +
            ' item(ns) obrigatório(s) pendente(s). Informe o prazo da pendência (data futura) para registrá-la.',
          itens_pendentes: obrigatoriosPendentes,
        })
      }

      const agora = new Date().toISOString()
      // Idempotência: se já existem pendências registradas, preserva a
      // primeira (não sobrescreve dono/prazo já acordados).
      let pendenciasExistentes = null
      try {
        const rawP = handoff.get('pendencias')
        const pStr = typeof rawP === 'string' ? rawP : rawP ? String(rawP) : ''
        if (pStr && pStr !== 'null') pendenciasExistentes = JSON.parse(pStr)
      } catch (_) {
        pendenciasExistentes = null
      }
      if (
        pendenciasExistentes &&
        pendenciasExistentes.itens &&
        pendenciasExistentes.itens.length > 0
      ) {
        return e.json(400, {
          error:
            'Aceite bloqueado: ' +
            obrigatoriosPendentes.length +
            ' item(ns) obrigatório(s) pendente(s). Pendência já registrada (preservada).',
          itens_pendentes: obrigatoriosPendentes,
          pendencia: {
            dono: pendenciasExistentes.itens[0].dono,
            prazo: pendenciasExistentes.itens[0].prazo,
          },
        })
      }
      const pendencias = {
        geradas_em: agora,
        gerada_por: actor.id,
        itens: obrigatoriosPendentes.map(function (item) {
          return {
            item: item,
            dono: dono,
            prazo: prazo,
            criado_em: agora,
            resolvida_em: '',
          }
        }),
      }

      handoff.set('pendencias', JSON.stringify(pendencias))
      try {
        $app.save(handoff)
      } catch (err) {
        return e.json(400, { error: 'Falha ao registrar pendência: ' + String(err) })
      }
      $app
        .logger()
        .info(
          'T232 aceite bloqueado com pendencia',
          'handoff',
          id,
          'ator',
          actor.id,
          'itens',
          obrigatoriosPendentes.length,
        )
      return e.json(400, {
        error:
          'Aceite bloqueado: ' +
          obrigatoriosPendentes.length +
          ' item(ns) obrigatório(s) pendente(s). Pendência registrada com dono e prazo.',
        itens_pendentes: obrigatoriosPendentes,
        pendencia: { dono: dono, prazo: prazo },
      })
    }

    // Checklist completo → aceite.
    handoff.set('status', 'aceito')
    handoff.set('aceito_por', actor.id)
    handoff.set('aceito_em', new Date().toISOString().replace('T', ' '))
    try {
      $app.save(handoff)
    } catch (err) {
      return e.json(400, { error: 'Falha ao registrar aceite: ' + String(err) })
    }
    $app.logger().info('T232 handoff aceito', 'handoff', id, 'ator', actor.id)
    return e.json(200, {
      ok: true,
      status: 'aceito',
      aceito_por: actor.id,
      aceito_em: handoff.get('aceito_em'),
    })
  },
  $apis.requireAuth(),
)
