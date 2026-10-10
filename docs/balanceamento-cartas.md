# Dice Duel: balanceamento das cartas e cartas novas

> Outubro de 2026. Números de `sim/` (robôs jogando entre si). Cada deck joga 1.200 partidas contra rivais
> sorteados, com ruído de ±1,4 ponto; os melhores decks foram jogados de novo com 6.000 partidas ("confirmado").
> Os robôs não blefam nem leem o rival: os números dizem a direção, não as casas decimais.

## 1. Resumo

- **O balanceamento atual está ok.** Nenhuma carta domina e nenhuma é inútil.
  - A vitória média dos decks com cada carta vai de **47,8% (Espelho) a 53,1% (Interferência)**.
  - O melhor deck confirmado faz **58,9%** (Ajuste + Âncora + Interferência).
- **O simulador estava um pouco atrás do jogo.** Cinco diferenças foram corrigidas (§2); nenhuma mudava o
  quadro geral.
- **Seis cartas novas fecham dentro da faixa das atuais:** Pausa, Reverso, Furto, Convite, Lacre e Ampulheta ⚡.
  - Com as 17 cartas, a média dos decks vai de 47,9% (Ampulheta) a 53,3% (Interferência).
  - O melhor deck com carta nova (Coringa + Pausa + Pressa) faz 59,3% confirmado, abaixo do melhor só com
    cartas antigas (60,1%).
- **Quatro ideias foram descartadas** (§6): Rede, Gêmeo, Convite "forte" e Pausa com disparo.
- **O dono escolheu 4 cartas: Lacre, Pausa, Furto e Reverso** (§9). Elas entram como estão, nas metas 12 e 16.
  - Na meta 16, o **Pedágio** (carta antiga) domina, com ou sem as novas.
  - Ajuste adotado na v0.11: o Pedágio dá **+2 em qualquer meta** (§10).

## 2. Simulador × jogo (`sim/deck.py` × `shared/regras.js`)

**Corrigidas em `sim/deck.py`:**

| Diferença | No simulador (antes) | No jogo |
|---|---|---|
| Coringa | gasto até no primeiro dado de uma corrente vazia | só é gasto num dado que entra numa corrente já começada |
| Pedágio leva os dois à meta | vencia sempre o jogador 0 | vence quem disparou |
| Sobrecarga num disparo de 3 | era gasta e dava +2 se ativada antes | não é gasta, continua ativa |
| Sobrecarga antes do 6.º dado | o robô só a usava na hora de disparar: o disparo automático de 6 perdia o +2 | pode ser usada antes de pegar |
| Espelho armado | o robô evitava o Bolso achando que podia ser o Fundo Falso | o Espelho é público: só um "?" pode ser o Fundo |
| Risco de segurar | ignorava o Coringa ativo no Bolso | o Coringa vale também para o dado do Bolso |

Juntas, as correções mexem na média de cada carta em até 1,2 ponto (Sobrecarga −1,2, Interferência −0,9,
Âncora +0,7), perto do ruído. O quadro geral não muda.

**Iguais ao jogo (conferidas):**
- Pressa: 2+ dados na Mesa, segundo dado opcional, disparo automático no meio e o segundo dado começa outra corrente;
- Espelho: o dado chega virado e não vai ao Bolso; Virar e Rerrolar apagam a marca, Ajuste não; pegar o próprio
  dado marcado perde a carta;
- Fundo Falso: na troca, caem os dois;
- Âncora e Interferência: só em correntes de 4+;
- Interferência + Sobrecarga: 2 + 2 − 1;
- quem está atrás abre a Mesa;
- o dado extra no Bolso só vale sem cartas.

**Fora do modelo (de propósito):**
- **Blefe:** um efeito virado como falsa armadilha.
  - O robô do simulador só "lê" o rival num ponto: evita o Bolso quando um "?" pode ser o Fundo Falso.
  - Um blefe só serviria para assustar esse robô, e custaria o lugar da armadilha. Medir o blefe exige gente
    (o resumo copiável já conta os blefes).
- **Cartas entre os dois dados da Pressa:** o jogo deixa; o robô usa tudo antes do primeiro dado.
- **Espelho com 2 dados na Mesa:** o jogo deixa; o robô só arma com 3+.
- **A Diana:** usa cartas ao acaso em 20% das vezes. O simulador só tem o robô "esperto" (o da Dona Coruja).

Ganchos novos em `deck.py`: `efeito()`, `romper()`, `passa()` e `decidir()`. A mesma semente dá o mesmo resultado
de antes. Os scripts usam no máximo 4 processos (`PROCS`), e `decks.py` aceita `CONFIRMA=6000` e `NOVAS=...`.

## 3. Estado atual (11 cartas, 133 decks)

| | docs/design.md | Agora |
|---|---|---|
| Melhor deck | 59,7% (Âncora + Coringa + Interferência); depois 60,3% | 60,3% com 1.200 partidas; **58,9% confirmado** (Ajuste + Âncora + Interferência) |
| Decks acima de 58% | 4 (depois 3) | 6 com 1.200 partidas; confirmados: 2 (58,9% e 58,4%), mais 1 em 57,9% |
| Média dos decks por carta | 47,8% (Espelho) a 53,3% (Interferência) | 47,8% (Espelho) a 53,1% (Interferência) |
| Faixa dos decks | — | 39,3% a 60,3% (desvio de 4,3 pontos) |
| Cartas nos 25 melhores | as 11 | as 11 (Espelho, Sobrecarga e Virar com 2 cada) |

**Quatro respostas:**
- **Alguma carta domina?** Não. A Interferência é a mais forte (53,1% de média, em 6 dos 13 melhores decks), mas
  fica a 0,9 ponto da Pressa.
- **Alguma é inútil?** Não. Espelho, Virar e Rerrolar são as mais fracas (~48%), como o design já registra.
- **Os piores decks** (39–42%) juntam dois efeitos de conserto, como Ajuste + Rerrolar + Virar.
  - Não é bug: contra o campo, o deck vazio vence 29% e cada carta soma de 3 a 7 pontos.
  - Esses decks só têm cartas que somam pouco.
- **Algum deck passa de 58%?** Dois, por pouco, e todos só com cartas grátis.

**Cada carta sozinha** (deck de 1 carta contra deck vazio, 16.000 partidas):

| Carta | Agora | No design |
|---|---|---|
| Pedágio | 61,3% | — |
| Interferência | 60,2% | 59,0% |
| Sobrecarga | 59,0% | — |
| Pressa | 58,4% | 58,1% |
| Âncora | 57,8% | 58,9% |
| Coringa | 56,3% | 56,3% |
| Ajuste | 56,2% | 56,6% |
| Rerrolar | 55,8% | 55,1% |
| Virar | 53,8% | 54,1% |
| Fundo Falso | 53,8% | 54,5% |
| Espelho | 53,2% | 53,7% |

## 4. As 17 cartas (as 11 do jogo + as 6 aprovadas)

As colunas:
- **Sozinha:** deck de 1 carta contra deck vazio (50% = neutra);
- **Média:** vitória média dos decks com a carta, com as 17 cartas (576 decks); entre parênteses, só com as 11;
- **Top 10%:** a fração dos decks com a carta que ficam entre os 58 melhores;
- **Melhor deck:** o melhor deck com a carta (1.200 partidas).

| Carta | Tipo | Sozinha | Média | Top 10% | Melhor deck |
|---|---|---|---|---|---|
| Interferência ⚡ | armadilha | 60,2% | 53,3% (53,1%) | 24% | 59,3% |
| Pressa | efeito | 58,4% | 51,7% (52,2%) | 16% | 61,5% |
| Coringa | efeito | 56,3% | 51,4% (50,3%) | 21% | 61,5% |
| Âncora | armadilha | 57,8% | 51,3% (51,5%) | 19% | 59,8% |
| Pedágio ⚡ | armadilha | 61,3% | 51,2% (51,2%) | 10% | 57,9% |
| Ajuste | efeito | 56,2% | 51,0% (49,9%) | 19% | 60,3% |
| Sobrecarga ⚡ | efeito | 59,0% | 51,0% (49,6%) | 6% | 57,8% |
| **Lacre** (nova) | armadilha | 50,1%\* | 50,2% | 10% | 58,0% |
| **Pausa** (nova) | efeito | 53,8% | 49,8% | 10% | 61,5% (59,3% confirmado) |
| Fundo Falso | armadilha | 53,8% | 49,6% (49,3%) | 9% | 59,0% |
| **Furto** (nova) | efeito | 56,1% | 48,9% | 2% | 56,9% |
| Virar | efeito | 53,8% | 48,9% (47,9%) | 5% | 58,3% |
| Rerrolar | efeito | 55,8% | 48,6% (47,9%) | 5% | 56,8% |
| **Convite** (nova) | efeito | 56,5% | 48,3% | 5% | 57,3% |
| **Reverso** (nova) | efeito | 53,3% | 48,2% | 3% | 56,2% |
| Espelho | armadilha | 53,2% | 48,0% (47,8%) | 1% | 55,7% |
| **Ampulheta ⚡** (nova) | armadilha | 56,7% | 47,9% | 11% | 59,0% (53,4% confirmado) |

\* O Lacre só age contra efeitos: contra um deck vazio não faz nada. Contra o campo, ele age em 91% das partidas
em que está no deck.

**Com as 17 cartas:**
- A faixa dos decks vai de 38,8% a 61,5%.
- 11 dos 576 decks passam de 58% com 1.200 partidas, uma fração menor que hoje (6 de 133).
- Confirmados:

| Deck | Vitória |
|---|---|
| Âncora + Coringa + Pressa | 60,1% |
| Coringa + Pausa + Pressa | 59,3% |
| Ajuste + Âncora + Coringa | 59,3% |
| Ajuste + Coringa + Pausa | 59,0% |
| Âncora + Coringa + Interferência | 58,8% |

**O efeito sobre as cartas antigas:**
- A média de cada uma varia de −0,5 (Pressa) a +1,6 ponto (Sobrecarga). A maioria sobe, porque as novas são, em
  média, um pouco mais fracas e deixam o campo mais fácil.
- Nenhuma antiga fica inútil. Pressa e Interferência perdem lugares no topo para a Pausa e a Ampulheta.

**Sem pagar para vencer:**
- O melhor deck só com cartas grátis confirma 60,1%; o melhor com uma carta nova, 59,3%.
- Só 2 dos 443 decks com carta nova passam do melhor grátis por mais de 1 ponto, dentro do ruído.

**Anti-sinergia a observar:** os piores decks do conjunto (38,8–39,9%) juntam Pausa e Ampulheta. As duas
recompensam estilos opostos: a Pausa segurar mais, a Ampulheta ficar à frente. O pior deck de hoje faz 39,3%.

## 5. As seis cartas novas aprovadas

Regras gerais:
- Todas valem uma vez por partida e podem ser "viradas" como blefe, se forem efeito (regra atual).
- Lacre e Ampulheta são armadilhas que geram "?". Com elas, o "?" passa a esconder também "não use efeito" e
  "não segure", e o blefe ganha espaço.
- Sugestão para `ORDEM`: `..., 'sobrecarga', 'pausa', 'reverso', 'furto', 'convite', 'espelho', 'fundo', 'ancora',
  'lacre', 'interferencia', 'pedagio', 'ampulheta'`.

### 5.1 Pausa

| | |
|---|---|
| Id e tipo | `pausa`: efeito, sem `alvo`, sem `pontos` |
| Verbo | `passa a vez` |
| Texto | Nesta vez você não pega dado nem dispara: a vez passa ao rival, e a sua corrente e o seu Bolso ficam como estão. Não vale no segundo dado da Pressa. |
| Preço | 130 |

**Regra:**
```
podeUsar(pausa): fase 'pegar' && mesa.length >= 1
                 && !j.segundoDado   // "No 2.º dado da Pressa, use Dispensar"
                 && !j.extra[p]      // "A Pressa já está valendo nesta vez"
usarCarta(pausa): (depois do Lacre, §5.5) cartas[p].pausa = 'usada'
                  registrar 'usou Pausa: passou a vez'; emitir carta
                  se cor[p].length >= 3: checarAmpulheta(j, p)   // terminar a vez com 3+ sem disparar (§5.6)
                  se não acabou: proximo(j)
aplicar {tipo:'carta', carta:'pausa'} devolve 'proximo' (ou 'fim'), não 'carta'
```

**Interações:**
- **Espelho:** a marca fica na Mesa.
- **Âncora, Coringa:** nada muda, os dois continuam armado ou ativo.
- **Fundo Falso:** não age (ninguém guardou).
- **Convite:** pode ser usada mesmo convidado; o convite espera a próxima vez em que ele pegar um dado.
- **Pressa:** não combina (veja `podeUsar`).
- **Ampulheta do rival:** terminar a vez com corrente de 3+ conta como segurar.
- **Blefe:** pode ser virada.

**Por que sem disparo:** com "não pega, mas pode disparar", a carta virava um disparo seguro. O robô que a joga com
coragem (segura mais, sabendo que tem a Pausa) chegava a 52,4% de média, a 2.ª melhor carta do jogo.

**Robô:**
- Usa quando a corrente tem 2+ e qualquer dado a romperia (nada entra, o Bolso não salva).
- Usa também para deixar ao rival o último dado da Mesa quando ele romperia a corrente de 3+ dele.
- Com a Pausa na mão, segura correntes com metade do risco.

### 5.2 Reverso

| | |
|---|---|
| Id e tipo | `reverso`: efeito, sem `alvo`, sem `pontos` |
| Verbo | `inverte a corrente` |
| Texto | Inverta a sua corrente: o primeiro dado vira a frente e ela passa a crescer por essa ponta. Os dados e os pontos não mudam. Precisa de 2 dados na corrente. |
| Preço | 90 |

**Regra:**
```
podeUsar(reverso): fase 'pegar' && cor[p].length >= 2   // "Precisa de 2 dados na corrente"
usarCarta(reverso): cor[p].reverse()
                    registrar `usou Reverso: a frente agora é ${frente(cor[p])}`; emitir carta {frente}
```

**Interações:**
- **Coringa ativo:** continua ativo e é gasto no próximo dado que entrar.
- **Âncora:** continua protegendo a corrente (agora pela outra ponta).
- **Harmonia:** a relação entre dois dados não depende da ordem, então não muda.
- **Pressa:** pode ser usada entre os dois dados (fase 'pegar').
- **Espelho, Fundo Falso:** nada.
- **Blefe:** pode ser virada.

**Robô:** usa quando nada da Mesa entra pela frente, mas algo (ou o dado do Bolso) entra pela outra ponta. Usar
também quando a outra ponta tem 2 dados a mais servindo não mudou nada (48,1%).

### 5.3 Furto

| | |
|---|---|
| Id e tipo | `furto`: efeito, sem `alvo`, sem `pontos` |
| Verbo | `troca os Bolsos` |
| Texto | Troque o dado do seu Bolso com o do Bolso do rival (vazio também vale: o dado só muda de lado). Não conta como guardar: o Fundo Falso não pega. |
| Preço | 100 |

**Regra:**
```
podeUsar(furto): fase 'pegar' && (bolso[0] !== null || bolso[1] !== null)   // "Os dois Bolsos estão vazios"
usarCarta(furto): [bolso[p], bolso[1-p]] = [bolso[1-p], bolso[p]]
                  registrar `usou Furto: trocou o ${a ?? 'Bolso vazio'} pelo ${b ?? 'Bolso vazio'} do rival`
                  emitir carta; emitir 'bolso' {p}; emitir 'bolso' {p: 1-p}
```

**Interações:**
- **Fundo Falso:** não dispara (não passa por `colocar`).
- **Âncora, Espelho:** nada.
- **Coringa:** o dado que chega vale com o Coringa se ele estiver ativo, como qualquer dado do Bolso.
- **Pressa:** pode ser usada entre os dois dados.
- **Blefe:** pode ser virada.

**Robô:** usa quando a sua corrente de 3+ fica sem garantia e o dado do rival a salva. Usa também quando o dado do
Bolso do rival é o que segura a corrente de 3+ dele (e o seu não serve a ela).

### 5.4 Convite

| | |
|---|---|
| Id e tipo | `convite`: efeito, `alvo: true`, sem `pontos` |
| Verbo | `o rival pega este` |
| Texto | Escolha um dado da Mesa: na próxima vez em que pegar um dado, o rival tem de pegar esse. Se ele romperia a corrente dele, pode ir para o Bolso cheio, e o dado de lá sai do jogo. |
| Preço | 110 |

**Regra:**
```
estado: j.convite = null | {dono, id}; j.convidado = false   (criarPartida; rolarMesa zera j.convite;
        visaoDe troca o dono com ip(); o convite é público)
podeUsar(convite): fase 'pegar' && mesa.length >= 2 && !j.convite
                   && mesa[idx] sem marca de Espelho   // "Convite e Espelho não dividem dado"
podeUsar(espelho): idx não pode ser o dado com convite
usarCarta(convite): j.convite = {dono: p, id: mesa[idx].id}
                    registrar `convidou ${rival} a pegar o ${v}`; emitir carta {id}
idxConvite(j, p) = j.convite && j.convite.dono !== p ? mesa.findIndex(d => d.id === j.convite.id) : -1
aplicar 'pegar': k = idxConvite(j, p); se k >= 0 e acao.idx !== k → erro 'Você foi convidado: pegue o dado com o convite'
                 (a Pausa continua valendo; na Pressa, o convidado é o 1.º dado)
tirar(): se j.convite e d.id === j.convite.id: j.convidado = (j.convite.dono !== p); j.convite = null
         (se o próprio dono pegar o dado, o convite se perde)
destinos(j, p, v): ... se ds vazio e j.convidado e j.vez === p e bolso[p] !== null: ds.push('descartar')
         (Bolso vazio: 'guardar' já existe; destinosDoDado/destinosValidos usam a mesma regra para o dado convidado)
colocar(): j.convidado = false no começo
           modo 'descartar': se armada[1-p] === 'fundo': bolso[p] = null; revelar fundo (caem os dois)
                             senão: sai = bolso[p]; bolso[p] = v; registrar `guardou o ${v} convidado; o ${sai} saiu do jogo`
```

**Interações:**
- **Espelho:** nunca no mesmo dado (as duas checagens acima), o que evita a ruptura forçada sem saída.
- **Virar, Ajuste, Rerrolar:** podem mudar o dado convidado. O convite segue o dado (pelo `id`), e é a defesa do
  rival.
- **Coringa:** se o rival tem o Coringa ativo, o dado entra.
- **Âncora:** se o rival tem a Âncora armada e corrente de 4+, ele pode pôr o dado na corrente e a Âncora o
  descarta.
- **Fundo Falso:** o "descartar" conta como guardar.
- **Pausa:** adia o convite.
- **Blefe:** pode ser virada.

**Robô:** usa quando o rival tem corrente de 3+ e há um dado (que não seja o que vai pegar) sem destino seguro para
ele. Convidado, conserta o dado com Virar, Ajuste, Coringa ou Rerrolar, ou usa a Pausa.

### 5.5 Lacre

| | |
|---|---|
| Id e tipo | `lacre`: armadilha, sem `alvo`, sem `pontos` |
| Verbo | `anula o próximo efeito` |
| Texto | O próximo efeito que o rival usar não funciona: a carta dele é gasta sem agir. Vale também para um blefe desvirado e para a Sobrecarga. |
| Preço | 140 |

**Regra:**
```
usarCarta(j, p, c): depois de tratar o blefe (desvirar) e antes de aplicar o efeito:
  se CARTAS[c].tipo === 'efeito' && armada[1-p] === 'lacre':
      cartas[p][c] = 'usada'; stats[p].cartas.push(nome)
      revelar(j, 1-p, 'lacre', `o ${nome} de ${n[p]} não funcionou.`)
      return   // nada do efeito acontece: Pressa sem extra, Sobrecarga sem j.sobre, Pausa sem passar a vez
```

**Interações:**
- **Armadilhas:** não pega armadilhas (Espelho, Fundo Falso, Âncora...).
- **Blefe:** entra em `armadilhasOcultas` (gera "?"), então permite blefar. O rival desvirar um blefe também é
  "usar um efeito".
- **Sobrecarga:** usada na hora de disparar e lacrada, o disparo sai sem o +2.
- **Coringa, Pressa, Pausa:** lacrados, o rival segue a vez normalmente.

**Robô:** arma cedo, quando o rival ainda tem efeito na mão.

**Leitura de mesa:** com o Lacre possível, gastar um efeito com um "?" armado vira uma decisão. É o tipo de yomi
que o blefe procura.

### 5.6 Ampulheta ⚡

| | |
|---|---|
| Id e tipo | `ampulheta`: armadilha, sem `alvo`, `pontos: true` |
| Verbo | `+3 se ele segurar` |
| Texto | Na próxima vez que o rival terminar a vez com corrente de 3 ou mais sem disparar, você ganha 3 pontos. Se ele disparar, ela continua armada. |
| Preço | 120 |

**Regra:**
```
checarAmpulheta(j, p):   // p acabou de terminar a vez sem disparar
  se cor[p].length >= 3 && armada[1-p] === 'ampulheta':
      de = pts[1-p]; pts[1-p] += 3
      revelar(j, 1-p, 'ampulheta', `${n[1-p]} ganhou 3 pontos: ${n[p]} segurou a corrente de ${L}.`)
      emitir 'placar' {p: 1-p, de}
      se pts[1-p] >= meta: terminar(j, 1-p); return 'fim'
segurar(j, p): se checarAmpulheta(j, p) === 'fim': return 'fim'; (o resto igual)
Pausa: chama checarAmpulheta (§5.1). O disparo (inclusive o automático de 6) não a gasta.
```

**Interações:**
- **Interferência:** não podem estar juntas (1 carta ⚡). Por isso o "?" de um deck nunca obriga a escolher entre
  "não dispare 4+" e "não segure".
- **Âncora do rival:** não muda nada.
- **Pausa:** com 3+, conta como segurar.
- **Blefe:** gera "?".

**Números:**

| Pontos | Média dos decks | No topo |
|---|---|---|
| +2 | 46,7% | — |
| +3 | 47,9% | 11% dos decks no top 10% |
| +4 | 56,9% | 15 dos 25 melhores; deck de 67% |

O salto de +3 para +4 é grande (um terço da meta 12). Ficou +3.

**Robô:** arma quando o rival tem corrente de 2+.

## 6. Descartadas

| Ideia | Por quê |
|---|---|
| **Rede ⚡**: na próxima ruptura do rival, você ganha pontos | Com corrente de 3+ e +3, agiu em 9% das partidas (41,9% de média). Com qualquer ruptura e +4, fica 47,6% contra o campo, mas 61,4% contra deck vazio: vale pelos erros do rival, então pune quem está aprendendo, e a vitória vira sorte de quando ele rompe. |
| **Gêmeo** (cópia de um dado da Mesa na Mesa) | Neutra: 49,8% sozinha e 45,5% de média. A cópia ajuda os dois. |
| **Gêmeo** (cópia de um dado da Mesa no seu Bolso) | Fecha (48,7%), mas faz quase o mesmo que o Furto, com texto mais longo. Fica de reserva. |
| **Convite forte** (o rival pega e, se romper, rompe) | Domina: 54,4% de média, em 19 dos 25 melhores, deck de 63,6%. A versão suave (o dado pode ir ao Bolso cheio) ficou. |
| **Pausa com disparo** | 52,4% de média com o robô corajoso, deck de 62,3%. A versão sem disparo ficou. |

## 7. Preço na loja

Hoje: Rerrolar 90 · Espelho 110 · Sobrecarga 120 · Fundo Falso 140 · Pedágio 140 (total 600).

**Sugestão:** Reverso 90 · Furto 100 · Convite 110 · Ampulheta 120 · Pausa 130 · Lacre 140 (total 690).
- A ordem segue a força medida e a complexidade: as armadilhas e a Pausa no topo.
- Todas à venda; nenhuma entra em `GRATIS`. O melhor deck grátis continua sendo o melhor do jogo (§4).
- As 5 cartas à venda de hoje saem em ~25 vitórias contra a Coruja; com as 6 novas, em ~54.
  - Se pesar, lançar as novas em duas levas (Pausa, Reverso e Furto primeiro).
  - Ou baixar as três mais simples para 60–80.

## 8. Reproduzir

```
python3 sim/decks.py                       # as 11 cartas (CONFIRMA=6000 confirma os 8 melhores; CONFIRMA_N=10)
NOVAS=lacre,pausa,furto,reverso META=16 JSON=/tmp/e16.json python3 sim/decks.py   # as 4 escolhidas, meta 16
python3 sim/escolhidas.py pares|coruja|descuidado /tmp/e16.json          # pares, Dona Coruja, robô descuidado
BAL='{"pedagio": 3}' ...                  # o Pedágio antigo (+3), para comparar (§10)
python3 sim/valor_cartas.py                # cada carta sozinha
NOVAS=pausa,reverso,furto,convite,lacre,ampulheta python3 sim/decks.py
NOVAS=ampulheta BALN='{"ampulheta": 4}' python3 sim/decks.py   # outro número
```

Tudo usa no máximo 4 processos (`PROCS=4`). As regras novas e os robôs delas estão em `sim/novas.py`.

**O que medir com gente:**
- se o Lacre deixa as pessoas com medo de usar efeitos (o robô não tem medo);
- se a Ampulheta faz disparar de 3 cedo demais;
- se o Convite é lido como "pegadinha" ou como jogada.

## 9. As 4 cartas escolhidas (meta 16 e 12)

Lacre, Pausa, Furto e Reverso entram com as regras e os números de §5; nada mudou nelas. O conjunto tem 15 cartas e
402 decks válidos. A Mesa é sempre de 5 dados, como no jogo (`NA_MESA = 5`).

### Os decks

| | Meta 16 | Meta 12 |
|---|---|---|
| Faixa dos decks | 42,5% a 64,2% | 39,8% a 60,9% |
| Acima de 58% (1.200 partidas) | 26 de 402 | 11 de 402 |
| Média por carta | 48,1% (Interferência) a **56,7% (Pedágio)** | 47,8% (Espelho) a 54,1% (Interferência) |
| Novas | Lacre 50,2 · Furto 49,5 · Reverso 48,9 · Pausa 48,7 | Pausa 50,2 · Lacre 49,9 · Reverso 48,5 · Furto 48,4 |
| Top 25 | **Pedágio 24**; Ajuste 9, Coringa 9, Lacre 6, Furto 4, Reverso 3, Pausa 1 | Interferência 15, Pressa 15, Ajuste 10, Pausa 6, Lacre 3, Furto 1, Reverso 0 |

**Confirmados com 6.000 partidas, meta 16** (todos têm Pedágio):

| Deck | Vitória |
|---|---|
| Coringa + Lacre + Pedágio | 61,9% |
| Ajuste + Fundo Falso + Pedágio | 61,9% |
| Coringa + Pedágio + Pressa | 60,6% |
| Fundo Falso + Furto + Pedágio | 60,0% |
| Furto + Lacre + Pedágio | 59,9% |
| Fundo Falso + Pedágio + Pressa | 59,5% |
| Ajuste + Furto + Pedágio | 59,1% |
| Coringa + Furto + Pedágio | 58,2% |
| Ajuste + Pedágio + Reverso | 58,1% |
| Ajuste + Pedágio + Rerrolar | 57,2% |

**Confirmados com 6.000 partidas, meta 12:**

| Deck | Vitória |
|---|---|
| Âncora + Coringa + Interferência | 59,9% |
| Ajuste + Âncora + Coringa | 59,4% |
| Ajuste + Âncora + Interferência | 59,2% |
| Coringa + Interferência + Pressa | 59,1% |
| Coringa + Pausa + Pressa | 58,5% |
| Âncora + Interferência + Pressa | 58,4% |
| Ajuste + Interferência + Pressa | 58,0% |
| Ajuste + Coringa + Pausa | 57,9% |
| Interferência + Lacre + Pressa | 56,7% |
| Ajuste + Pausa + Pressa | 56,7% |

**O Pedágio na meta 16 já dominava antes das cartas novas.** Só com as 11 cartas, na meta 16:
- média de 57,1% e 23 dos 25 melhores decks;
- Ajuste + Pedágio + Pressa confirma 60,8%;
- sozinho contra deck vazio, ele vence 64,5% (61,3% na meta 12), enquanto quase todas as outras cartas perdem
  força numa partida mais longa.

Os pontos andam em degraus (1, 2, 4, 6). Na meta 16, os +3 costumam poupar um disparo inteiro, coisa que na
meta 12 acontece menos. As cartas novas só o acompanham: Lacre + Pedágio dá +1,5 ponto de sinergia, e Furto +
Pedágio, +1,1.

### Pares

A sinergia de um par é a média real dos decks com as duas cartas menos o que um modelo aditivo (deck = soma das
cartas) prevê. Cada par aparece em 8 a 13 decks, com ruído de ~±0,5 ponto.

| | Meta 16 | Meta 12 |
|---|---|---|
| Mais fortes | Fundo Falso + Pedágio +1,8 · Pressa + Sobrecarga +1,8 · Pausa + Rerrolar +1,7 · Ajuste + Pausa +1,6 · Lacre + Pedágio +1,5 · Pausa + Virar +1,5 · Coringa + Pausa +1,4 · Âncora + Pausa +1,3 · Pedágio + Rerrolar +1,2 · Furto + Pedágio +1,1 | Ajuste + Pausa +2,3 · Coringa + Pausa +2,1 · Ajuste + Âncora +2,0 · Pausa + Reverso +1,9 · Espelho + Pedágio +1,9 · Pausa + Rerrolar +1,8 · Âncora + Coringa +1,7 · Interferência + Pressa +1,5 · Espelho + Lacre +1,5 · Âncora + Reverso +1,5 |
| Mais fracas | Pausa + Pedágio −5,7 · Pausa + Sobrecarga −3,1 · Âncora + Sobrecarga −3,0 · Fundo Falso + Lacre −1,7 · Âncora + Lacre −1,4 | Âncora + Pedágio −4,3 · Pausa + Pedágio −4,2 · Âncora + Sobrecarga −3,5 · Fundo Falso + Lacre −2,4 · Espelho + Pausa −1,8 |

**O que os pares mostram:**
- **Nenhuma sinergia passa de +2,3 pontos.** As mais fortes com carta nova são a Pausa com os efeitos de conserto
  (Ajuste, Coringa, Rerrolar): a Pausa segura a corrente e o conserto a salva depois. As antigas fazem o mesmo
  (Ajuste + Âncora +2,0).
- **Pausa + carta ⚡ é a pior combinação** (com Pedágio −4 a −6, com Sobrecarga −3).
  - Em parte é o estilo do robô: com a Pausa ele segura mais. Jogando com cuidado, Coringa + Pausa + Pedágio
    sobe 1,7 ponto.
  - Um deck ruim é escolha do jogador, não algo roubado.
- **Trios acima de ~60% confirmados:** nenhum na meta 12 (o melhor com carta nova, Coringa + Pausa + Pressa,
  faz 58,5%). Na meta 16, quatro decks passam, todos por causa do Pedágio.

### Situação real de jogo

**Contra a Dona Coruja** (deck sorteado de `DECKS_CORUJA`, como em `js/jogo.js`; 6.000 partidas por deck):

| Meta | Resultados |
|---|---|
| 12 | Os melhores decks fazem 54,8% (Ajuste + Interferência + Pressa) e 54,4% (Interferência + Lacre + Pressa). Os decks com Pausa ficam entre 46,5% e 49,1%, porque 5 dos 9 decks dela têm Interferência ou Pedágio, que punem quem segura. |
| 16 | Coringa + Lacre + Pedágio faz 61,2%, Furto + Lacre + Pedágio 59,9% e Coringa + Pedágio + Pressa 59,9%: de novo, o Pedágio. |

**Contra quem está aprendendo:** um robô "descuidado" escolhe dado e destino ao acaso em 30% das vezes e usa um
deck sorteado. Para cada carta, a tabela mostra quanto a média dos decks com ela sobe contra ele, em relação ao
robô esperto.

| Carta | Meta 16 | Meta 12 |
|---|---|---|
| Pausa | +19,0 | +15,9 |
| Reverso | +18,5 | +15,7 |
| Lacre | +18,2 | +15,6 |
| Furto | +17,9 | +16,7 |
| Antigas (da menor à maior) | +16,2 (Pedágio) a +19,6 (Interferência) | +15,2 (Pressa) a +16,6 (Âncora, Espelho) |

Nenhuma carta nova pune mais quem está aprendendo do que as antigas: todas ficam dentro da faixa delas. Contra o
descuidado, o deck médio vence 68% na meta 16 e 66% na meta 12.

### Veredito e ajuste

- **As 4 cartas entram como estão.**
  - Médias de 48,4–50,2%, no meio da faixa das antigas.
  - Não puxam nenhum deck acima do que já existia, e nenhuma pune quem está aprendendo.
- **Ajuste mínimo, na carta antiga: Pedágio +2 na meta 16** (+3 na meta 12, como hoje). Medido na meta 16 com as
  15 cartas:
  - o Pedágio cai para 50,1% de média, com 8 dos 25 melhores decks;
  - a faixa dos decks fica entre 42,4% e 58,7%, e só 2 decks passam de 58%;
  - o melhor confirmado é Ajuste + Coringa + Pausa, com 58,5%; Coringa + Lacre + Pedágio cai para 55,2%;
  - contra a Dona Coruja, o melhor deck faz 56,8%.
- **Por que não +2 nas duas metas:** com +2 na meta 12, a Interferência passa a dominar (55,4% de média; Âncora +
  Coringa + Interferência confirma 61,6%).
- **Por que não "metade do disparo":** na meta 16, o Pedágio seguiria com 56,5% de média.
- **No motor:** `j.pts[1 - p] += j.meta >= 16 ? 2 : 3` em `disparar`.
  - Texto: «No próximo disparo do rival, de qualquer tamanho, você ganha 3 pontos (2 na meta 16). Se os dois
    passarem da meta, vence quem disparou.»
  - O verbo pode ser «+3 quando ele dispara» na meta 12 e «+2 quando ele dispara» na 16.
  - No simulador: `BAL['pedagio'] = BAL['pedagio16'] = 2`, igual ao jogo (v0.11, §10).

## 10. Pedágio +2 em qualquer meta (v0.11)

Pedido do dono: o Pedágio parecia roubado (+3 é um quarto da meta 12). Medido com as 15 cartas e Mesa de 5:

| | Meta 12, +3 | Meta 12, +2 | Meta 16, +3 | Meta 16, +2 |
|---|---|---|---|---|
| Pedágio sozinho contra deck vazio (16 mil partidas) | **61,3%** (a carta mais forte) | 57,3% | 64,5% | — |
| Decks com Pedágio contra o campo (`sim/pedagio.py`) | 50,4% | 49,1% | 56,5% | 50,6% |
| Média dos decks com Pedágio (402 decks) | 50,8% | 49,4% | 56,7% | 50,1% |
| O Pedágio entrega a vitória direto ao dono | 1,0% das partidas | 0,8% | 0,7% | 0,2% |
| Os dois passam da meta no mesmo disparo (vence quem disparou) | 1,1% | 0,8% | 0,4% | 0,2% |

- **Decisão:** +2 nas duas metas. Um número só, e o Pedágio deixa de ser a carta mais forte sozinha.
- **Empate não existe:** se os dois passam da meta no mesmo disparo, vence quem disparou.
- **Efeito colateral, a medir depois:** na meta 12 a Interferência sobe de 54,1% para 55,4% de média, e o melhor
  deck confirmado (Âncora + Coringa + Interferência) de 59,9% para 61,6%. Duas variantes não mudaram nada (valer só
  em disparo de 5+: 60,1% sozinha; valer em qualquer disparo, inclusive o de 3: 60,3%). A força dela vem do −1 nos
  disparos grandes.

## 11. A Âncora está roubada? Os decks fortes uns contra os outros (v0.11)

Contra o campo inteiro (402 decks, muitos fracos), os melhores decks passam de 60% na meta 12. Para ver se algum
**domina os outros fortes**, `sim/torneio.py` joga os 20 melhores uns contra os outros (600 partidas por par),
com as regras atuais (15 cartas, Mesa de 5, Pedágio +2).

| | Meta 12 | Meta 16 |
|---|---|---|
| Melhor contra os outros 19 | 57,5% (Ajuste + Fundo Falso + Interferência) | 52,3% (Fundo Falso + Pressa + Sobrecarga) |
| Decks de Âncora contra os outros 19 | 47% a 51% | 45% a 49% |
| Todo deck forte tem quem o vença? | sim (o pior confronto de cada um fica entre 30% e 50%) | sim (entre 39% e 49%) |
| Interferência entre os 20 melhores | **15** | 0 |

- **A Âncora não está roubada.** Contra o campo inteiro, os decks de Âncora + Interferência fazem 60% a 61% na
  meta 12, mas contra os fortes ficam na metade. Os decks com Fundo Falso os vencem (64% contra 36%): o Fundo
  Falso derruba a corrente que a Âncora protege.
- **A meta 16 está equilibrada:** os 20 melhores ficam entre 45% e 52% uns contra os outros, com 11 cartas
  diferentes entre eles.
- **O ponto de atenção é a variedade na meta 12:** a Interferência está em 15 dos 20 melhores decks. A força dela
  vem do −1 no disparo automático de 6 (na meta 12, dois disparos de 6 fecham a partida). Duas variantes simples
  não fecham: valer só em 4 ou 5 dados deixa a meta 12 mais variada, mas na meta 16 a Interferência passa a
  dominar (59,7% de média, decks de 65%); valer só em 5+, ou em qualquer disparo, não muda nada.

## 12. Interferência: só em quem lidera (v0.11)

Pedido do dono: medir tudo e deixar o melhor possível. Cada variante foi medida isolada (contra deck vazio,
16 mil partidas), com todos os 402 decks e no torneio dos 20 melhores (`sim/torneio.py`), nas metas 12 e 16.

**Isoladas, contra deck vazio:**

| Interferência | Meta 12 | Meta 16 |
|---|---|---|
| Valendo sempre (até a v0.10) | **60,5%** | 52,1% |
| Não pega o 6 (espera um disparo de 4 ou 5) | 54,3% | (na meta 16 domina: decks de 65%) |
| O disparo de 6 a gasta sem tirar ponto | 51,8% | 52,1% (decks: a pior carta, 46,5%) |
| Só em quem lidera; atrás o disparo a gasta | 53,4% | 51,4% |
| **Só em quem lidera; atrás ela espera (adotada)** | **57,1%** | **55,0%** |
| Para comparar: Pressa · Âncora · Pedágio +2 · Ajuste · Coringa | 58,6 · 58,1 · 57,3 · 56,7 · 55,8 | 54,4 · 52,3 · 55,5 · 55,9 · 55,1 |

**Com todos os decks e no torneio dos fortes:**

| | Até a v0.10 | Adotada |
|---|---|---|
| Meta 12: Interferência entre os 20 melhores | 15 | 10 |
| Meta 12: melhor contra os outros 19 fortes | 57,5% | 57,8% |
| Meta 12: média dos decks com Interferência | 55,4% | 53,5% |
| Meta 16: decks acima de 58% (contra o campo) | 2 | **0** |
| Meta 16: melhor contra os outros 19 fortes | 52,3% | 52,8% |
| Meta 16: média dos decks com Interferência | 49,3% | 51,3% |

- A regra: «O próximo disparo do rival com 4 dados ou mais vale 1 ponto a menos, se ele estiver na sua frente ou
  empatado. Disparo de 3, ou com ele atrás, não a gasta: ela continua armada.» O placar olhado é o de antes do
  disparo.
- Ela vira uma carta de recuperação, como a regra de quem está atrás abrir a Mesa.
- **A Âncora não muda.** Contra os outros decks fortes, os de Âncora ficam entre 45% e 53%, e o Fundo Falso é o
  contra-jogo dela.
- **Na meta 12, o teto fica onde estava:** os melhores decks fazem cerca de 58% contra os outros fortes (Coringa +
  Interferência + Pausa e Ajuste + Interferência + Pausa), e todos têm um deck que os vence. Com degraus de pontos
  grandes (1, 2, 4, 6) numa meta curta, esse teto apareceu em todas as variantes medidas.
- No simulador: `BAL['interf_lider'] = 'espera'` (o padrão).

## 13. As cartas mudam a jogada? O blefe, o medo e o desafio (v0.11)

**A pergunta.** "O objetivo é sempre fazer o máximo de pontos por rodada?" Se for, o jogo é raso: as cartas e o
blefe não mudariam como se joga. Medido em `sim/profundidade.py` (o jogo de hoje com as 15 cartas e o blefe, que
`deck.py` não modelava), com três jogadores: o **ganancioso** (só os próprios pontos; ignora o rival), o **robô do
jogo** e um **planejador** que, em cada escolha de dado e em cada "disparar ou segurar", simula o resto da partida e
fica com a opção que mais vence. Meta 12, decks sorteados.

**1. Há muita habilidade no jogo de dados.** O planejador vence o robô em **82,6%** (±3,1) e discorda dele em 39%
das decisões; o robô vence o ganancioso em só 54%. O que o planejador faz diferente: troca e guarda no Bolso de
outro jeito (2/3 das discordâncias), abre mão de valor imediato em 38% delas e **dispara mais cedo** quando o risco é
baixo e está atrás (corrente média 3,7). Negar dado ao rival quase não aparece (3%). "Máximo de pontos agora" não é
a melhor jogada.

**2. As cartas do rival mudam a melhor jogada.** O planejador que leva em conta o deck dele (à vista) vence 82,4%;
o que planeja como se ele não tivesse cartas, **73,4%**: 9 pontos.

**3. O segredo do "?" não mudava nada.** Saber qual carta está virada valia 2 a 4 pontos (dentro do ruído; no Fundo
Falso, −0,2). Robôs com medo do "?" (0, metade, sempre) ficavam entre 49% e 52% contra blefadores de qualquer
frequência, e blefar sempre **custava** ~2 pontos ao blefador (o blefe ocupa o lugar da armadilha e não assusta
ninguém, porque não há o que temer). Armadilhas mais duras não resolveram: Interferência "vale como um de 3"
(−5 num disparo de 6) e Pedágio só em disparo curto deixaram ler o "?" em 0 a 2 pontos e o medo em 49–51%; a
Interferência de −2 só no disparo de 5+ virou trava (quem tem medo dispara com 4 para sempre; quem sabe a gasta de
graça com um 5). As variantes ficam em `deck.py` (`interf_modo`, `pedagio_modo`), desligadas.

**4. O desafio.** Como em Coup, Skull e o Dado Mentiroso: o que faz o blefe valer é poder **pagar para ver**. Na sua
vez, antes do dado, você desafia a carta virada do rival: blefe → a carta dele se perde e você ganha `acerto`;
armadilha → ela fica armada, à vista, e ele ganha `erro`; e o blefe que ninguém desafiou rende `bonus` quando o dono
o desvira (sem isso, blefar nunca compensaria). Procuramos números em que **nenhuma estratégia fixa vence**: desafiar
quem não blefa custa, desafiar quem blefa rende, blefar contra quem não desafia rende, blefar contra quem desafia
custa. 4.800–14.400 partidas por célula (vitórias de quem lê):

| acerto · erro · bônus | honesto, não desafia | honesto, desafia | blefa, não desafia | blefa, desafia | |
|---|---|---|---|---|---|
| 1 · 1 · 1 | 49,1% | 54,7% | 52,5% | 55,4% | desafiar sempre domina |
| 2 · 2 · 2 | 50,6% | 48,7% | 49,8% | 50,7% | tudo perto de 50%: nada em jogo |
| 3 · 3 · 3 | 50,5% | 39,5% | 47,8% | 46,4% | desafiar nunca compensa |
| **2 · 2 · 3** | **50,5%** | **47,7%** | **47,8%** | **50,6%** | **as quatro condições, 2,7–2,9 pontos cada** |

**Ler o deck é o que ganha.** Quem desafia com a chance de o "?" ser blefe pelo que resta no deck do rival
(efeitos não usados contra armadilhas ainda escondidas) nunca fica abaixo de 50%:

| o rival blefa… | nunca desafiar | sempre desafiar | desafiar pensando |
|---|---|---|---|
| nunca | 49,9% | 48,0% | **50,9%** |
| metade das vezes | 48,5% | 49,5% | **50,0%** |
| sempre | 46,9% | 50,7% | **50,4%** |

**Equilíbrio dos decks** (402 decks × 400 partidas, os dois lados blefando metade das vezes e desafiando pensando):
desvio 0,042 (hoje 0,043), 15 decks acima de 0,58 (hoje 13); o Pedágio vai a 52,4% de média (a Interferência, hoje a
mais forte, tem 53,1%). Desafiando às cegas, o Pedágio ia a 55% (o "?" dele é quase sempre real, e revelado ele não
tem defesa): ler o deck também protege o jogo. O desafio e o bônus fazem ~17% dos pontos de uma partida.

**No jogo:** `DESAFIO = { acerto: 2, erro: 2, bonus: 3 }` em `shared/regras.js`; o blefe só desvira a partir da vez
seguinte à que foi virado (o rival sempre tem a chance de desafiar). A Dona Coruja desafia pela conta acima e blefa
como antes; a Diana desafia com metade da chance e blefa às vezes (25%), para quem aprende ter o que desafiar.

Reproduzir: `cd sim && python3 profundidade.py profundidade leitura blefe decisoes cartas armadilhas` e
`DESAFIO='{"acerto":2,"erro":2,"bonus":3}' python3 profundidade.py desafio` (N, ROLL, PROCS no topo do arquivo).

## 14. Meta 16, 20 ou 24 e o Coringa que troca a frente (v0.12)

**O que o teste com gente disse.** Na meta 12 a partida acaba cedo (~7 Mesas): dois disparos de 6 fecham o jogo, e
o jogador "queima" as cartas logo, porque não há tempo para guardá-las. E o Coringa pareceu roubado.

**Por que o simulador não via o Coringa.** O robô só usava o Coringa quando nenhum dado da Mesa servia. Gente usa de
outro jeito: com o Coringa na mão, segura a corrente de 5 sem medo, porque ele garante o 6.º dado (e o 6.º vale +6 e
dispara sozinho). O robô ganhou esse jeito de jogar (`coringa_seguro` em `sim/deck.py`: o Coringa na mão conta como
seguro, como um Bolso que serve) e o número apareceu.

**Coringa sozinho contra deck vazio** (12.000 partidas; 50% = carta neutra):

| Meta | Coringa até a v0.11, robô | até a v0.11, jogando como gente | só até corrente de 4 | só até corrente de 3 | **troca a frente (v0.12)** |
|---|---|---|---|---|---|
| 12 | 56,5% | **64,9%** | 63,3% | 62,4% | 58,9% |
| 16 | 53,9% | 58,2% | 60,0% | 59,4% | **55,0%** |
| 20 | 53,6% | 55,3% | 56,0% | 56,4% | 52,8% |
| 24 | 52,9% | 55,5% | 55,3% | 56,0% | 53,0% |

Para comparar, na meta 16: Ajuste 55,0%, Virar 53,9%, Pressa 53,8%, Âncora 51,7%.
- **Limitar o tamanho da corrente não resolve:** o problema não é o 6.º dado, é o Coringa tirar todo o risco de
  segurar. Com o limite, ele só muda de lugar (garante o 5.º).
- **Trocar a frente resolve:** o dado que romperia entra **no lugar da frente**, e a corrente fica do mesmo tamanho.
  O Coringa continua salvando uma corrente grande da ruptura (o que ele sempre prometeu), mas não dá mais um elo de
  graça. O dado que já sincroniza entra normal e gasta o Coringa (a regra de gasto não mudou).

**Os 402 decks** (as 15 cartas, 1.200 partidas por deck, o robô usando o Coringa como gente; os 8 melhores confirmados
com 6.000):

| | Coringa antigo, meta 16 | **Coringa novo, meta 16** | Coringa novo, meta 20 | Coringa novo, meta 24 |
|---|---|---|---|---|
| Coringa nos 25 melhores | **25 de 25** | 12 | 12 | 12 |
| Vitória média dos decks com ele | **53,8%** (a maior) | 50,7% (5.ª) | 49,5% | 50,9% |
| Melhor deck (confirmado) | 62,7% Ajuste + Coringa + Pressa | 59,2% Ajuste + Coringa + Pressa | 61,1% Ajuste + Âncora + Sobrecarga | 59,0% Ajuste + Âncora + Coringa |
| Decks acima de 58% (1.200 partidas) | 10 | **0** | 15 | 4 |
| Desvio entre decks | 0,037 | 0,029 | 0,046 | 0,029 |

**Duração** (Mesas por partida, média): meta 12 → 7,0; **16 → 9,5**; 20 → 11,8; 24 → 14,0. Com 35 a 50 s por Mesa (o que
dava os 4 a 6 minutos da 12), a 16 fica em 6 a 8 minutos.

**A decisão:**
- **Metas 16 (padrão), 20 e 24.** A 12 saiu: quem a tinha marcada passa para a 16. Uma partida guardada na 12 ainda
  termina na 12 (o servidor aceita esse resultado), mas nenhuma partida nova começa nela.
- **Coringa troca a frente** em qualquer meta.
- **Moedas por duração:** a vitória na meta 20 rende ×1,25 e na 24, ×1,5 (a rapidez em Mesas já escala com a meta).

**A observar na meta 20.** As cartas ⚡ ficam fortes: Sobrecarga em 13 e Pedágio em 12 dos 25 melhores decks (médias
54,8% e 54,9%). A conta: 20 = 6 + 6 + 6 + 2, então um +2 poupa um disparo inteiro (na 16 e na 24, múltiplos de 4 e de
6, isso acontece menos). Se o teste com gente confirmar, o caminho é o mesmo do Pedágio na v0.11: mexer no número só
dessa meta.

Reproduzir: `cd sim && BAL='{"coringa_seguro":true}' NOVAS=pausa,reverso,furto,lacre CONFIRMA=6000 python3 decks.py`
(com `META=20` ou `META=24`; `BAL='{"coringa_modo":"entra","coringa_seguro":true}'` é o Coringa antigo).

## 15. Jogar como gente: o "humano", o "pensador" e as variantes de deck (v0.12)

**O que existe de dado com gente.** Só relatos: o "?" que era certeza (virou o blefe, §13), a meta 12 curta, o Coringa
roubado (§14), a Pressa que dá 3 dados seguidos (§16) e a vez que passava despercebida. O servidor guarda de cada
partida online só o placar, as rodadas e as moedas: nada de deck, de cartas usadas ou de quando. Não há como medir
com gente o que segue abaixo; os números são de robôs, e o próximo passo é registrar isso nas partidas reais.

**Dois jogadores novos** (`sim/humano.py`):
- **humano** (rápido): usa as cartas pelo que está em jogo. Guarda o conserto (Ajuste, Virar, Coringa, Reverso,
  Rerrolar) para a corrente que vale a pena salvar, conta com as cartas da mão como seguro na hora de segurar, gasta a
  Pressa quando ela leva a 5+, a Sobrecarga num disparo de 5+, arma a armadilha que pega agora, despeja o que sobrou na
  reta final. Cada regra foi medida (ligar e desligar; os números por busca coordenada, `python3 sim/humano.py ajuste`):
  o seguro na mão vale +3,3 pontos, guardar o conserto +2,2, negar o dado ao rival é essencial (sem isso, 48%).
- **pensador** (lento): antes de cada carta, cada dado e cada "disparar ou segurar", simula o resto da partida 12 a 24
  vezes por opção (com as mesmas sortes para todas) e fica com a que mais vence. É o "bom jogador".

| Confronto (decks de 3 sorteados, meta 16) | Vitórias |
|---|---|
| humano × robô | 54,0% (±1,5) |
| pensador (24 simulações) × robô | **87,5%** (±3,2) |
| pensador (24 simulações) × humano | **85,5%** (±3,5) |

**O jogo tem muita habilidade, e quase toda no jogo de dados.** O planejador antigo, que só pensava no dado e no
disparo, vencia o robô em 82,6% (§13); planejar também as cartas leva a 87,5%. As cartas usadas "do jeito certo"
valem ~4 pontos; o dado, o Bolso e a hora de disparar valem o resto. O humano e o robô são jogadores casuais; gente
experiente fica entre eles e o pensador.

**Variantes de deck** (humano × humano para o jogo; humano × robô para a habilidade com as cartas; 6.000 partidas cada):

| Variante | Mesas | Habilidade (humano × robô) | Virada (3+ atrás no meio) | Cartas sobram | Usadas no 1º quarto da partida |
|---|---|---|---|---|---|
| 3 cartas (hoje) | 9,2 | 52,8% | 28% | 17% | **40%** |
| 2 cartas | 9,4 | 53,3% | 30% | 15% | 41% |
| 3 no deck, usa só 2 | 9,5 | 53,0% | 30% | 36% | 52% |
| 3 cartas, 1 por Mesa | 9,2 | 55,4% | 28% | 20% | 34% |
| 1 carta | 9,5 | 51,3% | 30% | 13% | 40% |
| 4 cartas | 9,0 | 56,4% | 28% | 20% | 37% |
| sem cartas | 9,5 | 49,8% | 31% | – | – |

**Com o bom jogador** (pensador com 12 simulações × humano; 240 partidas cada, ±6 pontos):

| Variante | Pensador × humano | Cartas sobram | Usadas no 1º quarto |
|---|---|---|---|
| 3 cartas (hoje) | 65,4% | 13% | 56% |
| 2 cartas | 65,0% | 10% | 58% |
| 3 no deck, usa só 2 | 61,3% | 35% | 70% |
| 3 cartas, 1 por Mesa | 70,8% | 13% | 52% |
| sem cartas | 64,2% | 0% | – |

**Equilíbrio dos decks** (cada deck contra decks sorteados, humano × humano, 500 partidas por deck):

| Variante | Decks | Desvio | Melhor deck | Acima de 58% | Jogáveis (45%+) |
|---|---|---|---|---|---|
| 3 cartas (hoje) | 402 | 0,055 | 64,2% Ajuste + Coringa + Pressa | 22 | 80% |
| 2 cartas | 102 | 0,041 | 58,6% Ajuste + Lacre | 1 | 89% |
| 3 no deck, usa só 2 | 402 | 0,040 | 61,6% Ajuste + Coringa + Virar | 6 | 88% |
| 3 cartas, 1 por Mesa | 402 | 0,051 | 63,8% Ajuste + Pressa + Reverso | 21 | 84% |

**Deck de 2 cartas: pior para o jogo.**
- **Não resolve a queima:** 41% das cartas ainda saem no primeiro quarto (hoje, 40%); com o bom jogador, 58% (hoje, 56%).
  Quem queima não queima por ter carta demais: queima porque usar cedo não custa nada.
- **Não muda a habilidade:** o bom jogador vence o casual igual (65,0% × 65,4%).
- **Fica mais equilibrado, mas por empobrecer:** sem trio, sem combo; e são 102 decks em vez de 402.
- **Enfraquece o blefe:** ele precisa de um efeito para virar e de uma armadilha escondida; com 2 cartas isso existe
  em 42% dos decks (hoje, 70%), e o "?" vira cara ou coroa entre duas cartas (hoje, ~2,8 possibilidades). Depois que o
  efeito sai, todo "?" seguinte é certeza: a regra do blefe nasceu justamente desse problema (§13 e `docs/design.md` §4).
- **Esvazia a loja:** com menos lugar no deck, uma carta nova vale menos.

**"3 no deck, usa só 2": a pior.** O casual gasta as duas cedo e fica com a terceira na mão (36% das cartas sobram;
70% dos usos no primeiro quarto com o pensador). O dilema "qual eu queimo?" vira "queimo logo as duas".

**"1 carta por Mesa": a única que mexe na queima** (34% no primeiro quarto; 52% com o pensador), e a que mais aumenta o
peso da habilidade (casual 55,4% contra o robô; pensador 70,8% contra o casual). Custa uma regra a mais e uma marca na
tela ("carta desta Mesa já usada"); o equilíbrio dos decks fica como o de hoje. Vale um teste com gente antes de virar
regra.

## 16. Pressa: 3 dados seguidos com o rival assistindo (v0.12)

**O relato.** Usei a Pressa no 4.º dado de uma Mesa que o rival abriu: peguei o 4.º e o 5.º (que seria dele). Como eu
estava atrás no placar, abri a Mesa seguinte, e esse dado fechou a corrente de 6. Reproduzido no motor: rival, eu,
rival, **eu, eu, eu**. Não é erro de código: são duas regras se somando. A Pressa pega o último dado da Mesa, e quem
está atrás abre a próxima. Com o deck [Pressa] contra deck vazio, isso acontece em **24%** das partidas.

| Pressa (deck [Pressa] × deck vazio, humano × humano, 24.000 partidas) | Pressa vence | Partidas com 3+ dados seguidos de alguém |
|---|---|---|
| até a v0.11: com 2+ dados na Mesa | 54,1% | 24,1% |
| A: só com 3+ dados na Mesa | 54,5% | 21,8% |
| B: quem esvaziou a Mesa com ela não abre a seguinte | 53,1% | 21,2% |
| **v0.12: só com 3 ou 4 dados na Mesa** | 56,2% | **0%** |

A e B não bastam: os 3 seguidos também saem de pegar o último dado normal, estar atrás, abrir a Mesa nova e usar a
Pressa ali. Com 3 ou 4 dados ela nunca abre uma Mesa nem pega o último dado, e ninguém pega mais de 2 dados seguidos.
A Pressa fica até um pouco melhor (o robô passa a guardá-la para o meio da Mesa, quando os dois dados rendem mais),
dentro da faixa do Ajuste (55%).

Reproduzir: `cd sim && N=24000 python3 humano.py pressa`; as variantes ficam em `deck.py` (`pressa_min`, `pressa_max`,
`pressa_abre`).
