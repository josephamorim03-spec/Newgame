# RING//BREAK — Primeiro contato

Protótipo web de um puzzle de anéis com acoplamentos e escolhas de regras. Funciona em celular na vertical e em PC. Não exige conta, backend, bibliotecas remotas ou instalação de dependências para jogar.

## Jogar

Abra `index.html` no navegador ou publique a pasta na Netlify. No celular, prefira uma URL hospedada: visualizadores de arquivos do iOS podem não executar JavaScript.

Para servir na rede local, com Node instalado:

```sh
npm start
```

No PC: `http://localhost:4173`. No celular conectado à mesma rede: `http://IP-DO-PC:4173`.

## Publicar na Netlify

Arraste a pasta descompactada que contém `index.html` para Netlify Drop. Se conectar este repositório, selecione `main`, deixe o comando de build vazio e use `.` como diretório de publicação. `netlify.toml` já define a pasta.

O projeto inclui toda a arte vetorial e procedural, efeitos, áudio sintetizado e interface. Nada é carregado de CDN, fonte remota ou pasta do jogo anterior.

## Regras em 60 segundos

- Cada ação gira um anel exatamente um setor.
- Três tons iguais em um setor geram 10 energia, são consumidos e recebem novos tons da fila.
- A reposição acontece por setor crescente, de externo para médio para interno.
- Uma nova ressonância causada pela reposição inicia uma cascata: ×1, ×2, ×4…
- Dois tons iguais em anéis vizinhos formam uma carga de Phase Lock; máximo 2 cargas por link.
- Girar um anel conectado usa uma carga e arrasta o vizinho no sentido oposto. A propagação pode atravessar os três anéis.
- Um link usado não recarrega na mesma ação. O mesmo par de glifos não gera cargas repetidas quando permanece junto.
- Em combate, ressoe no setor ameaçado antes da contagem zerar para evitar dano. Com Parasite, gaste o link marcado antes do ataque.
- Atingir a meta de energia encerra o encontro antes do ataque pendente.

## Controles

| Plataforma | Controle |
|---|---|
| Celular | Arraste um anel ao redor do centro. Uma ação por gesto. |
| Toque ou mouse | Selecione um anel e segure um botão de giro para prever. Solte para confirmar; saia do botão para cancelar. |
| PC | Q/A externo, W/S médio, E/D interno. Q/W/E horário; A/S/D anti-horário. |
| PC | 1/2/3 seleciona anel; ←/→ gira o selecionado. |

Não há pressão de tempo real. O contador avança apenas quando um movimento é confirmado. O som começa desligado e pode ser ativado no topo. Há velocidade 1×/2×/4× e movimento reduzido nas opções.

## O que esta versão contém

- 3 anéis × 8 setores, 4 tons com cor e forma redundantes.
- Preview dos movimentos propagados e das ressonâncias diretas.
- Fila de 6 tons, ampliada a 12 por Antevisão.
- Mini-run de 3 encontros: Needle, Parasite e The Clamp; 3 pontos de integridade por encontro.
- Catálogo de 8 Protocolos; escolhas após os dois primeiros encontros, 1 Rewrite por run.
- Modo livre com seleção manual de até 3 Protocolos.
- Atlas local de 3 interações descobertas, estatísticas, salvamento automático, seed e exportação/importação de replay JSON.
- Retry imediato e arte/áudio gerados localmente.

Polimento visual/sonoro com contraste de intensidade: tons suaves durante o planejamento; pequenas partículas levam a energia das peças ao núcleo nos acertos; ressonâncias múltiplas e cascatas recebem cores mais vivas, arcos e acordes ascendentes. Rupturas ganham uma breve celebração dourada. O laboratório mantém o tratamento suave mesmo nas cascatas. Todos os efeitos terminam e a máquina volta ao repouso, com no máximo 64 partículas/elementos ativos. Sem partículas em giros comuns, sem tremor de câmera e sem loop de animação ocioso. O áudio é opt-in, possui limite de volume e pode ser silenciado; movimento reduzido mantém o feedback textual e desativa as partículas e saltos. As regras e os replays não mudaram.

As Anomalias têm retratos vetoriais 2.5D próprios, com material de grafite facetado e núcleo emissivo: Needle é uma ponta com olhar direcional, Parasite tem um olho cercado por três garras e The Clamp tem duas mandíbulas. A postura anuncia um ataque iminente; impacto e ruptura têm reações curtas, sem animação ociosa contínua. Toque no retrato para consultar personalidade e contrajogo. O laboratório mostra um núcleo aberto, sem inimigo. Os vetores estão em `src/anomalies.js` e também são incorporados ao HTML standalone.

Esta versão não implementa Daily online, ranking, Forge, gamepad, metaprogressão completa, famílias sorteadas ou o modo BREAK completo. A mini-run é menor que a run final proposta no GDD. O objetivo é testar Phase Locks, contrajogo e identidade de build.

## Desenvolvimento e verificação

```sh
npm test
node tests/balance.cjs
npm run build
```

`npm run build` recompõe `ring-break-standalone.html`, uma cópia integral em um único arquivo. O site normal usa os arquivos separados para facilitar edição.

- `src/core.js`: estado determinístico, RNG seeded, regras e replay; sem dependência da interface.
- `src/game.js`: Canvas 2D, interação, animações, áudio Web Audio e persistência local.
- `src/style.css`: interface responsiva.
- `tests/core.test.cjs`: invariantes e regressões das regras.
- `tools/browser-verify.cjs`: verificação de toque, teclado e uma mini-run completa, para ambientes com Playwright e Chromium disponíveis.
- `docs/`: os 12 documentos do GDD original v0.3 e a nota de implementação deste protótipo.

Os testes automatizados verificam funcionamento; diversão e retenção ainda precisam de playtest humano. Dados ficam no navegador. Replay contém seed e decisões, sem informações pessoais.

## Histórico

O jogo anterior, Kaiju 2048, está preservado na branch `archive/kaiju-2048-2026-10-05`. A `main` contém apenas RING//BREAK. O histórico anterior também permanece no Git.
