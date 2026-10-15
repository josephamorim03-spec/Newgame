# Afluente — A aldeia e a despensa (proposta para a v3.1)

**O pedido:** recursos (água, madeira, comida, lã), estações com uma época difícil, sustentabilidade, a aldeia trabalhando sozinha por prioridades (nada de selecionar aldeões, como num RTS), transporte pelo rio ou por estrada e o orgulho de ver a aldeia avançar. Tudo leve, contemplativo, com o encaixe de peças como ação principal. Dois pedidos sobre o como: "pense mais" e "veja a melhor forma de aplicar com o que já temos".

Este documento propõe **a etapa 1** com regras e números. As etapas 2 e 3 ficam só esboçadas, para serem decididas depois do teste da etapa 1.

---

## 1. A ideia em uma frase

> **A aldeia vive do que está perto dela.** A colheita enche a despensa de comida e lenha. Na seca a aldeia gasta: come e se aquece nas noites de friagem. A mata que aquece a aldeia é a mesma que segura o rio.

Ninguém dá ordens a aldeões. Onde cada peça é encaixada é a administração toda, e há uma prioridade só para escolher: **proteger a mata do rio, ou não**.

---

## 2. O que já existe e o que vira

### 2.1 Sistemas do jogo

| Já existe | Hoje | Na aldeia |
|---|---|---|
| Vila (peças com lado de vila; a região cresce em casas, sobrados, venda e coreto) | enfeite e, desde a v3, produção | **as casas da aldeia**: cada peça com vila é uma casa que come e precisa de lenha |
| Lavoura e pasto irrigados (v3: só o que o rio vivo toca) | pontos de produção | **comida** na despensa |
| Mata (peça com lado de bosque) | encaixe, mata ciliar, produção +1 | **lenha**, e a mesma mata protege o rio na seca |
| Seca de 4 jogadas, com a colheita na chegada (v3) | colheita em pontos | **a época difícil**: a colheita enche a despensa e a aldeia gasta durante a seca |
| Friagem no motor do clima (`Atmos`): frente fria em cerca de 35% das secas, sorteada pela semente | só céu, vento e temperatura | **noite fria anunciada**: a aldeia gasta o dobro de lenha naquela seca. É o mesmo sorteio do céu, então o que se vê e a regra combinam |
| Veredas e afluentes (v2.4) | metas de rota | sem mudança; na etapa 3, o rio vira caminho |
| Missões com prazo | metas de região | sem mudança na etapa 1; na etapa 2, viram **encomendas da aldeia** |
| Pilha como vida | peças ganhas com missões, perfeitas, chuva e seca | um **ano farto** traz gente nova e, com ela, peças |
| Caderno do Cerrado e fauna | coleção | sem mudança |

### 2.2 Arte pronta (atlas com 81 modelos do Blender, bichos com esqueleto)

| Já desenhado | Uso na aldeia |
|---|---|
| casas de taipa, de telha (3 cores), sobrado, venda, coreto, igreja | os níveis da aldeia (seção 5) |
| chaminés com fumaça, janelas acesas à noite | **casa aquecida**: fumaça e janela acesa; casa sem lenha na friagem fica apagada |
| tronco caído (`log`), versões secas das árvores (`*_seco`) | **mata cortada**: menos árvores, tocos e lenha empilhada, até as chuvas |
| fardos de feno, celeiro, carro de boi, espantalho, horta, galinhas, poço | colheita e despensa à vista na vila: fardos e celeiro cheios no ano farto |
| gado curraleiro (agentes que pastam), ovelhas, cercado com cocho | etapa 2: o pasto vira comida (gado) ou lã (ovelhas) |
| moinho de vento (com física de vento), celeiro | etapa 2: melhorias da aldeia |
| cerca, poço, horta | detalhes de nível |

O que **falta** desenhar só aparece nas etapas 2 e 3: barco e cais, tear, estrada (há "caminho de terra" no chão da vila, que serve de base).

A outra sessão está preparando um visual em 3D (three.js). As regras abaixo vivem no motor (`function Engine`), que não depende do desenho, então valem para os dois visuais.

---

## 3. Etapa 1: as regras

### 3.1 O alcance da aldeia

**A aldeia colhe o que está a até 2 casas de alguma peça com vila.** O resto do vale continua produzindo pontos (v3), mas não enche a despensa.

Na tela, a área da aldeia aparece como um contorno suave quando a peça é escolhida. Assim, pôr o bosque perto da vila ou longe dela passa a importar.

### 3.2 A despensa: dois estoques e nenhum outro

| Estoque | Entra (na colheita, na chegada da seca) | Sai (durante a seca) |
|---|---|---|
| **Comida** | lavoura irrigada +2 e pasto irrigado +1, só no alcance | **2 por casa** |
| **Lenha** | mata no alcance, +1 por peça | **1 por casa**, ou **2 por casa** se há friagem anunciada |

- A água não é estoque: é o caminho do rio (v3).
- A lenha que sobra fica guardada. A comida que sobra perde metade de um ano para o outro, porque estraga. Assim guardar ajuda, mas não substitui produzir.

### 3.3 A prioridade: proteger a mata do rio

Há uma chave na ficha da despensa: **"Proteger a mata do rio"**, ligada por padrão.

- **Ligada.** A aldeia só corta mata que não está na beira do rio. Se a lenha não der, a aldeia passa frio.
- **Desligada.** A aldeia também corta a mata da beira do rio quando falta lenha. Essas peças ficam **cortadas até as chuvas**: perdem a mata ciliar, então o rio delas seca nesta seca e **a colheita cai** junto com ele.

A ordem do evento na chegada da seca é esta:

1. A aldeia junta a lenha, cortando conforme a chave.
2. A seca decide que rio corre. A mata cortada não protege.
3. A colheita conta o que tem água.

Então o custo de cortar a mata do rio aparece **no mesmo momento**, e não anos depois. A prévia, durante as Águas, mostra os dois lados: "lenha 7/9 · com o corte da beira: 9/9, mas a colheita cai 14 → 9".

### 3.4 O fim da seca: ano farto ou ano de aperto

Quando as chuvas voltam:

| Resultado | O que acontece |
|---|---|
| **Ano farto**: comida e lenha cobriram todas as casas | **+5 pontos por casa** e **+1 peça a cada 3 casas** (chega gente nova). As casas mostram fumaça e fardos, e conta para o nível da aldeia |
| **Ano de aperto**: faltou comida ou lenha | sem bônus. As casas sem lenha passaram a friagem apagadas, e a faixa diz quantas. **Nada é destruído** e ninguém morre: no ano seguinte tudo produz de novo |

A mata cortada rebrota nas chuvas e volta a proteger o rio.

### 3.5 O que muda nos pontos

- **Continua:** a jogada vale o encaixe e o quanto o vale passa a produzir (v3). É o retorno imediato.
- **Sai:** a colheita em pontos (v3). Agora ela enche a despensa, e o ano farto paga os pontos.
- **A conta da pilha:**
  - saem as 2 peças da seca;
  - entra +1 peça a cada 3 casas no ano farto;
  - a chuva continua com +2.
- **Peças por missão, perfeitas e afluentes:** sem mudança.

### 3.6 Os números vêm da simulação

Os bots da v3, em 20 vales, mostram como estaria a despensa na chegada de cada seca se a etapa 1 já existisse (`sim/revisao/despensa.js`):

| Ano | Casas | Comida no alcance (guloso / cuidadoso) | Comida necessária (2 por casa) | Mata no alcance | Dessa mata, na beira do rio | Lenha sem cortar a beira, contra a necessária (1 por casa) |
|---|---:|---|---:|---:|---:|---|
| 1 | 2,1 | 3,5 / 4,3 | 4,2 | 4,2 | 2,3 | 1,9 de 2,1 |
| 2 | 4,5 | 9,4 / 11,5 | 9,0 | 8,9 | 5,5 | 3,4 de 4,5 |
| 3 | 6,6 | 14,1 / 17,6 | 13,2 | 13,3 | 8,8 | 4,5 de 6,6 |
| 4 | 8,6 | 18,6 / 21,6 | 17,2 | 18,4 | 11,8 | 6,6 de 8,6 |

O que se lê:

- **Comida:** o guloso fica no limite (83% a 108%) e quem pensa na colheita fica com folga (100% a 130%). Irrigar perto da vila vira o jeito de não passar aperto.
- **Lenha:** mais da metade da mata perto das vilas, quase dois terços, está na beira do rio. Sem cortar a beira, a lenha cobre só 68% a 90% do que a aldeia pede, e menos ainda nas secas com friagem. Para atravessar a seca sem ferir o rio, é preciso **plantar mata perto da vila e longe do rio**. É o dilema de sustentabilidade que se pediu, e ele aparece sozinho no mapa de hoje: ninguém precisa inventar escassez.
- **A dificuldade cresce com a aldeia.** O ano 1 é fácil (2 casas). Do ano 2 em diante a lenha aperta, porque a aldeia cresce mais rápido que a mata no alcance. É a "época difícil" que fica mais dura quando se avança, como pedido no começo do projeto, mas pela geometria do vale e não por uma conta escondida.

Os números finais (2 de comida por casa, 1 de lenha, dobro na friagem, +5 por casa e +1 peça a cada 3) são o ponto de partida. Vão ser recalibrados com um bot que conheça a despensa, mirando três coisas:

- o guloso passa aperto em cerca de metade dos anos 2 em diante;
- quem planeja passa aperto em poucos;
- a duração continua até cerca de 150 jogadas para quem joga muito bem.

---

## 4. A interface da etapa 1

- **Uma ficha só no painel**, no lugar da ficha "Colheita" da v3: `🌾 14/13 · 🪵 6/9 · seca em 3`.
  - Com uma peça escolhida, vira previsão: `🌾 14→16/13`.
  - Fica em laranja quando falta, com a mesma regra visual do "rio vai secar".
  - Tocar abre a explicação e a chave **"Proteger a mata do rio"**, com o efeito dos dois lados.
- **Na barra do ano**: "Colheita e seca em 3 jogadas", e "❄ friagem" quando a seca que vem traz frente fria. O céu já mostra a friagem quando ela chega.
- **Na prévia da peça**: além de "+N · produção +M", o que entra na despensa: "🌾+2" na lavoura que entra no alcance, "🪵+1" na mata perto da vila.
- **Na chegada da seca**: a colheita conta peça a peça, como na v3, mas os números voam para a despensa. Depois, a lenha cortada sai das matas, e as cortadas mostram tocos.
- **Na volta das chuvas**: uma faixa só. "Ano farto! 7 casas alimentadas e aquecidas: +35 · +2 peças", ou "Ano de aperto: 3 casas passaram frio".
- **No vale**:
  - casas aquecidas com fumaça e janela acesa à noite; sem lenha na friagem, ficam apagadas;
  - fardos e celeiro cheios no ano farto;
  - a mata cortada rebrota com as chuvas.

  Tudo isso usa o que já está desenhado.

---

## 5. Etapa 2 (esboço): a aldeia avança

- **Níveis da aldeia**: Sítio → Arraial → Povoado → Vila, com 1, 3 e 6 anos fartos. A casa de cada nível já existe: taipa, telha, sobrado, venda com coreto e igreja.
- **A cada nível, a escolha de uma melhoria entre duas.** Ela entra na pilha como peça especial, como os pacotes do Islanders:

  | Melhoria | Efeito | Arte |
  |---|---|---|
  | Moinho | lavoura irrigada encostada nele +1 comida | moinho (pronto) |
  | Celeiro | a comida não estraga | celeiro (pronto) |
  | Cercado de ovelhas | pasto encostado na vila dá **lã** (terceiro estoque) | cercado e ovelhas (prontos) |
  | Tear | cada 2 de lã viram agasalho: −1 de lenha por casa na friagem | novo |
  | Curral | pasto irrigado +1 comida (o gado) | gado e cocho (prontos) |

- **Missões viram encomendas da aldeia**: "a aldeia pede 3 lavouras irrigadas no alcance", "lenha para a festa".
- **Orgulho**: o Caderno ganha a página "Sua aldeia", com o nível, as melhorias e a foto de cada vale.

## 6. Etapa 3 (esboço): rio ou estrada

| Caminho | Vantagem | Custo |
|---|---|---|
| **Rio** (barco e cais) | o alcance da aldeia segue o rio vivo ligado à vila (+2 casas ao longo dele); pesca: rio vivo encostado na vila +1 comida | na seca o rio baixa: o barco para onde o rio secou e a pesca cai à metade. É fácil no começo e cobra na seca |
| **Estrada** (carro de boi) | estende o alcance o ano inteiro | ocupa 1 boi: o curral rende 1 comida a menos |

Pede arte nova: barco, cais e estrada.

---

## 7. O que fica de fora, de propósito

- **Unidades, aldeões e rotas desenhadas.** A administração é o encaixe e uma chave.
- **Mais de três estoques.** Lã só entra na etapa 2.
- **Morte, fome que destrói, fim de jogo por falta.** O aperto só tira o bônus daquele ano.
- **Neve e rio congelado.** No Cerrado o "inverno" é a seca, e a friagem faz o papel do frio. Fica assim, a menos que se decida trocar o cenário.
- **Conta escondida.** Todo estoque tem previsão na tela antes da seca. Foi a falta disso que derrubou a v0.6.

---

## 8. O que testar quando a etapa 1 existir

| Pergunta | Sinal |
|---|---|
| A despensa é lida sem esforço? | A pessoa olha a ficha antes da seca e consegue dizer quanto falta |
| A escolha da mata do rio aparece? | A pessoa planta mata perto da vila de propósito, ou desliga a chave sabendo o custo |
| Fica pesado? | Comparar com a v3: tempo por jogada, e se a pessoa ainda contempla |
| O aperto frustra? | O que a pessoa sente no "ano de aperto": vontade de fazer melhor, ou de largar |
| Há orgulho? | A pessoa comenta a aldeia ("minha vila já tem sobrado") sem ser perguntada |

---

## 9. Quanto custa a etapa 1

- **Motor:**
  - o alcance da aldeia;
  - a despensa (2 estoques) e o corte da mata;
  - a friagem com o mesmo sorteio do `Atmos`;
  - o ano farto e o de aperto;
  - um bot que conheça a despensa, para os marcos;
  - um teste.

  São perto de 150 linhas.
- **Interface:** a ficha da despensa com a chave, a prévia com 🌾 e 🪵, as faixas e o contorno do alcance.
- **Visual, com a arte que já existe:**
  - casas aquecidas ou apagadas;
  - mata cortada com tocos;
  - fardos e celeiro cheios.
- **Lição nova**, "A aldeia e a seca": uma vila, uma mata perto e a chave.
