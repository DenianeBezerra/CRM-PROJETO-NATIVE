migrate(
  (app) => {
    // T2.39 — fixture de prova CORRIGIDA: a migration 0103 falhou em silêncio
    // (negócio dze8910cje2n1di não existe — try/catch engoliu o erro).
    // Esta migration cria server-side (fora dos hooks de request):
    // 1) negócio de prova em 'proposta' com permanência coerente;
    // 2) proposta com valor AUSENTE (0) — impossível criar via API
    //    (regra T2.21 bloqueia valor <= 0), exatamente o cenário CA-2-034.
    // Down: remove proposta e negócio de prova (e permanência).
    const RESP = 'v86kq5x0v4guoym'
    const CLIENTE = '4uozztdfkiwyob7'
    let nid = ''
    try {
      const col = app.findCollectionByNameOrId('negocios')
      const rec = new Record(col)
      rec.set('titulo', 'T239 PROVA proposta sem valor (fixture)')
      rec.set('cliente', CLIENTE)
      rec.set('origem', 'site')
      rec.set('estagio', 'proposta')
      rec.set('status', 'proposta')
      rec.set('responsavel', RESP)
      rec.set('valor', 0)
      rec.set('prioridade', 'baixa')
      rec.set('score', 0)
      rec.set('probabilidade', 0)
      rec.set('proxima_acao_descricao', 'prova T239')
      rec.set('proxima_acao_em', '2026-12-31 00:00:00.000Z')
      app.save(rec)
      nid = rec.id
    } catch (err) {
      console.log('T239 falha ao criar negocio fixture: ' + String(err))
    }
    if (nid !== '') {
      try {
        const pcol = app.findCollectionByNameOrId('permanencias_negocio')
        const perm = new Record(pcol)
        perm.set('negocio', nid)
        perm.set('etapa', 'proposta')
        perm.set('entrou_em', new Date().toISOString().replace('T', ' '))
        app.save(perm)
      } catch (err) {
        console.log('T239 falha ao criar permanencia fixture: ' + String(err))
      }
      try {
        const colp = app.findCollectionByNameOrId('propostas')
        const prop = new Record(colp)
        prop.set('negocio', nid)
        prop.set('responsavel', RESP)
        prop.set('versao', 1)
        prop.set('valor', 0)
        prop.set('resumo', 'Prova T2.39 proposta sem valor informado')
        prop.set('validade', '2026-10-20 00:00:00.000Z')
        prop.set('status', 'rascunho')
        prop.set('criado_por', RESP)
        app.save(prop)
      } catch (err) {
        console.log('T239 falha ao criar proposta fixture: ' + String(err))
      }
    }
  },
  (app) => {
    // Down: localizar negócio de prova pelo título e remover proposta,
    // permanência e negócio.
    try {
      const ns = app.findRecordsByFilter(
        'negocios',
        "titulo = 'T239 PROVA proposta sem valor (fixture)'",
        '',
        10,
        0,
      )
      for (let i = 0; i < ns.length; i++) {
        const nid = ns[i].id
        try {
          const ps = app.findRecordsByFilter('propostas', 'negocio = {:n}', '', 10, 0, {
            n: nid,
          })
          for (let j = 0; j < ps.length; j++) app.delete(ps[j])
        } catch (_) {}
        try {
          const perms = app.findRecordsByFilter(
            'permanencias_negocio',
            'negocio = {:n}',
            '',
            10,
            0,
            {
              n: nid,
            },
          )
          for (let j = 0; j < perms.length; j++) app.delete(perms[j])
        } catch (_) {}
        app.delete(ns[i])
      }
    } catch (_) {}
    // Limpa também o resíduo da tentativa via API (negócio com permanência órfã)
    try {
      const orfaos = app.findRecordsByFilter(
        'negocios',
        "titulo = 'T239 PROVA proposta sem valor'",
        '',
        10,
        0,
      )
      for (let i = 0; i < orfaos.length; i++) {
        const nid = orfaos[i].id
        try {
          const perms = app.findRecordsByFilter(
            'permanencias_negocio',
            'negocio = {:n}',
            '',
            10,
            0,
            {
              n: nid,
            },
          )
          for (let j = 0; j < perms.length; j++) app.delete(perms[j])
        } catch (_) {}
        app.delete(orfaos[i])
      }
    } catch (_) {}
  },
)
