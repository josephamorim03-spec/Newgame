# 06 — Arte e Áudio (histórico)

> O escopo abaixo é do protótipo 0.3.0. O jogo atual mantém a direção pixel art, mas usa sete Kaijus e robô modular: [17 — Campanha tática](17-campanha-tatica.md).

## Direção da versão jogável

Pixel art limpa, silhuetas reconhecíveis, números dominantes e fundo industrial de baixo contraste. Seguir a paleta mestre e os princípios de escala/contraste de [`15-pixel-art-bible.md`](15-pixel-art-bible.md); elementos futuros descritos naquela bíblia não entram neste slice. O tabuleiro permanece o foco no desktop e no celular.

## Cor funcional

- ataque e dano: vermelho `#FF2020`, sempre combinados com linha/padrão e texto;
- Mech e casas de movimento: ciano `#4FE0E0`;
- Artilheiro: roxo `#6B2D8C`;
- blocos: cores por valor da paleta mestre, com número legível e contraste próprio;
- fundo: escuro e pouco detalhado atrás da grade.

Os efeitos essenciais são deslocamento curto, fusão, descarga, impacto, spawn e vitória/derrota. Partículas e tremor nunca escondem valores ou intenção; reduzir ou retirar movimento quando o sistema solicitar.

## Áudio

- Efeitos curtos sintetizados com Web Audio: deslize mecânico, fusão ascendente, passo, descarga, ataque, dano, spawn, vitória e derrota.
- Áudio só começa após interação do jogador; não depender de arquivos externos, rede ou autoplay.
- Controle de mudo visível e preferência preservada quando o navegador permitir.
- Camadas sonoras não devem mascarar o feedback da intenção nem interromper o uso no celular.
