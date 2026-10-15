# Som do Afluente (v2.0, "Vale que se escuta")

> **Um vale calmo, que se ouve de perto.** A música fica ao fundo; quem está em primeiro plano é a água, o vento e os bichos.

Tudo é sintetizado no navegador (Web Audio), sem arquivos de som. O código fica em `prototipo/afluente.html`, nas seções `som`, `MÚSICA` e `SONS DO VALE`.

## Mixagem

- Três barramentos: **música**, **sons do vale** e **efeitos**. Cada um tem seu volume e manda um pouco para um **reverb gerado**, de campo aberto (cauda de 2,6 s que vai escurecendo).
- No fim da cadeia há um filtro que tira a aspereza do agudo e um **compressor suave** que segura os picos.
- Todas as notas, da música e dos efeitos, saem da **mesma escala de Dó maior**. Por isso nada desafina entre si.
- O menu de pausa tem três opções: **Som** (tudo), **Música** e **Sons do vale**.

## Música generativa

- Um acorde por compasso, num pad macio, com um baixo discreto.
- Um **dedilhado em 3+3+2** (um balanço de baião, bem leve), tocado por um violão de nylon sintetizado (Karplus-Strong).
- Uma melodia que respira: frases de dois compassos, depois silêncio.
- O **humor** muda no começo de cada frase:

| Humor | Quando | Andamento | Timbre |
|---|---|---|---|
| dia | manhã e dia | 76 | violão, I–vi–IV–V |
| tarde | fim de tarde e luz dourada | 68 | violão, IV–iii–ii–I |
| noite | noite | 58 | kalimba, sem dedilhado |
| seca | estação seca | 64 | violão no modo dórico (ii–I) |
| chuva | chuva forte | 60 | kalimba e pad |

- **Quanto mais zoom, mais a música recua** (até cerca de 40% do volume), para o vale aparecer.

## Sons do vale: a escuta segue a câmera

- O **ouvido** fica no centro da tela, a uma altura que diminui com o zoom.
  - De longe, ouve-se o vale inteiro, abafado, com mais vento.
  - De perto, o que está no centro fica alto e nítido, com pouco eco.
- O que **sai da tela recua depressa**. Com zoom máximo num bicho, ele soa cerca de 5× mais alto que no enquadramento padrão. As peças do outro lado do vale ficam mudas.
- Cada fonte tem:
  - volume pela distância;
  - filtro pelo ar (o longe é mais grave);
  - lado no estéreo;
  - eco proporcional à distância.
- **Camadas contínuas**, que somam as peças perto do ouvido:
  - riacho (corpo, grave e bolhas uma a uma, mais claras de perto);
  - cachoeira;
  - vento (mais forte de longe, com rajadas, e com o lado que acompanha a direção do vento);
  - folhas nas matas e capim, que mexem com o vento;
  - chuva (chiado largo de longe; de perto, gotas no chão, "plics" na água e toques nos telhados);
  - cigarras na seca.
- **Vozes pontuais**, que nascem num lugar do mundo:
  - cada bicho da fauna canta de onde está, no seu horário:
    - seriema, tucano, joão-de-barro (dueto), garça, capivara, ema, martim-pescador, anta (assobio) e tamanduá;
    - lobo-guará e onça, mais à noite e de longe;
  - gado e ovelhas (num rebanho grande, cada um fala menos);
  - galinhas nas vilas;
  - passarinhos, sabiá e bem-te-vi nas matas;
  - grilos, coruja, sapo-ferreiro e rã à noite;
  - peixe que pula;
  - araras que passam voando.

## O vale reage

| Acontece | Som |
|---|---|
| Peça colocada | baque macio de terra e o "sabor" do terreno (folhas, água, madeira); os bichos por perto se assustam e chamam; um bando levanta da mata; o gado muge |
| A água chega a novas peças | borbulha peça a peça, na ordem em que a água corre; à noite ou na chuva, um sapo responde |
| Um bicho volta ao vale | a vinheta e, logo depois, o canto do próprio bicho, de onde ele apareceu |
| A chuva começa | às vezes, um trovão bem distante; os pássaros se calam e os sapos começam |
| A chuva para | por uns 35 s, os pássaros cantam muito mais e pinga água das árvores |
| A seca chega | cigarras; menos pássaros; sapos somem; o riacho baixa |
| 6 h | o galo canta na vila |
| 12 h e 18 h | o sino da igreja (meio-dia e Ave-Maria) |

## Para ajustar

- Equilíbrio entre os bichos: `VK`, um multiplicador por voz, medido pelo pico de cada uma sozinha no centro da tela.
- Horário, frequência, volume e alcance de cada bicho: `VOZ`.
- Humores da música: `MOODS`. Acordes: `CH`.
- Força do zoom e do foco na tela: `hearAt`.
