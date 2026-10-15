# Afluente — protótipo v0.3

- `afluente.html`: a página publicada como Artifact (sem `<html>`/`<head>`, que o Artifact acrescenta).
- `afluente3d.html` (v3.2): o jogo com o tabuleiro em 3D, num arquivo só que abre direto no navegador. Gere de novo depois de editar `afluente.html` ou `../jogo3d/vale3d.js`, com `sh ../sim/gerar_3d.sh` (usa o esbuild pelo npx). Capturas: `node ../sim/olhar_3d.js pasta`. Teste das peças 3D: `node ../sim/vale3d_teste.js`.
- `index.html`: a mesma página como documento completo, para abrir localmente ou publicar (ex.: Netlify). Gere de novo a partir de `afluente.html` depois de editar, com `sh ../sim/gerar_index.sh`.
- Depois de mudar um motor, copie-o para o simulador com `node ../sim/extrair_motor.js`. Ele extrai o motor de regras (`function Engine` → `ano_no_vale_motor.js`) e, desde a v2.0, o do clima (`function Atmos` → `atmos_motor.js`, testado por `atmos_teste.js`).

Desde a v0.4 o motor (`function Engine`) implementa o encaixe de peças descrito em `../AFLUENTE_v0.4_NOTAS.md`. O par do dia é calculado por um bot guloso num Web Worker. A v0.3 (canais cavados e colheitas) está no histórico do git.

Antes de publicar uma mudança visual (v2.3), rode os auditores, que precisam do Playwright com o Chromium:
- `node ../sim/interface_teste.js [pasta]`: fontes, cortes, sobreposições, toque e rótulos em 7 telas × 11 situações. Regras em `../INTERFACE.md`.
- `node ../sim/coerencia_teste.js`: o que se vê não contradiz as regras (chuva × seca, bichos, raios), quadro a quadro. Ver `../CLIMA.md`, seção 8.

Desde a v2.4 (a água no centro), o simulador de referência das regras é `../sim/v24_teste.js`. Ele joga com os bots dos marcos do próprio motor (`Engine.botPlay`), que respeitam a regra "água só encosta em água" e deixam a peça passar quando ela não cabe. Ele mede pontos, duração, vale verde, rio vivo, afluentes, cheia e missões por tipo. Uso: `node ../sim/v24_teste.js 20 rand,guloso,cuidadoso,mestre`. Os simuladores antigos (`ano_no_vale_teste.js` e `replay_teste.js`) ainda rodam, mas não aplicam essa regra. Os estudos que levaram à v2.4 estão em `../REVISAO_MECANICAS_v2.3.md`, `../REVISAO_RETENCAO_v2.4.md` e `../AGUA_E_PREVIA_v2.5.md`, com scripts e resultados em `../sim/revisao/`.
