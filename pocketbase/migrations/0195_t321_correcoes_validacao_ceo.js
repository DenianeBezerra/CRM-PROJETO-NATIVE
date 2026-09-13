// T3.21 — Correções da validação da CEO (16/09):
// 1) POST /links: bloqueia geração em conteúdo arquivado (erro nomeia o estado)
//    e melhora mensagens de erro (nomeia o parâmetro ausente).
// 2) POST /etapa: bloqueia avanço a partir de arquivado (estado terminal).
// 3) POST /conteudos: criação de peça avulsa SEM campanha gera automaticamente
//    o identificador D17 (ano-linha-tema) e grava na campanha mínima — assim a
//    geração de links usa o identificador oficial, imutável, e a campanha
//    aparece no CRM.
migrate(
  (app) => {},
  (app) => {},
)
