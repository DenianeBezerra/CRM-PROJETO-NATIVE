migrate(
  (app) => {
    // T2.30 — limpeza complementar da fixture probe (a 0074 usou
    // findAuthRecordByEmail com catch vazio — se falhou silenciosamente,
    // a fixture ficou). Busca por filtro, sem engolir erro.
    const probes = app.findRecordsByFilter('users', "email ~ 'probe.t230'", '', 10, 0)
    for (let i = 0; i < probes.length; i++) app.delete(probes[i])
  },
  (app) => {
    // Down: irreversível por design (limpeza).
  },
)
