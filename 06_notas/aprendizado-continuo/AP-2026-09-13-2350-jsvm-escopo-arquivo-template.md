# AP-2026-09-13-2350 — Escopo goja por arquivo de hook + limites de campo

- Status: candidato
- Escopo: projeto do cliente
- Task/SPEC: T3.17 (SPEC-3-017)
- Sinal: dois 400 genéricos ("Something went wrong") na rota de gerar contrato, ambos com causa raiz confirmada por API: (1) variável top-level definida em OUTRO arquivo de hook (contrato_modelo.js) não é visível dentro do callback de contrato_endpoint.js — cada arquivo de hook tem escopo próprio no runtime goja; (2) `Number.toLocaleString('pt-BR', {...})` lança no goja — formatação BRL precisa ser manual. Além disso, TextField aceitou `maxSize` na migration sem erro, mas aplicou o default 5000 — a propriedade correta é `max`.
- Evidência: provas por API (400 genérico → 200 após inline do template; erro "conteudo: Must be no more than 5000" → 200 após migration 0181); QA verde v0.0.551–0.0.555.
- Regra reutilizável: em hooks JSVM, todo dado compartilhado entre rotas do MESMO hook deve ser inline no callback; nunca depender de var top-level de outro arquivo; nunca usar toLocaleString com locale; em migrations, TextField usa `max` (maxSize é ignorado silenciosamente).
- Quando aplicar: qualquer hook novo com template/constante compartilhada ou formatação de número; qualquer migration com campo de texto longo.
- Quando não aplicar: helpers dentro do MESMO callback continuam válidos; toLocaleString() sem argumentos não foi testado.
- Confiança: alta — causa raiz provada por API em ambas as correções.
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.
