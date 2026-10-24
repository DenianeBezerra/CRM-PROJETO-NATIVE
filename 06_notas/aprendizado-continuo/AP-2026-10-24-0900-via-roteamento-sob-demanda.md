# AP-2026-10-24-0900 — V.ia: roteamento do assunto sob demanda (estágio 1 completo)

- Status: candidato
- Escopo: projeto do cliente (CRM Vibratto)
- Task/SPEC: T3.26 (§4.2 do doc Requisitos Complementares Etapa 3)
- Sinal: o doc pedia classificação "automática" do assunto; a leitura adotada (autorizada pela CEO) foi sob demanda — botão na Consulta 360º. O estágio 1 do §4.2 ficou completo (5 casos de uso) sem custo de IA por mensagem recebida e sem risco de classificação sem contexto de uso.
- Evidência: trilha via_interacoes (3 entradas classificar_assunto, bloqueada=false); provas RED/GREEN por API no fechamento; QA verde v0.0.754–0.0.755.
- Regra reutilizável: quando um requisito disser "automático" para IA em estágio de apoio interno, preferir o gatilho sob demanda no estágio 1 e reservar o gatilho automático (hook por evento) para o estágio em que a resposta vai ao cliente — custo por chamada e contexto de uso acompanham o destinatário.
- Quando aplicar: novos casos de uso de IA no CRM (estágios 2/3 do §4, roteamento por evento).
- Quando não aplicar: rotinas de motor/obrigações, em que o gatilho por evento é o desenho correto (não é IA de conversa).
- Confiança: média — decisão de produto da CEO em uma task; sem contraprova de volume ainda.
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.
