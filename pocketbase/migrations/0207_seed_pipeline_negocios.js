migrate(
  (app) => {
    const negociosCol = app.findCollectionByNameOrId('negocios')
    const clientesCol = app.findCollectionByNameOrId('clientes')

    // Verificar se há clientes cadastrados
    const maria = app.findFirstRecordByData('clientes', 'nome', 'Maria Rodrigues')
    const romeu = app.findFirstRecordByData('clientes', 'nome', 'ROMEU')

    const count = app.countRecords('negocios')
    if (count < 5) {
      // Adicionar negócios para cobrir os estágios restantes (contato_feito, proposta, fechado_perdido)
      try {
        const n1 = new Record(negociosCol)
        n1.set('titulo', 'Consultoria e Diagnóstico Financeiro')
        n1.set('cliente', maria.id)
        n1.set('valor', 6500)
        n1.set('estagio', 'contato_feito')
        n1.set('probabilidade', 40)
        n1.set('data_fechamento_previsto', '2026-10-15 00:00:00.000Z')
        n1.set(
          'observacoes',
          'Primeiro contato realizado. Apresentação inicial de BPO e análise de rotinas enviada.',
        )
        n1.set('origem', 'evento')
        n1.set('status', 'em_negociacao')
        app.save(n1)
      } catch (e) {
        console.log('Seed n1 erro:', e)
      }

      try {
        const n2 = new Record(negociosCol)
        n2.set('titulo', 'Implantação de Controladoria e Gestão')
        n2.set('cliente', romeu.id)
        n2.set('valor', 12500)
        n2.set('estagio', 'proposta')
        n2.set('probabilidade', 75)
        n2.set('data_fechamento_previsto', '2026-10-25 00:00:00.000Z')
        n2.set(
          'observacoes',
          'Proposta comercial formalizada e aguardando validação com a diretoria.',
        )
        n2.set('origem', 'indicacao')
        n2.set('status', 'em_negociacao')
        app.save(n2)
      } catch (e) {
        console.log('Seed n2 erro:', e)
      }
    }
  },
  (app) => {
    // rollback opcional
  },
)
