# Dice Duel

Um duelo de dados 1×1 aconchegante, para celular e navegador.

Os dois jogadores disputam a mesma Mesa de 5 dados e montam **correntes** de dados que se sincronizam:
- **Eco:** o mesmo número;
- **Passo:** um a mais ou a menos;
- **Oposto:** soma 7.

Cada um guarda um dado no **Bolso**, escolhe a hora de **disparar** a corrente para marcar pontos e leva um
**deck de até 3 cartas** com efeitos e armadilhas. A partida dura de 4 a 6 minutos.

> Esta branch (`DiceDuel`) guarda só o Dice Duel. A `main` do repositório continua com o design do LIMIAR,
> como manda a política de branches do projeto.

## Jogar

- **Direto:** abra `index.html` no navegador (funciona por `file://`, sem servidor).
- **Arquivo único, bom para mandar a quem testa ou abrir no celular:** `dist/dice-duel.html`.
- **Gerar o arquivo único de novo depois de mexer no código:** `python3 tools/empacotar.py`.

**Contra quem:**
- **Biscoito**, um gatinho, fácil;
- **Dona Coruja**, que lê a Mesa;
- **duas pessoas** no mesmo aparelho.

**Em Ajustes dá para ligar e desligar:**
- som e música, com volume;
- animações e brilhos;
- tremor e vibração;
- falas do rival e etiquetas de ajuda.

## O que tem aqui

| Caminho | O quê |
|---|---|
| `index.html` | a página do jogo |
| `css/estilo.css` | o visual aconchegante (mesa de madeira, feltro, fichas de papel) |
| `js/jogo.js` | regras, rivais, cartas, bons momentos, recordes, ajustes |
| `js/audio.js` | efeitos e trilha lo-fi sintetizados na hora (Web Audio, sem arquivos de áudio) |
| `js/efeitos.js` | partículas, dados voando, chamadas de "bom momento", contagem do placar |
| `sim/` | regras de referência em Python e os experimentos de balanceamento |
| `tools/empacotar.py` | gera o HTML único |
| `tools/fumaca.js` | teste de fumaça: joga partidas inteiras no navegador e falha com qualquer erro |
| `docs/design.md` | regras, cartas, números, decisões e por quê |
| `docs/pesquisa.md` | o que jogos de cartas no celular ensinam (deck pequeno, armadilhas, contra-jogo) |

## Verificar

```bash
cd sim && python3 valor_cartas.py      # valor de cada carta sozinha
cd sim && python3 informacao.py        # armadilhas: oculto × à mostra
cd sim && python3 decks.py             # todos os 133 decks: algum domina?
npm i -D playwright && node tools/fumaca.js   # 4 partidas no navegador (celular, computador, Coruja, a dois)
```

## Estado

**Protótipo v0.6, pronto para testes com gente.** O resumo copiável do fim da partida traz:
- o deck de cada um;
- as cartas que agiram;
- as rupturas;
- o uso do Bolso.

Os números do balanceamento estão em `docs/design.md` §2–4.
