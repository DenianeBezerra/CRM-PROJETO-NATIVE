# Evidência — T2.08 — CA-2-003 (RED)

- **Data:** 2026-09-10
- **Versão de baseline:** 0.0.139 (QA verde, T2.07 concluída)
- **Método:** inspeção do package.json e do pipeline do Skip.

## Provas

1. **Node não declarado** — `package.json` sem campo `engines`: a versão de Node do build dependia do ambiente, não do contrato do projeto.
2. **Sem typecheck** — TypeScript instalado mas nenhum script `typecheck`; erros de tipo só aparecem (ou não) no build.
3. **Suíte de testes placeholder** — `test` = `echo "there are no tests for this project" && exit 0`: "suíte real termina com código zero" era falso por definição.
4. **QA do Skip** — roda lint + build (verde), mas não typecheck nem suíte real.

## Conclusão

CA-2-003 reproduz falha no baseline v0.0.139. Implementação autorizada pela cliente em 2026-09-10 19:16.
