# Português A1 → C1

App privada (PWA para iPhone) para aprender portugués de Brasil de A1 a C1, pensada para hispanohablantes. Foco en lectoescritura; como extra, audición y pares mínimos de pronunciación.

Es una copia independiente de [DeutschLernen](https://github.com/matiasbacalhau/DeutschLernen) con la misma forma didáctica:
- cada tema sube por 5 etapas (Descobrir → Reconhecer → Aplicar no contexto → Produzir com apoio → Escrever livremente);
- la corrección nombra la regla y nunca muestra la solución;
- el vocabulario se repasa con FSRS.

La pedagogía está en [docs/PEDAGOGIA_ESCALONES.md](docs/PEDAGOGIA_ESCALONES.md) la política de idioma de la interfaz en [docs/DESIGN_IMMERSION.md](docs/DESIGN_IMMERSION.md) y cómo corrige la app en [docs/CORRECCION.md](docs/CORRECCION.md). El estado está en [PROGRESS.md](PROGRESS.md).

## Qué cambia respecto del alemán
- Morfología de Brasil: artículos, contracciones (`no`, `da`, `pelo`…) y presente en 4 personas (`eu`, `você/ele/a gente`, `nós`, `vocês/eles`): `js/core/morph.js`.
- Tolerancia de tildes y ç con aviso, salvo cuando sin tilde queda otra palabra (`é/e`, `está/esta`, `avó/avô`): `js/core/normalize.js`.
- Ejercicio nuevo `pares` (pares mínimos con TTS: `pão/pau`, `avó/avô`, `cansado/casado`).
- Contenido enfocado en las trampas del hispanohablante: cambios de género (`o leite`, `a viagem`), países con artículo, `-m` final (`falam`), `você` en tercera persona, `gostar de`, `morar`.

## Correr en local
```bash
python3 -m venv .venv && .venv/bin/pip install -r tools/requirements.txt
python3 -m http.server 8000
```
Abrir http://localhost:8000. No hace falta build para el código; el contenido se compila con `tools/build_content.py`.

## Chequeos (los mismos que la CI)
```bash
docker run -d --rm -p 8010:8010 erikvl87/languagetool
PATH="$PWD/.venv/bin:$PATH" tools/check.sh
```
`check.sh` compila el contenido, lo valida, corre los tests (`node --test` y Python) y chequea todo el portugués contra el LanguageTool local (pt-BR).

## Fuentes
Los PDFs de referencia y sus conversiones a Markdown (markitdown) viven en `fuentes/`, fuera del repo (`.gitignore`): se estudian como modelo, nunca se copian. El contenido se escribe desde cero. Fuentes abiertas usadas como referencia: *Português para principiantes* (UW-Madison, CC BY-NC-SA), *Tá Falado* (UT Austin, CC BY), Tatoeba (CC BY), FrequencyWords (CC BY-SA), QuaREPE y el Referencial Camões para los niveles.

## Licencias
Código: MIT ([LICENSE](LICENSE)). Contenido y datos: ver [LICENSE-data](LICENSE-data).
