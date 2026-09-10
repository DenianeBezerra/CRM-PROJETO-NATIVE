# Evidência — T2.10 — CA-2-005 (RED)

- **Data:** 2026-09-10
- **Versão de baseline:** 0.0.151 (QA verde, T2.09 concluída)
- **Método:** varredura por API + diagnóstico server-side.

## Provas

1. **Consulta reproduzível inexistente** — endpoint de verificação de aptidão para produção não existia (404); nada confirmava o zero antes da publicação.
2. **Seeds de demonstração no denominador** — migration 0006 criou 6 contatos e 5 oportunidades fictícias (Nexus Tech, Alcantara, TransBrasil, Bella Casa, Albuquerque) que iríam para produção como dados reais.
3. **Fixtures de teste remanescentes** — 4 oportunidades (GREEN T201, T201-DELETE-fixture, T201-DELETE-fixture2, Teste humano T2.01).
4. **Conta de demonstração** — `operador.demo@vibratto.com.br` (seed de RBAC antigo, substituída pelo operator real da T9.2).
5. **Interação quebrada de seed** — `vraz2xood5xf7sc` com `negocio=""` (vazio), que bloqueava o delete dos negócios seed por required reference.

## Conclusão

CA-2-005 reproduz falha no baseline v0.0.151. Implementação autorizada pela cliente em 2026-09-10 19:39.
