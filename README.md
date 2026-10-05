# Kaiju 2048

Um 2048 tático de missões curtas. Funda blocos numa arena 4×4 sob a mira de um Kaiju gigante, monte seu robô e descubra a melhor rota para cumprir uma meta numérica.

## Objetivo e turno

São sete fases, cada uma com Kaiju, abertura, limite e objetivo próprios: preservar 32 ou 64, manter uma quantidade exata de blocos ou alinhar uma sequência. O Kaiju observa de fora da grade; o robô ocupa uma casa e interrompe o deslize.

1. Leia o objetivo, a área anunciada de ataque e o valor da próxima peça.
2. Faça **um deslize válido** e, se quiser, **uma reação** de braço ou perna antes ou depois dele. Braços e pernas são escolhidos no briefing; uma reação exclui a outra.
3. Confira a consequência atualizada, desfaça à vontade antes de confirmar e confirme o ataque.
4. O ataque acontece; vitória e derrota são checadas. Só então a peça anunciada surge numa casa vazia, sem preview ou reserva de posição.

O robô perde PV se permanecer na área. A tentativa também acaba se o limite de turnos expirar ou a grade travar sem reação capaz de abri-la. Não há cartas, energia nem relíquias.

## Como jogar

No computador, abra `index.html` num navegador moderno. **No celular, não copie apenas o HTML**: o jogo precisa também dos scripts, estilos e artes. Alguns aplicativos de arquivos do telefone nem executam JavaScript local.

Para jogar no celular com o computador ligado:

1. Conecte celular e computador ao **mesmo Wi-Fi**.
2. No Windows, dê dois cliques em `jogar-no-celular.cmd` (ou execute `node mobile-server.js` nesta pasta).
3. Deixe a janela aberta e digite no Chrome/Safari do celular o endereço `http://...:8765/` mostrado nela. Se o firewall perguntar, permita **rede privada**.

No celular, use em retrato: deslize sobre a grade ou toque nas setas, escolha reação e toque nas casas destacadas. A página rola naturalmente até o painel do robô; não há controles fixos sobre a grade. O som pode ser desligado. O progresso fica neste navegador do celular e não é sincronizado com o computador. Se não abrir, confira se ambos estão na mesma rede, se o endereço exibido é o do Wi-Fi e se a rede não bloqueia comunicação entre dispositivos. Para jogar fora de casa ou com o computador desligado, será necessário publicar o site em uma hospedagem estática.

## Projeto

- `index.html` — jogo web, também adaptado para celular.
- `game-core.js` — regras, sete fases, habilidades e Kaijus, sem dependência do navegador.
- `game-ui.js` e `game.css` — interface, efeitos, controles e layout mobile.
- `jogar-no-celular.cmd` e `mobile-server.js` — acesso local pelo navegador do celular; servidor somente leitura, sem dependências.
- `assets/` — pixel art vetorial, ícones, cenário e áudio sintetizado por Web Audio.
- [`docs/17-campanha-tatica.md`](docs/17-campanha-tatica.md) — contrato canônico da campanha atual.
- `docs/` e `design/` — estudos e históricos; documentos anteriores ao 17 podem descrever protótipos substituídos.
- `tests/` — testes de regras; execute `node --test tests/*.test.js`.
