# AP-2026-09-13-2310 — Coleção nova em migration: campos via fields.add APÓS save vazio + autodate explícito

- Status: candidato
- Escopo: projeto do cliente (CRM Vibratto)
- Task/SPEC: T3.16 / SPEC-3-016
- Sinal: coleção criada com `new Collection({fields:[...]})` aplicou SEM os campos no runtime do pod (coleção nasceu vazia). Além disso, coleção sem autodate created/updated explícitos quebra qualquer sort por -created (GET lista dava 400).
- Evidência: migration 0166 aplicada mas coleção implantacoes com 0 campos; GET /implantacoes 400 com sort -created; corrigido em 0168 (fields.add após save) e 0169 (autodate).
- Regra reutilizável: em migrations deste runtime, (1) criar a coleção vazia, salvar, e ADICIONAR os campos via fields.add(new TipoField(...)) depois; (2) SEMPRE incluir autodate created/updated explicitamente em coleção nova.
- Quando aplicar: toda migration que cria coleção nova.
- Quando não aplicar: alterações em coleções existentes (fields.add direto funciona).
- Confiança: alta — provado por API e corrigido no mesmo ciclo.
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.
