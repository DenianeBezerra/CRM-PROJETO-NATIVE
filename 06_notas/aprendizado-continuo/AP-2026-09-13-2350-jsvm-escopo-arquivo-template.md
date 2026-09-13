# AP-2026-09-13-2350 — Escopo entre arquivos de hooks no goja (var top-level cross-file)

- Status: candidato
- Escopo: projeto do cliente
- Task/SPEC: T3.17 (SPEC-3-017)
- Sinal: hook `contrato_endpoint.js` referenciava `TEMPLATE_CONTRATO_VIBRATTO`, var top-level definida em `contrato_modelo.js` (arquivo separado). No runtime goja, o callback não enxerga top-levels de OUTRO arquivo — o POST falhava com 400 genérico sem erro no QA. A lição AP-0200 (helpers top-level invisíveis em callbacks) se estende ao escopo ENTRE ARQUIVOS: cada arquivo de hook é um escopo isolado.
- Evidência: POST gerar 400 "Something went wrong" por API (provas T3.17); fix com template inline no callback → geração 200 (v0.0.551); QA nunca acusou o problema.
- Regra reutilizável: NUNCA compartilhe constantes/helpers entre arquivos de hook via var top-level — duplique inline dentro de cada callback que usa, ou mova para uma migration/coleção de configuração.
- Quando aplicar: qualquer hook novo que precise de template/constante grande; revisar hooks existentes que importam conceitualmente de outro arquivo.
- Quando não aplicar: constantes dentro do MESMO arquivo no escopo do callback já são seguras (padrão comercial_contract.js).
- Confiança: alta — causa raiz demonstrada por prova de API antes/depois do fix.
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.
