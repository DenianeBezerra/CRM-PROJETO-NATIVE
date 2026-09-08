migrate(
  (app) => {
    let adminUserId = null
    try {
      const adminUser = app.findAuthRecordByEmail('_pb_users_auth_', 'deniane@vibratto.com.br')
      adminUserId = adminUser.id
    } catch (_) {
      // fallback if user not found
    }

    const clientesCol = app.findCollectionByNameOrId('clientes')
    const negociosCol = app.findCollectionByNameOrId('negocios')
    const interacoesCol = app.findCollectionByNameOrId('interacoes')

    // 1. Clientes realistas brasileiros
    const seedClientes = [
      {
        nome: 'Juliana Vasconcelos',
        empresa: 'Nexus Tecnologia & Cloud',
        email: 'juliana.vasconcelos@nexustech.com.br',
        telefone: '(11) 98765-4321',
        cidade: 'São Paulo',
        origem: 'site',
        status: 'ativo',
        observacoes: 'Diretora de Operações. Contrato enterprise em renovação.',
      },
      {
        nome: 'Rodrigo Alcantara',
        empresa: 'Alcantara Engenharia & Obras',
        email: 'rodrigo@alcantaraeng.com.br',
        telefone: '(31) 99123-5544',
        cidade: 'Belo Horizonte',
        origem: 'indicacao',
        status: 'ativo',
        observacoes: 'Cliente há 2 anos, interessado em módulo de gestão de compras.',
      },
      {
        nome: 'Camila Fernandes',
        empresa: 'Bella Casa Interiores',
        email: 'camila.fernandes@bellacasa.design',
        telefone: '(41) 98845-1234',
        cidade: 'Curitiba',
        origem: 'redes_sociais',
        status: 'prospect',
        observacoes: 'Lead vindo de campanha do LinkedIn, reunião inicial agendada.',
      },
      {
        nome: 'Marcelo Pires de Castro',
        empresa: 'Logística TransBrasil Express',
        email: 'mpires@transbrasilexpress.com.br',
        telefone: '(19) 97112-9988',
        cidade: 'Campinas',
        origem: 'evento',
        status: 'prospect',
        observacoes: 'Conhecido no Fórum de Logística 2026. Proposta enviada.',
      },
      {
        nome: 'Fernanda Albuquerque Ribeiro',
        empresa: 'Albuquerque Advogados Associados',
        email: 'fernanda@albuquerqueadv.com.br',
        telefone: '(21) 98456-7890',
        cidade: 'Rio de Janeiro',
        origem: 'indicacao',
        status: 'ativo',
        observacoes: 'Banca jurídica corporativa com 40 sócios.',
      },
      {
        nome: 'Eduardo Martins Soares',
        empresa: 'Inovare Soluções Financeiras',
        email: 'eduardo.martins@inovarefin.com.br',
        telefone: '(51) 99344-7766',
        cidade: 'Porto Alegre',
        origem: 'site',
        status: 'prospect',
        observacoes: 'Buscando plataforma de CRM e automação de funil comercial.',
      },
    ]

    const clienteRecords = {}
    for (const data of seedClientes) {
      let record
      try {
        record = app.findFirstRecordByData('clientes', 'email', data.email)
      } catch (_) {
        record = new Record(clientesCol)
        record.set('nome', data.nome)
        record.set('empresa', data.empresa)
        record.set('email', data.email)
        record.set('telefone', data.telefone)
        record.set('cidade', data.cidade)
        record.set('origem', data.origem)
        record.set('status', data.status)
        record.set('observacoes', data.observacoes)
        app.save(record)
      }
      clienteRecords[data.email] = record
    }

    // 2. Negócios em estágios variados
    const seedNegocios = [
      {
        titulo: 'Implantação CRM Enterprise - Nexus Tech',
        clienteEmail: 'juliana.vasconcelos@nexustech.com.br',
        valor: 145000,
        estagio: 'fechado_ganho',
        probabilidade: 100,
        data_fechamento_previsto: '2026-09-30 18:00:00.000Z',
        observacoes: 'Contrato anual com 50 licenças e treinamento dedicado.',
      },
      {
        titulo: 'Expansão de Módulos Operacionais - Alcantara Engenharia',
        clienteEmail: 'rodrigo@alcantaraeng.com.br',
        valor: 68000,
        estagio: 'proposta',
        probabilidade: 75,
        data_fechamento_previsto: '2026-10-15 18:00:00.000Z',
        observacoes: 'Proposta comercial enviada, validação técnica com equipe de TI.',
      },
      {
        titulo: 'Consultoria de Automação Comercial - TransBrasil',
        clienteEmail: 'mpires@transbrasilexpress.com.br',
        valor: 92000,
        estagio: 'contato_feito',
        probabilidade: 50,
        data_fechamento_previsto: '2026-11-20 18:00:00.000Z',
        observacoes: 'Briefing realizado com diretoria comercial.',
      },
      {
        titulo: 'Plataforma de Relacionamento - Bella Casa',
        clienteEmail: 'camila.fernandes@bellacasa.design',
        valor: 34000,
        estagio: 'novo',
        probabilidade: 30,
        data_fechamento_previsto: '2026-12-05 18:00:00.000Z',
        observacoes: 'Qualificação inicial de lead e levantamento de necessidades.',
      },
      {
        titulo: 'Gestão de Clientes e Honorários - Albuquerque Adv',
        clienteEmail: 'fernanda@albuquerqueadv.com.br',
        valor: 85000,
        estagio: 'fechado_ganho',
        probabilidade: 100,
        data_fechamento_previsto: '2026-08-31 18:00:00.000Z',
        observacoes: 'Implantação em andamento pela equipe de CS.',
      },
    ]

    const negocioRecords = {}
    for (const data of seedNegocios) {
      const clienteRecord = clienteRecords[data.clienteEmail]
      if (!clienteRecord) continue

      let record
      try {
        record = app.findFirstRecordByData('negocios', 'titulo', data.titulo)
      } catch (_) {
        record = new Record(negociosCol)
        record.set('titulo', data.titulo)
        record.set('cliente', clienteRecord.id)
        record.set('valor', data.valor)
        record.set('estagio', data.estagio)
        record.set('probabilidade', data.probabilidade)
        record.set('data_fechamento_previsto', data.data_fechamento_previsto)
        record.set('observacoes', data.observacoes)
        if (adminUserId) {
          record.set('criado_por', adminUserId)
        }
        app.save(record)
      }
      negocioRecords[data.titulo] = record
    }

    // 3. Interações
    const seedInteracoes = [
      {
        clienteEmail: 'juliana.vasconcelos@nexustech.com.br',
        negocioTitulo: 'Implantação CRM Enterprise - Nexus Tech',
        tipo: 'reuniao',
        resumo: 'Alinhamento executivo do kickoff de implantação com os líderes de equipe.',
        data: '2026-09-02 14:00:00.000Z',
      },
      {
        clienteEmail: 'rodrigo@alcantaraeng.com.br',
        negocioTitulo: 'Expansão de Módulos Operacionais - Alcantara Engenharia',
        tipo: 'whatsapp',
        resumo: 'Confirmado recebimento da proposta comercial com detalhamento de escopo.',
        data: '2026-09-04 11:30:00.000Z',
      },
      {
        clienteEmail: 'mpires@transbrasilexpress.com.br',
        negocioTitulo: 'Consultoria de Automação Comercial - TransBrasil',
        tipo: 'ligacao',
        resumo: 'Ligação de acompanhamento para esclarecer dúvidas sobre prazos de entrega.',
        data: '2026-09-05 16:00:00.000Z',
      },
      {
        clienteEmail: 'camila.fernandes@bellacasa.design',
        negocioTitulo: 'Plataforma de Relacionamento - Bella Casa',
        tipo: 'email',
        resumo:
          'Envio de material institucional e cases de sucesso do setor de arquitetura/design.',
        data: '2026-09-06 09:15:00.000Z',
      },
      {
        clienteEmail: 'fernanda@albuquerqueadv.com.br',
        negocioTitulo: 'Gestão de Clientes e Honorários - Albuquerque Adv',
        tipo: 'reuniao',
        resumo: 'Treinamento dos sócios na funcionalidade de relatórios analíticos.',
        data: '2026-09-07 10:00:00.000Z',
      },
      {
        clienteEmail: 'eduardo.martins@inovarefin.com.br',
        negocioTitulo: null,
        tipo: 'ligacao',
        resumo: 'Primeiro contato telefônico. Demonstrou interesse em demonstração ao vivo do CRM.',
        data: '2026-09-08 15:45:00.000Z',
      },
    ]

    for (const data of seedInteracoes) {
      const clienteRecord = clienteRecords[data.clienteEmail]
      if (!clienteRecord) continue

      const negocioRecord = data.negocioTitulo ? negocioRecords[data.negocioTitulo] : null

      try {
        app.findFirstRecordByData('interacoes', 'resumo', data.resumo)
      } catch (_) {
        const record = new Record(interacoesCol)
        record.set('cliente', clienteRecord.id)
        if (negocioRecord) {
          record.set('negocio', negocioRecord.id)
        }
        record.set('tipo', data.tipo)
        record.set('resumo', data.resumo)
        record.set('data', data.data)
        if (adminUserId) {
          record.set('registrado_por', adminUserId)
        }
        app.save(record)
      }
    }
  },
  (app) => {
    // Revert seed records if needed
  },
)
