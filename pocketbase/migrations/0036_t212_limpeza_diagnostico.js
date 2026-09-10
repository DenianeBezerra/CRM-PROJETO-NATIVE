migrate(
  (app) => {
    // T2.12 — limpeza do registro órfão de diagnóstico (criado com hook
    // desativado em v0.0.171; delete por API é bloqueado por deleteRule=null).
    // Idempotente: só remove se for o fixture de diagnóstico conhecido.
    const alvo = 'zj34unayfozvslm'
    try {
      const rec = app.findRecordById('respostas_qualificacao', alvo)
      if (String(rec.get('resposta_numero')) === '50000') {
        app.delete(rec)
      }
    } catch (_) {
      // já removido — idempotente
    }
  },
  (app) => {
    // Rollback: sem ação (registro de diagnóstico não deve voltar).
  },
)
