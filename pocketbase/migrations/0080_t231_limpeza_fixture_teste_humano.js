migrate(
  (app) => {
    // T2.31 — limpeza da fixture de teste humano "Fixture T231 ganho v2".
    // Delete via API é bloqueado por relação obrigatória (permanências);
    // aqui removemos as permanências primeiro e depois a oportunidade fixture.
    const FIX = 'vx4wp69l374ef6y'

    let perms = []
    try {
      perms = app.findRecordsByFilter('permanencias_negocio', 'negocio = "' + FIX + '"', '', 500, 0)
    } catch (_) {
      perms = []
    }
    for (let i = 0; i < perms.length; i++) {
      app.delete(perms[i])
    }

    try {
      const fix = app.findRecordById('negocios', FIX)
      app.delete(fix)
    } catch (_) {
      // já removida — idempotente
    }
  },
  (app) => {
    // Down: sem reversão de dados (fixture de teste).
  },
)
