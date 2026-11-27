# Corrector de gramática (Cloudflare Worker)

LanguageTool deja pasar los errores de caso y de artículo del tema 3, como *Ich habe ein Hund.* Este Worker le pide a un LLM que los marque, usando un catálogo cerrado de categorías (`llm_categories` en `content-src/lt-map.yaml`).

- La app nunca muestra texto del modelo, solo el `es` del catálogo (regla 3).
- La clave del proveedor vive en el Worker y nunca en el repo, que es público.

## Puesta en marcha (la hacés vos: cuentas y claves)

1. Creá la cuenta del proveedor.
   - **Claude:** cargá créditos mínimos en `platform.claude.com`, creá una API key y **poné un límite de gasto mensual**, por ejemplo $5.
   - **Gemini (opcional):** creá una API key en AI Studio.
2. Creá una cuenta gratis en Cloudflare.
3. En esta carpeta, instalá y entrá a Cloudflare:
   ```bash
   cd proxy && npm install && npx wrangler login
   ```
4. Cargá la clave (te la pide sin mostrarla):
   ```bash
   npx wrangler secret put ANTHROPIC_API_KEY
   ```
   Para Gemini, la clave es `GEMINI_API_KEY`.

   Después, la clave de la app: la misma que pusiste en **Ajustes → Clave del Worker**. Sin ella, cualquiera que conozca la URL podría gastar tu saldo:
   ```bash
   npx wrangler secret put APP_TOKEN
   ```
5. Publicá el Worker:
   ```bash
   npm run deploy
   ```
   Wrangler imprime la URL, algo como `https://portugues-grammar.<tu-cuenta>.workers.dev`.
6. Corré el bench desde la raíz del repo, con la misma clave de la app:
   ```bash
   APP_TOKEN=<tu clave> node tools/grammar_bench.mjs https://portugues-grammar.<tu-cuenta>.workers.dev
   ```
   Para comparar con Gemini, agregá `gemini` al final.
7. **Solo si el bench da 0 falsos positivos:** poné esa URL en `API` (`js/services/grammar.js`), commiteá y hacé push.

## Modo juez: "Revisar com IA"

Cuando la devolución de una respuesta escrita no corresponde con el error, la app ofrece **Revisar com IA** (una vez por ítem). Manda `{mode: 'judge', context, expected, answer, token}`: el ejercicio, las respuestas aceptadas y la del usuario.

- El modelo elige un veredicto de una lista cerrada: `correct`, `content`, `grammar`, `spelling` o `accent`.
- Además cita la parte equivocada de la respuesta (`quote`). Nunca devuelve una corrección ni una explicación.
- `judge.js` descarta una cita que no esté en la respuesta, y un veredicto desconocido es un error 502.
- La app elige su propia devolución según el veredicto (regla 3) y guarda la revisión en los reportes (⚑).

## Cambiar de proveedor o de modelo

Se cambia en `[vars]` de `wrangler.toml`, sin tocar la app:
- el proveedor, con `PROVIDER` (`claude` o `gemini`);
- el modelo, con `CLAUDE_MODEL` o `GEMINI_MODEL`;
- el esfuerzo de Claude, con `EFFORT`.

Después de cambiarlo, publicá con `npm run deploy` y volvé a correr el bench.

## Si "no corrige"

1. Las escrituras que fallan quedan pendientes y se corrigen solas al volver la red. Nada se marca mal por un corte.
2. Cada respuesta trae un `traceId`. La app lo guarda en el log local, en las entradas `t: 'lt'` con `src`, y en el panel de Cloudflare se busca así:
   - abrí Workers → `portugues-grammar` → Logs;
   - filtrá por `traceId`, o por `msg`: `request rejected`, `provider failed` o `marks dropped`.
3. `version` en la respuesta dice qué deploy contestó. Si no es el último, el `npm run deploy` no se aplicó.
4. Un falso positivo no da error: llega como una respuesta normal. Se ve con el ⚑ en la app y con el bench.

Los logs nunca llevan el texto escrito ni la respuesta del modelo: solo ids, cantidades y motivos.

## Archivos

| Archivo | Qué hace |
|---|---|
| `index.js` | Entrada del Worker: conecta proveedores y catálogo |
| `worker.js` | Origen, rate limit, tope de texto, logs y respuesta |
| `judge.js` | Modo juez: prompt, validación del pedido y del veredicto |
| `prompt.js` | Prompt y esquema JSON, compartidos por todos los proveedores |
| `validate.js` | Pasa citas a offsets y descarta lo que no cae en una palabra o en el catálogo |
| `genders.js` | Para los sustantivos del léxico, el género lo decide `data/lexicon.json`, no el modelo |
| `providers/claude.js`, `providers/gemini.js` | Un adaptador por proveedor, con la misma interfaz |

Los tests están en `tests/proxy.test.js` y corren con `tools/check.sh`, sin red y sin SDK.
