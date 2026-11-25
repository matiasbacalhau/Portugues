# Progreso

Qué anda, cómo se comprobó y qué falta probar. Lo que dice "no probado" no está probado, aunque los tests pasen.

## Dónde estamos (2026-11-24)

- **Base:** copia de DeutschLernen (commit 38e6f1c), con el motor intacto (FSRS, mastery, scheduler, escalones, feedback) y la capa de idioma reescrita para portugués de Brasil.
- **Contenido:** A1 · Unidade 1 "Chegando", 3 temas completos de 5 etapas: *Pronomes, ser e estar*; *Artigos, gênero e contrações*; *Presente regular e os sons*. Son 150 ejercicios, 33 de ellos de reserva; además 169 palabras de léxico y 19 plantillas. El resto del curriculum A1–C1 es esqueleto ("em breve").
- **Identidad visual:** pendiente del concurso de 3 propuestas (`bakeoff/`). Hasta elegir, la app usa el CSS de DeutschLernen.

## Anda (comprobado con tests)
- `tools/build_content.py` y `tools/validate.py`: el contenido compila y cumple los mínimos por etapa.
- 310 tests de JS y 32 de Python en verde. Incluye una prueba que recorre todo el contenido real (`tests/content-leaks.test.js`) y verifica que ninguna regla mostrada tras un error contenga la respuesta aceptada.
- Morfología (artículos, contracciones, presente), tolerancia de tildes con las excepciones que cambian el sentido, diagnóstico de errores y el ejercicio `pares`.

## No probado
- **LanguageTool pt-BR** (`tools/lt_check.py`): necesita Docker; corre en la CI. Los ids de reglas de gramática de LanguageTool pt-BR se agregan a `content-src/lt-map.yaml` al verlos en las respuestas del servidor.
- **Corrector con IA** (`proxy/`): el Worker `portugues-grammar` no está desplegado. Sin él, la app corrige las escrituras solo con LanguageTool. Hay que desplegarlo y correr `tools/grammar_bench.mjs` (criterio: 0 falsos positivos).
- **Voz pt-BR en el iPhone** (pares mínimos y dictado): no probada en el dispositivo.
- La app entera en el iPhone real.
