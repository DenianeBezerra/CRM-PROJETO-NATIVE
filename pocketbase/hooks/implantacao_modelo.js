// T3.16 — ajuste ao processo real (CEO 13/09 22:44): modelo de implantação passa a ter
// as 3 ETAPAS REAIS da Vibratto (não mais 7). Etapa 1 ganha checklist de subtarefas
// (acessos bancários, pasta compartilhada, sistema, planilhas de controle, upload contábil)
// registrado na descrição — sem criar sub-etapas no banco.
// Modelo real:
//   1. Acessos e estrutura — criação dos acessos bancários, criação de pasta compartilhada,
//      implantação do sistema e acessos às planilhas de controle e acesso ao sistema de upload contábil.
//   2. Análise das informações financeiras — contas pagas, recebidas, a pagar e a receber.
//   3. Diagnóstico e validação — diagnóstico, definição e validação dos processos do dia a dia,
//      apresentação do sistema.
// A "preparação do contrato" vira etapa do PIPELINE COMERCIAL (não da implantação).
// O e-mail de boas-vindas é GERADO pelo CRM (rota dedicada) e registrado como etapa concluída.

var MODELO_IMPLANTACAO = [
  [
    'Acessos e estrutura',
    'Criação dos acessos bancários, criação de pasta compartilhada (SharePoint/Google Drive), implantação do sistema e acessos às planilhas de controle e acesso ao sistema de upload contábil.',
  ],
  [
    'Análise das informações financeiras',
    'Análise das informações financeiras: contas pagas, recebidas, a pagar e a receber.',
  ],
  [
    'Diagnóstico e validação dos processos',
    'Diagnóstico, definição e validação dos processos do dia a dia, apresentação do sistema.',
  ],
]
