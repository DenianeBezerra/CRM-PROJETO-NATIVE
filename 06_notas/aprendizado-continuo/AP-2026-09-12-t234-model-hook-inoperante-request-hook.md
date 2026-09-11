# AP-2026-09-12-0930 — Model hook onRecordUpdate de negocios inoperante no runtime; request hook é o caminho confiável

- Status: candidato
- Escopo: projeto do cliente
- Task/SPEC: T2.34 / CA-2-029 (SPEC-2-006)
- Sinal: o model hook `onRecordUpdate` em `negocios` (handoff_ganho.js, T2.31) parou de disparar — 8+ transições de ganho reais criaram 0 handoffs (provado por API em 2026-09-12). Causa provável: bloco duplicado do mesmo hook em `comercial_fields_rules.js` (dois `onRecordUpdate` para 'negocios' no mesmo arquivo + um terceiro em handoff_ganho.js). Remover a duplicação NÃO restaurou o disparo; mover a lógica para request hook (`onRecordUpdateRequest`, padrão audit_crm_changes.js) funcionou imediatamente. Request hooks têm `e.auth` e demonstradamente rodam; model hooks de update em negócios são hoje não-confiáveis neste runtime.
- Evidência: `evidencias/spec-2-006/ca-2-029-green.md` (RED: 8+ ganhos, 0 handoffs; GREEN v0.0.326: handoff criado no primeiro ganho após a troca).
- Regra reutilizável: lógica que deve reagir a update de negócio (criar registros derivados, carimbar campos) deve usar request hook `onRecordUpdateRequest` com `e.next()` antes da escrita derivada — não model hook. Se um model hook "misteriosamente" não dispara, verificar primeiro se há hook duplicado para a mesma coleção em outro arquivo.
- Quando aplicar: qualquer task que precise disparar efeito colateral em update/create de negócios (ou outras coleções com múltiplos hooks registrados).
- Quando não aplicar: validações que precisam abortar o save dentro da transação (model hooks seguem corretos para isso — ex.: comercial_fields_rules 400 divergente funciona).
- Confiança: alta — RED reproduzido 8+ vezes, GREEN imediato após a troca, QA verde em 4 deploys (v0.0.325–0.0.328).
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.
