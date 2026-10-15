# Afluente — protótipo v0.3

- `afluente.html`: a página publicada como Artifact (sem `<html>`/`<head>`, que o Artifact acrescenta).
- `index.html`: a mesma página como documento completo, para abrir localmente ou publicar (ex.: Netlify). Gere de novo a partir de `afluente.html` depois de editar, com `sh ../sim/gerar_index.sh`.
- Depois de mudar um motor, copie-o para o simulador com `node ../sim/extrair_motor.js`. Ele extrai o motor de regras (`function Engine` → `ano_no_vale_motor.js`) e, desde a v2.0, o do clima (`function Atmos` → `atmos_motor.js`, testado por `atmos_teste.js`).

Desde a v0.4 o motor (`function Engine`) implementa o encaixe de peças descrito em `../AFLUENTE_v0.4_NOTAS.md`. O par do dia é calculado por um bot guloso num Web Worker. A v0.3 (canais cavados e colheitas) está no histórico do git.

Antes de publicar uma mudança visual (v2.3), rode os auditores, que precisam do Playwright com o Chromium:
- `node ../sim/interface_teste.js [pasta]`: fontes, cortes, sobreposições, toque e rótulos em 7 telas × 11 situações. Regras em `../INTERFACE.md`.
- `node ../sim/coerencia_teste.js`: o que se vê não contradiz as regras (chuva × seca, bichos, raios), quadro a quadro. Ver `../CLIMA.md`, seção 8.
