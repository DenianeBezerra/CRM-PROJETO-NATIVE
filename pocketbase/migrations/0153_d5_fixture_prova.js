// T3.07/D5 — fixture de prova do cron de retenção (removida em 0154).
// Cria lead 'novo' com created retroativo (2024-08-01, 25 meses atrás) para
// provar que o cron de retenção o elimina; lead de controle recente fica.
// Lição T3.02: autodate created não é editável via save normal — usar SQL.
migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('leads_entrada')
    var antigo = new Record(col)
    antigo.set('token', 'prova-d5-antigo-0001')
    antigo.set('nome', 'Prova D5 Antigo')
    antigo.set('email', 'prova-d5-antigo@test.local')
    antigo.set('whatsapp', '11999999999')
    antigo.set('dor_principal', 'outro')
    antigo.set('score', 0)
    antigo.set('temperatura', 'frio')
    antigo.set('status', 'novo')
    antigo.set('trilha', '[]')
    antigo.set('consentimento_lgpd', true)
    antigo.set('consentimento_versao', 'LGPD-V1-2026-09')
    antigo.set('optin_marketing', false)
    app.save(antigo)
    var recs = app.findRecordsByFilter('leads_entrada', "token = 'prova-d5-antigo-0001'", '', 1, 0)
    if (recs.length) {
      app
        .db()
        .newQuery(
          "UPDATE leads_entrada SET created = '2024-08-01 10:00:00.000Z' WHERE token = 'prova-d5-antigo-0001'",
        )
        .execute()
    }
  },
  (app) => {},
)
