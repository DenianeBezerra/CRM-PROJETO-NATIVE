# Evidência T2.02 — GREEN (CA-2-037)

- Task: T2.02 — CA-2-037 (empresa como entidade relacional própria)
- SPEC: SPEC-2-000
- Data: 2026-09-10
- Projeto Skip: CRM_VIBRATTO (id 53851)
- Versões: v0.0.93 (coleção + tela, QA verde) e v0.0.94 (fix da conversão text→relation + backfill, QA verde)
- Decisão de modelagem: **Opção A — entidade relacional própria**, com aceite da cliente/consultora registrado em 2026-09-10 17:37 ("Aprovar Opção A — implementar entidade relacional").

## Implementado

- **Coleção `empresas`** (migration 0022): nome (obrigatório), cnpj, setor, observações, status (ativa/inativa/prospect); delete admin-only; índice por nome.
- **`clientes.empresa`**: texto livre → **relation** para `empresas` (migration 0023 — a 0022 criou a coleção mas a conversão do campo não persistiu; correção idempotente na 0023).
- **Backfill**: cada texto distinto virou um registro de empresa e os contatos foram vinculados — 6 empresas ativas criadas (Nexus Tecnologia & Cloud, Alcantara Engenharia & Obras, Bella Casa Interiores, Logística TransBrasil Express, Albuquerque Advogados Associados, Inovare Soluções Financeiras); resíduos de fixtures antigas ("DB", "AG") desativados.
- **Tela de Contatos**: campo Empresa virou select alimentado pela coleção `empresas`; cartões exibem o nome via expand; busca continua funcionando por empresa.

## Provas GREEN (API real + UI)

1. **G1 — coleção e backfill**: `empresas` com 8 registros (6 ativas + 2 resíduos inativados); contatos vinculados às suas empresas.
2. **G2 — relação funcional**: PATCH `clientes` com id de empresa → 200; expand retorna o nome.
3. **G3 — mesma empresa, mesma entidade**: contatos da mesma empresa compartilham o mesmo id de empresa (sem duplicidade de texto).
4. **G4 — create com relation**: contato novo criado com empresa via API → 200, vínculo persistido; fixture removida após a prova.
5. **G5 — UI**: formulário de edição de contato exibe select "Empresa" com as empresas do backfill; cartão mostra "Empresa não informada" quando sem vínculo.
6. **QA**: v0.0.93 e v0.0.94 totalmente verde (setup, estática, build, integrações, testes).

## Observações

- A migration 0022 foi marcada como aplicada pela plataforma sem persistir a conversão do campo (mesmo sintoma do prefixo queimado da T2.01); correção na 0023, idempotente, sem perda de dado.
- Resíduos de fixtures da Fase 1 ("DB", "AG") foram desativados (não excluídos — histórico preservado).
- Teste humano pendente (portão de entrega).
