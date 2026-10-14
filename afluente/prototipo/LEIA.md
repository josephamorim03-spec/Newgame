# Afluente — protótipo v0.3

- `afluente.html`: a página publicada como Artifact (sem `<html>`/`<head>`, que o Artifact acrescenta).
- `index.html`: a mesma página como documento completo, para abrir localmente ou publicar (ex.: Netlify). Gere de novo a partir de `afluente.html` depois de editar.

O motor de regras (`function Engine`) é uma porta de `../sim/afluente3.py` com a configuração final da v0.3, mais o córrego inicial descrito no GDD §9.1. O par do dia é calculado pelo bot planejador num Web Worker.
