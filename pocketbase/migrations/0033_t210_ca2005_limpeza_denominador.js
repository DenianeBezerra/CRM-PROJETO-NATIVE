migrate(
  (app) => {
    // T2.10 / CA-2-005 — limpeza do denominador real antes de produção.
    // Remove seeds de demonstração (migration 0006) e fixtures de teste
    // remanescentes (T2.01), PRESERVANDO os dados reais da cliente.
    //
    // Ordem: interações de seed → permanências → negócios → contatos seed →
    // conta demo. Interações de seed: criadas em lote pela 0006 (mesmo
    // timestamp), referenciam seeds ou têm negócio vazio (caso vraz2xood5xf7sc,
    // que bloqueava o delete com required reference).

    const seedsNegocios = [
      'Implantação CRM Enterprise - Nexus Tech',
      'Expansão de Módulos Operacionais - Alcantara Engenharia',
      'Consultoria de Automação Comercial - TransBrasil',
      'Plataforma de Relacionamento - Bella Casa',
      'Gestão de Clientes e Honorários - Albuquerque Adv',
    ]
    const padroesFixtureNegocios = ['T201-DELETE', 'GREEN T201', 'Teste humano T2.01']
    const seedsContatos = [
      'Juliana Vasconcelos',
      'Rodrigo Alcantara',
      'Camila Fernandes',
      'Marcelo Pires de Castro',
      'Fernanda Albuquerque Ribeiro',
      'Eduardo Martins Soares',
    ]

    // ---- 1. Identificar negócios a remover (seeds + fixtures).
    let negocios = []
    try {
      negocios = app.findRecordsByFilter('negocios', '', '', 10000, 0)
    } catch (_) {
      negocios = []
    }
    const idsRemover = []
    const contatosSeedIds = []
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

    // ---- 2. Interações: remover as que referenciam negócio removido, têm
    // negócio vazio (seed quebrado) ou pertencem a contato seed.
    let todasInteracoes = []
    try {
      todasInteracoes = app.findRecordsByFilter('interacoes', '', '', 10000, 0)
    } catch (_) {
      todasInteracoes = []
    }
    for (let k = 0; k < todasInteracoes.length; k++) {
      const inter = todasInteracoes[k]
      const exportado = inter.publicExport()
      const negocioRef = String(exportado['negocio'] || '')
      const clienteRef = String(exportado['cliente'] || '')
      let remover = negocioRef === '' || idsRemover.indexOf(negocioRef) !== -1
      if (!remover && clienteRef !== '' && contatosSeedIds.indexOf(clienteRef) !== -1) {
        remover = true
      }
      if (remover) app.delete(inter)
    }

    // ---- 3. Permanências vinculadas aos negócios removidos.
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

    // ---- 4. Negócios.
    for (let i = 0; i < idsRemover.length; i++) {
      try {
        app.delete(app.findRecordById('negocios', idsRemover[i]))
      } catch (_) {}
    }

    // ---- 5. Contatos seed sem negócios vinculados.
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
      contatosSeedIds.push(id)
      let vinculados = []
      try {
        vinculados = app.findRecordsByFilter('negocios', 'cliente = {:c}', '', 10, 0, { c: id })
      } catch (_) {
        vinculados = []
      }
      if (vinculados.length === 0) app.delete(contatos[i])
    }

    // ---- 6. Conta de demonstração operador.demo (seed de RBAC antigo).
    try {
      app.delete(app.findAuthRecordByEmail('_pb_users_auth_', 'operador.demo@vibratto.com.br'))
    } catch (_) {}
  },
  (app) => {
    // Rollback: seeds de demonstração não são restaurados — o denominador
    // real permanece limpo.
  },
)
