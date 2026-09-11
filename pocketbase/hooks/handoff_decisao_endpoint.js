// T2.33 — CA-2-028: decisão do receptor sobre o handoff (aceitar ou devolver).
// Evolui o fluxo da T2.32: toda decisão (aceite ou devolução) registra ator,
// data, motivo (na devolução) e SNAPSHOT do checklist + pendências no momento
// da decisão. Regras:
// - decisão só sobre handoff em 'pendente' (idempotente por estado);
// - aceitar: mesmas regras da T2.32 (item obrigatório pendente bloqueia e
//   gera pendência com dono/prazo);
// - devolver: exige motivo (≥ 10 caracteres); status vira 'devolvido';
// - snapshot_decisao: JSON com checklist, pendências, acao, ator e data;
// - 401 sem autenticação.
// Lições JSVM: campo JSON lido com JSON.parse(String(raw)) (AP-2026-09-12-t232);
// datas PB " " → "T"; lógica inline.
routerAdd(
  'POST',
  '/backend/v1/handoffs/{id}/decisao',
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
        error: 'Decisão só vale para handoff em pendente (status atual: ' + status + ').',
      })
    }

    const body = e.requestInfo().body
    const acao = String(body.acao || '').trim()
    if (acao !== 'aceitar' && acao !== 'devolver') {
      return e.json(400, { error: 'Informe a ação: "aceitar" ou "devolver".' })
    }

    // ---- Snapshot do estado no momento da decisão ----
    let checklist = []
    try {
      const raw = handoff.get('checklist')
      checklist = JSON.parse(typeof raw === 'string' ? raw : String(raw))
    } catch (_) {
      checklist = []
    }
    if (!Array.isArray(checklist)) checklist = []

    let pendencias = null
    try {
      const rawP = handoff.get('pendencias')
      const pStr = typeof rawP === 'string' ? rawP : rawP ? String(rawP) : ''
      if (pStr && pStr !== 'null') pendencias = JSON.parse(pStr)
    } catch (_) {
      pendencias = null
    }

    const agoraISO = new Date().toISOString()

    // ---- DEVOLVER (CA-2-028) ----
    if (acao === 'devolver') {
      const motivo = String(body.motivo || '').trim()
      if (motivo.length < 10) {
        return e.json(400, {
          error:
            'Devolução exige o motivo: descreva por que o handoff volta ao emissor (mínimo 10 caracteres).',
        })
      }

      const snapshot = {
        acao: 'devolver',
        ator: actor.id,
        data: agoraISO,
        motivo: motivo,
        checklist: checklist,
        pendencias: pendencias,
      }

      handoff.set('status', 'devolvido')
      handoff.set('devolvido_por', actor.id)
      handoff.set('devolvido_em', agoraISO.replace('T', ' '))
      handoff.set('motivo_devolucao', motivo)
      handoff.set('snapshot_decisao', JSON.stringify(snapshot))
      try {
        $app.save(handoff)
      } catch (err) {
        return e.json(400, { error: 'Falha ao registrar devolução: ' + String(err) })
      }
      $app.logger().info('T233 handoff devolvido', 'handoff', id, 'ator', actor.id)
      return e.json(200, {
        ok: true,
        status: 'devolvido',
        devolvido_por: actor.id,
        devolvido_em: handoff.get('devolvido_em'),
        motivo: motivo,
        snapshot_itens: checklist.length,
      })
    }

    // ---- ACEITAR (regras T2.32 + snapshot) ----
    const obrigatoriosPendentes = []
    for (let i = 0; i < checklist.length; i++) {
      const it = checklist[i]
      if (it && it.obrigatorio === true && it.feito !== true) {
        obrigatoriosPendentes.push(String(it.item || 'item ' + (i + 1)))
      }
    }

    if (obrigatoriosPendentes.length > 0) {
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

      // Idempotência: pendência existente é preservada.
      if (pendencias && pendencias.itens && pendencias.itens.length > 0) {
        return e.json(400, {
          error:
            'Aceite bloqueado: ' +
            obrigatoriosPendentes.length +
            ' item(ns) obrigatório(s) pendente(s). Pendência já registrada (preservada).',
          itens_pendentes: obrigatoriosPendentes,
          pendencia: {
            dono: pendencias.itens[0].dono,
            prazo: pendencias.itens[0].prazo,
          },
        })
      }

      const pendenciasNovas = {
        geradas_em: agoraISO,
        gerada_por: actor.id,
        itens: obrigatoriosPendentes.map(function (item) {
          return {
            item: item,
            dono: dono,
            prazo: prazo,
            criado_em: agoraISO,
            resolvida_em: '',
          }
        }),
      }
      handoff.set('pendencias', JSON.stringify(pendenciasNovas))
      try {
        $app.save(handoff)
      } catch (err) {
        return e.json(400, { error: 'Falha ao registrar pendência: ' + String(err) })
      }
      $app.logger().info('T233 aceite bloqueado com pendencia', 'handoff', id, 'ator', actor.id)
      return e.json(400, {
        error:
          'Aceite bloqueado: ' +
          obrigatoriosPendentes.length +
          ' item(ns) obrigatório(s) pendente(s). Pendência registrada com dono e prazo.',
        itens_pendentes: obrigatoriosPendentes,
        pendencia: { dono: dono, prazo: prazo },
      })
    }

    // Checklist completo → aceite com snapshot.
    const snapshot = {
      acao: 'aceitar',
      ator: actor.id,
      data: agoraISO,
      checklist: checklist,
      pendencias: pendencias,
    }
    handoff.set('status', 'aceito')
    handoff.set('aceito_por', actor.id)
    handoff.set('aceito_em', agoraISO.replace('T', ' '))
    handoff.set('snapshot_decisao', JSON.stringify(snapshot))
    try {
      $app.save(handoff)
    } catch (err) {
      return e.json(400, { error: 'Falha ao registrar aceite: ' + String(err) })
    }
    $app.logger().info('T233 handoff aceito', 'handoff', id, 'ator', actor.id)
    return e.json(200, {
      ok: true,
      status: 'aceito',
      aceito_por: actor.id,
      aceito_em: handoff.get('aceito_em'),
      snapshot_itens: checklist.length,
    })
  },
  $apis.requireAuth(),
)
