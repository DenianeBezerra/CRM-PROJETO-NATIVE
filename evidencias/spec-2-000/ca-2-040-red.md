# Evidência — T2.05 — CA-2-040 (RED)

- **Data:** 2026-09-10
- **Versão de baseline:** 0.0.114 (QA verde)
- **Método:** prova por API real com os dois papéis (admin e operator).

## Provas

1. **Leitura da auditoria não respeita papel** — operator (`operator@vibratto.com.br`) lia **55 eventos** com snapshots completos de atos de terceiros; admin e operator tinham acesso idêntico.
2. **Sem política de retenção** — a coleção `auditoria` não tinha campo nem regra de retenção; eventos permaneciam para sempre.
3. **Delete auditado** — ✅ já funcionava (evento `delete` com snapshot provado ao remover fixture TESTE); parte conforme do baseline.
4. **Migrations sem IDs de ambiente** — ✅ revisão das 25 migrations existentes: nenhuma depende de ID fixo de registro/coleção; todas localizam por nome.
5. **Fixtures acumuladas** — 1 aceite forjado (RED-T204, qtd=99999), 5 eventos de teste (T2.03), 10 trilhas de exportação de teste (T2.04).

## Conclusão

CA-2-040 reproduz falha no baseline v0.0.114 nos critérios de papel e retenção. Implementação autorizada pela cliente em 2026-09-10 18:30.
