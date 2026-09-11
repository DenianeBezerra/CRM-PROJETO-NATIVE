migrate(
  (app) => {
    // T2.32 — CA-2-027: handoffs criados ANTES da flag `obrigatorio` (0079)
    // não têm a marcação — o aceite passaria com checklist incompleto.
    // Aqui os itens críticos do checklist existente são marcados como
    // obrigatórios (mesma regra do checklist padrão do hook).
    const obrigatorios = [
      'Contrato assinado e arquivado',
      'Documentos fiscais e societários recebidos',
      'Acessos aos sistemas do cliente (Omie/Conta Azul/Nibo)',
    ]

    const lista = app.findRecordsByFilter('handoffs', '', '', 500, 0)
    for (let i = 0; i < lista.length; i++) {
      const h = lista[i]
      let checklist = []
      try {
        checklist = JSON.parse(String(h.get('checklist') || '[]'))
      } catch (_) {
        checklist = []
      }
      if (!Array.isArray(checklist)) checklist = []

      let mudou = false
      for (let j = 0; j < checklist.length; j++) {
        const it = checklist[j]
        if (
          it &&
          it.obrigatorio === undefined &&
          obrigatorios.indexOf(String(it.item || '')) !== -1
        ) {
          it.obrigatorio = true
          mudou = true
        }
      }
      if (mudou) {
        h.set('checklist', JSON.stringify(checklist))
        app.save(h)
      }
    }
  },
  (app) => {
    // Down: sem reversão de dados (marcação aditiva, idempotente).
  },
)
