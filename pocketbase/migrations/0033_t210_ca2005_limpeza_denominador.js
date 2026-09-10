migrate(
  (app) => {
    // T2.10 / CA-2-005 — limpeza do denominador real antes de produção.
    // Remove seeds de demonstração (migration 0006) e fixtures de teste
    // remanescentes (T2.01), PRESERVANDO os dados reais da cliente.
    // Idempotente: só remove o que existir e casar com os padrões.

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
      if (!remover) continue
      // Remover primeiro as permanências vinculadas (T9.1 protege o negócio
      // via relação obrigatória — o delete do negócio falha sem isso).
      try {
        const permanencias = app.findRecordsByFilter(
          'permanencias_negocio',
          'negocio = {:n}',
          '',
          100,
          0,
          { n: negocios[i].id },
        )
        for (let k = 0; k < permanencias.length; k++) app.delete(permanencias[k])
      } catch (_) {
        // coleção pode não existir em instalação limpa
      }
      app.delete(negocios[i])
    }

    // ---- 2. Contatos: seeds demo (0006). Preserva Maria Rodrigues, ROMEU e
    // qualquer contato criado pela cliente. Contatos com oportunidades reais
    // vinculadas NÃO são seeds — só os da lista conhecida da 0006.
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
      if (seedsContatos.indexOf(nome) !== -1) {
        // Segurança extra: se o contato tem negócio vinculado NÃO-seed, preservar.
        const id = contatos[i].id
        let negociosVinculados = []
        try {
          negociosVinculados = app.findRecordsByFilter('negocios', 'cliente = {:c}', '', 10, 0, {
            c: id,
          })
        } catch (_) {
          negociosVinculados = []
        }
        if (negociosVinculados.length === 0) {
          app.delete(contatos[i])
        }
      }
    }
  },
  (app) => {
    // Rollback: seeds de demonstração não são restaurados — o denominador
    // real permanece limpo.
  },
)
