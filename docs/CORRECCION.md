# Cómo corrige la app

Regla de base: la devolución nombra el tipo de error o la regla, **nunca muestra la respuesta correcta**.

## Cascada de una respuesta escrita

Se prueba cada nivel en orden; el primero que decide, decide.

| Nivel | Qué hace | Dónde |
|---|---|---|
| 1. Respuesta aceptada | Coincide con una respuesta del ítem, con tolerancia de mayúsculas, puntuación y tildes (avisa "ojo: acento"). El artículo ante nombre de persona es opcional (`O Leo mora…` = `Leo mora…`). | `js/core/checks/common.js`, `normalize.js`, `classify.js` (`nameArticleVariants`) |
| 2. Error anotado | El ítem trae el error previsto en `errors:` y su regla. | contenido (`content-src/`) |
| 3. Clasificador local | Compara palabra a palabra con la respuesta más parecida y decide el tipo de error. Si no puede decidir, se abstiene. | `js/core/classify.js` |
| 4. Revisar com IA | A pedido del usuario, una vez por ítem. El Worker devuelve solo un veredicto de una lista cerrada y la parte equivocada; la app elige la devolución. Nunca se muestra texto del modelo. | `js/core/appeal.js`, `proxy/judge.js` |

## Tipos de error y devolución

| Tipo | Ejemplo | Devolución |
|---|---|---|
| `grammar-tag` (del tema) | `Nós está` en un ejercicio de *estar* | La regla del tema y un ejemplo |
| `grammar-other` (otro tema) | `no cozinha` en un ejercicio de *estar* | "Lo que practica este ejercicio está bien; el error es de otro tema" |
| `content` | `da Mia` cuando el texto dice *Lea* | "La gramática está bien, pero no corresponde" (en lectura: "volvé a leer el texto") |
| `spelling` | `Chiile` | "Hay una palabra mal escrita" |
| `accent` | `esta` por `está` | "Con esa tilde es otra palabra" |
| `unknown` | respuesta muy distinta | Mensaje neutro |

Lo equivocado se subraya en todos los casos.

## Progreso

Solo un error `grammar-tag` baja el dominio del tema y muestra el ejemplo (`mastery.js`, `runner.exampleFor`). Un error de tipeo, de dato o de otro tema no cuenta contra el tema que se practica. Las respuestas sin tipo (opciones, ejercicios generados) cuentan como siempre.

## Lectura

Las preguntas sobre datos del texto son de opciones: escribir la respuesta mezclaba comprensión con ortografía. Las opciones que son un dato equivocado llevan `content: true` y devuelven `content`.

## Corrector de escritura libre

La etapa 5 pasa por LanguageTool (pt-BR) y el Worker del corrector (`js/services/grammar.js`). El Worker se activa solo con la clave de Ajustes y tiene que dar 0 falsos positivos en `tools/grammar_bench.mjs`. Instalación y claves: [proxy/README.md](../proxy/README.md).
