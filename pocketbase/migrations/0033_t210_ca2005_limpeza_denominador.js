migrate(
  (app) => {
    // T2.10 / CA-2-005 — limpeza do denominador real antes de produção.
    // Remove seeds de demonstração (migration 0006) e fixtures de teste
    // remanescentes (T2.01), PRESERVANDO os dados reais da cliente.
    // Idempotente: só remove o que existir e casar com os padrões.
    //
    // Ordem de remoção: interações e permanências que referenciam o negócio
    // (relações obrigatórias da T9.1) → negócio → contatos seed sem vínculos.

    // ---- 1. Oportunidades: seeds demo + fixtures T2.01.
    const seedsNegocios = [
      'Implantação CRM Enterprise - Nexus Tech',
      'Expansão de Módulos Operacionais - Alcantara Engenharia',
      'Consultoria de Automação Comercial - TransBrasil',
      'Plataforma de Relacionamento - Bella Casa',
      'Gestão de Clientes e Honorários - Albuquerque Adv',
    ]
    const padroesFixtureNegocios = ['T201-DELETE', 'GREEN T201', 'Teste humano T2.01']

    let negocios = []
    try {
      negocios = app.findRecordsByFilter('negocios', '', '', 10000, 0)
    } catch (_) {
      negocios = []
    }

    const idsRemover = []
    for (let i = 0; i < negocios.length; i++) {
      const titulo = String(negocios[i].get('titulo') || '')
      let remover = seedsNegocios.indexOf(titulo) !== -1
      if (!remover) {
        for (let j = 0; j < padroesFixtureNegocios.length; j++) {
          if (titulo.indexOf(padroesFixtureNegocios[j]) !== -1) {
            remover = true
            break
          }
        }
      }
      if (remover) idsRemover.push(negocios[i].id)
    }

    // Remover interações que referenciam QUALQUER negócio a remover —
    // iterar todas as interações e checar cada campo contra os ids.
    if (idsRemover.length > 0) {
      let todasInteracoes = []
      try {
        todasInteracoes = app.findRecordsByFilter('interacoes', '', '', 10000, 0)
      } catch (_) {
        todasInteracoes = []
      }
      for (let k = 0; k < todasInteracoes.length; k++) {
        const inter = todasInteracoes[k]
        const exportado = inter.publicExport()
        let referencia = false
        for (const campo in exportado) {
          const valor = exportado[campo]
          if (typeof valor === 'string' && idsRemover.indexOf(valor) !== -1) {
            referencia = true
            break
          }
          if (valor && typeof valor === 'object' && valor.length) {
            for (let m = 0; m < valor.length; m++) {
              if (valor[m] && idsRemover.indexOf(valor[m]) !== -1) {
                referencia = true
                break
              }
            }
          }
          if (referencia) break
        }
        if (referencia) app.delete(inter)
      }

      // Remover permanências vinculadas.
      for (let i = 0; i < idsRemover.length; i++) {
        try {
          const permanencias = app.findRecordsByFilter(
            'permanencias_negocio',
            'negocio = {:n}',
            '',
            100,
            0,
            { n: idsRemover[i] },
          )
          for (let k = 0; k < permanencias.length; k++) app.delete(permanencias[k])
        } catch (_) {}
      }

      // Remover os negócios.
      for (let i = 0; i < idsRemover.length; i++) {
        try {
          const neg = app.findRecordById('negocios', idsRemover[i])
          app.delete(neg)
        } catch (_) {}
      }
    }

    // ---- 2. Contatos: seeds demo (0006) sem negócios vinculados.
    const seedsContatos = [
      'Juliana Vasconcelos',
      'Rodrigo Alcantara',
      'Camila Fernandes',
      'Marcelo Pires de Castro',
      'Fernanda Albuquerque Ribeiro',
      'Eduardo Martins Soares',
    ]

    let contatos = []
    try {
      contatos = app.findRecordsByFilter('clientes', '', '', 10000, 0)
    } catch (_) {
      contatos = []
    }
    for (let i = 0; i < contatos.length; i++) {
      const nome = String(contatos[i].get('nome') || '')
      if (seedsContatos.indexOf(nome) === -1) continue
      const id = contatos[i].id
      let negociosVinculados = []
      try {
        negociosVinculados = app.findRecordsByFilter('negocios', 'cliente = {:c}', '', 10, 0, {
          c: id,
        })
      } catch (_) {
        negociosVinculados = []
      }
      if (negociosVinculados.length === 0) app.delete(contatos[i])
    }

    // ---- 3. Conta de demonstração operador.demo (seed de RBAC, substituída
    // pelo operator@vibratto.com.br real da T9.2).
    try {
      const demo = app.findAuthRecordByEmail('_pb_users_auth_', 'operador.demo@vibratto.com.br')
      app.delete(demo)
    } catch (_) {
      // não existe — ok
    }
  },
  (app) => {
    // Rollback: seeds de demonstração não são restaurados — o denominador
    // real permanece limpo.
  },
)
