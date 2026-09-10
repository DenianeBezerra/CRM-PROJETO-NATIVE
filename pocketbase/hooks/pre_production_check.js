// T2.10 / CA-2-005 — consulta reproduzível de aptidão para produção.
// Varre o denominador real (contas, contatos, oportunidades) procurando
// contas/fixtures de teste e seeds de demonstração. Admin-only, sem efeitos
// colaterais (somente leitura) — pode ser reexecutada a qualquer momento com
// o mesmo resultado enquanto o estado não mudar.
//
// Padrões JSVM: lógica inline, finders com try/catch, sem funções top-level.

routerAdd(
  'GET',
  '/backend/v1/security/pre-production-check',
  (e) => {
    try {
      const actor = e.auth
      if (!actor || actor.get('role') !== 'admin') {
        return e.json(403, {
          error: 'Consulta de aptidão para produção é exclusiva de administradores.',
        })
      }

      // Padrões de fixture/seed conhecidos (nomes e marcadores usados em testes).
      const padroesFixture = [
        'T201-DELETE',
        'GREEN T201',
        'GREEN T2.03',
        'fixture',
        'Fixture',
        'TESTE',
        'Teste humano',
        'T203',
        'T207',
        'T209',
        'DEBUG',
        'debug',
      ]
      // Contatos/oportunidades criados pela migration 0006 (seed de demonstração).
      const seedsContatos = [
        'Juliana Vasconcelos',
        'Rodrigo Alcantara',
        'Camila Fernandes',
        'Marcelo Pires de Castro',
        'Fernanda Albuquerque Ribeiro',
        'Eduardo Martins Soares',
      ]
      const seedsNegocios = [
        'Implantação CRM Enterprise - Nexus Tech',
        'Expansão de Módulos Operacionais - Alcantara Engenharia',
        'Consultoria de Automação Comercial - TransBrasil',
        'Plataforma de Relacionamento - Bella Casa',
        'Gestão de Clientes e Honorários - Albuquerque Adv',
      ]

      const ehFixture = function (nome) {
        if (!nome) return false
        for (let i = 0; i < padroesFixture.length; i++) {
          if (String(nome).indexOf(padroesFixture[i]) !== -1) return true
        }
        return false
      }
      const ehSeed = function (nome, lista) {
        if (!nome) return false
        for (let i = 0; i < lista.length; i++) {
          if (String(nome) === lista[i]) return true
        }
        return false
      }

      // ---- Contas.
      let contas = []
      try {
        contas = $app.findRecordsByFilter('users', '', '', 100, 0)
      } catch (_) {
        contas = []
      }
      const contasDetalhe = []
      let contasProblema = 0
      for (let i = 0; i < contas.length; i++) {
        const c = contas[i]
        const nome = String(c.get('name') || '')
        const email = String(c.get('email') || '')
        const ehTeste = ehFixture(nome) || ehFixture(email) || email.indexOf('inativo-t') !== -1
        if (ehTeste) contasProblema++
        contasDetalhe.push({
          email: email,
          papel: c.get('role'),
          ativa: c.get('active'),
          fixture: ehTeste,
        })
      }

      // ---- Contatos.
      let contatos = []
      try {
        contatos = $app.findRecordsByFilter('clientes', '', '', 10000, 0)
      } catch (_) {
        contatos = []
      }
      const contatosProblema = []
      for (let i = 0; i < contatos.length; i++) {
        const nome = String(contatos[i].get('nome') || '')
        if (ehFixture(nome) || ehSeed(nome, seedsContatos)) {
          contatosProblema.push(nome)
        }
      }

      // ---- Oportunidades.
      let negocios = []
      try {
        negocios = $app.findRecordsByFilter('negocios', '', '', 10000, 0)
      } catch (_) {
        negocios = []
      }
      const negociosProblema = []
      for (let i = 0; i < negocios.length; i++) {
        const titulo = String(negocios[i].get('titulo') || '')
        if (ehFixture(titulo) || ehSeed(titulo, seedsNegocios)) {
          negociosProblema.push(titulo)
        }
      }

      const apto =
        contasProblema === 0 && contatosProblema.length === 0 && negociosProblema.length === 0

      return e.json(200, {
        apto_producao: apto,
        contas: { total: contas.length, fixtures: contasProblema, detalhe: contasDetalhe },
        contatos: { total: contatos.length, fixtures_ou_seeds: contatosProblema },
        oportunidades: { total: negocios.length, fixtures_ou_seeds: negociosProblema },
        verificado_em: new Date().toISOString(),
      })
    } catch (err) {
      return e.json(500, { erro: String(err) })
    }
  },
  $apis.requireAuth(),
)
