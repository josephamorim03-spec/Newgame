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
python3 sim/decks.py                       # as 11 cartas (CONFIRMA=6000 confirma os 8 melhores)
python3 sim/valor_cartas.py                # cada carta sozinha
NOVAS=pausa,reverso,furto,convite,lacre,ampulheta python3 sim/decks.py
NOVAS=ampulheta BALN='{"ampulheta": 4}' python3 sim/decks.py   # outro número
```

Tudo usa no máximo 4 processos (`PROCS=4`). As regras novas e os robôs delas estão em `sim/novas.py`.

**O que medir com gente:**
- se o Lacre deixa as pessoas com medo de usar efeitos (o robô não tem medo);
- se a Ampulheta faz disparar de 3 cedo demais;
- se o Convite é lido como "pegadinha" ou como jogada.
