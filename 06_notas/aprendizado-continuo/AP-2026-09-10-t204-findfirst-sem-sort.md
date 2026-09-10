# AP-2026-09-10 — findFirstRecordByFilter não aceita sort no JSVM

- **Task:** T2.04 (CA-2-039)
- **Sintoma:** validação de "aceite de uso único" deixava reusar o mesmo aceite (2ª exportação com 200 em vez de 403).
- **Causa raiz:** `$app.findFirstRecordByFilter(collection, filter, '-ocorrido_em', params)` falha silenciosamente no JSVM — o 3º parâmetro é convertido para `dbx.Params` ("could not convert -ocorrido_em to dbx.Params"). Com o erro engolido por try/catch, `ultimoConsumo` ficava null e a validação passava. Além disso, sem sort o finder retorna o registro mais antigo, não o mais recente.
- **Correção:** usar `$app.findRecordsByFilter(collection, filter, '-ocorrido_em', 1, 0, params)` (esta assinatura aceita sort/limit/offset) e comparar datas por epoch (`Date.parse`), pois `String()` de datas diverge entre `created` (autodate, com Z) e campos date.
- **Diagnóstico:** rota de debug temporária (`/backend/v1/debug/datas`) com try/catch total expôs o TypeError exato. Removida após a correção (404 confirmado).
- **Regra:** no JSVM, `findFirstRecordByFilter` = (collection, filter, params) apenas, SEM sort, e lança exceção em "no rows". Para ordenar, sempre `findRecordsByFilter` + sort + limit. Nunca engolir erro de finder em try/catch vazio sem tratar o caso null.
