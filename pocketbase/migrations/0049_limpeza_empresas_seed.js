migrate(
  (app) => {
    // Pendências menores (varredura pós-T2.15): remove 7 empresas seed de
    // demonstração sem vínculo (0 contatos, 0 negócios, 0 interações).
    // Preservadas: AG e DB (verificar vínculo de DB abaixo) e qualquer
    // empresa com relacionamento.
    const seeds = [
      'Nexus Tecnologia & Cloud',
      'Alcantara Engenharia & Obras',
      'Bella Casa Interiores',
      'Logística TransBrasil Express',
      'Albuquerque Advogados Associados',
      'Inovare Soluções Financeiras',
      'DB',
    ]
    for (let i = 0; i < seeds.length; i++) {
      const found = app.findRecordsByFilter('empresas', 'nome = "' + seeds[i] + '"', '', 5, 0)
      for (let j = 0; j < found.length; j++) {
        const empId = found[j].id
        // Só remove se não houver contatos vinculados.
        const vinc = app.findRecordsByFilter('clientes', 'empresa = "' + empId + '"', '', 1, 0)
        if (vinc.length === 0) {
          app.delete(found[j])
        }
      }
    }
  },
  (app) => {
    // Down: irreversível por design (limpeza).
  },
)
