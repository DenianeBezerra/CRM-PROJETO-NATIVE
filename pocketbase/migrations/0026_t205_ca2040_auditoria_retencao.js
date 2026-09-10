migrate(
  (app) => {
    // T2.05 / CA-2-040 — política de retenção da auditoria: campo retido_ate.
    // Sem IDs de ambiente: a coleção é localizada por nome, o campo é criado
    // se ausente e o backfill usa o valor de cada evento (ocorrido_em + 365d).
    const audit = app.findCollectionByNameOrId('auditoria')

    if (!audit.fields.getByName('retido_ate')) {
      audit.fields.add(
        new Field({
          type: 'date',
          name: 'retido_ate',
        }),
      )
      app.save(audit)
    }

    // Backfill idempotente: eventos sem retenção recebem ocorrido_em + 365 dias.
    const eventos = app.findRecordsByFilter('auditoria', 'retido_ate = ""', '', 10000, 0)
    const DIA = 86400000
    for (let i = 0; i < eventos.length; i++) {
      const ev = eventos[i]
      const base = Date.parse(String(ev.get('ocorrido_em')))
      if (isNaN(base)) continue
      const limite = new Date(base + 365 * DIA)
      const iso = limite.toISOString()
      ev.set('retido_ate', iso.substring(0, iso.length - 1))
      app.save(ev)
    }

    // T2.05 / CA-2-040 — leitura da auditoria respeita papel:
    // admin vê tudo (com snapshots); operator só vê os PRÓPRIOS atos
    // (ator_id = auth.id), sem acesso a snapshots de terceiros.
    // Regras na coleção — sem dependência de IDs de ambiente.
    audit.listRule =
      "@request.auth.role = 'admin' || (@request.auth.id != '' && ator_id = @request.auth.id)"
    audit.viewRule =
      "@request.auth.role = 'admin' || (@request.auth.id != '' && ator_id = @request.auth.id)"
    app.save(audit)
  },
  (app) => {
    // Rollback: remove o campo e restaura a regra de leitura anterior
    // (qualquer autenticado lê tudo).
    const audit = app.findCollectionByNameOrId('auditoria')
    const field = audit.fields.getByName('retido_ate')
    if (field) {
      audit.fields.removeByName('retido_ate')
    }
    audit.listRule = "@request.auth.id != ''"
    audit.viewRule = "@request.auth.id != ''"
    app.save(audit)
  },
)
