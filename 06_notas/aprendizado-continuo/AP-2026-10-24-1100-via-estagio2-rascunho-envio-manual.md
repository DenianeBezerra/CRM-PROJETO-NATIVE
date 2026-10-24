# AP-2026-10-24-1100 — V.ia estágio 2: rascunho com envio manual e sem botão de envio

- Status: candidato
- Escopo: projeto do cliente (CRM Vibratto)
- Task/SPEC: T3.27 (§4.1/§4.3 do doc Requisitos Complementares Etapa 3)
- Sinal: o estágio 2 exige que o rascunho seja apresentado ao atendente para revisão e envio manual. O recorte implementado mantém a V.ia como produtora de TEXTO apenas: nenhum botão de envio no CRM, bloco identificado como RASCUNHO, canal escolhido pelo atendente. A fronteira entre estágio 2 (texto) e estágio 3 (envio automático, bloqueado) fica materializada na UI.
- Evidência: provas RED 4/4 + GREEN 2 canais + trilha via_interacoes (4 entradas rascunho_resposta, bloqueada=false); QA verde v0.0.758–0.0.759; teste UI pela Deni.Ai e aprovação da CEO.
- Regra reutilizável: em estágios de IA com revisão humana obrigatória, a UI deve materializar a fronteira — bloco marcado como rascunho, ausência deliberada de botão de envio e aviso de que a assistente não envia nada. O gatilho de envio só entra quando o estágio correspondente for liberado.
- Quando aplicar: V.ia estágio 3 (resposta automática) e qualquer recurso futuro de IA com ação externa.
- Quando não aplicar: recursos em que o sistema é a origem legítima da ação (ex.: e-mail de relatório agendado já autorizado).
- Confiança: alta — restrição explícita do doc §4.1/§4.3, provada na UI e por API.
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.
