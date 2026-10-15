# O céu do vale: vento, monção, umidade, nuvens, chuva e moinhos (v2.0)

**Pedido:** estudar ventos, monções, moinhos, umidade, chuva, formação e precipitação de nuvens, tamanhos e tipos de nuvens, e aplicar isso ao Afluente junto com a tabela métrica e a física que o jogo já tem (v1.9: 1 unidade = 20 m, mapa de colisão).

## 0. Resumo

- O clima do vale agora é **calculado**, não sorteado. Antes, a chuva era 14% de chance por jogada; as nuvens eram tufos genéricos; o sol nascia a oeste.
- Um motor novo e puro, `function Atmos()`, no mesmo padrão do `Engine`: sem DOM, determinístico pela semente do vale e testado em node.
  - Unidades de verdade: °C, %, hPa, m, m/s, mm/h.
  - O mesmo vale do dia tem o mesmo tempo para todo mundo.
- As **estações do jogo são a monção sul-americana** vista do Cerrado:
  - nas Águas, o vento vem de noroeste, úmido, da Amazônia;
  - na Seca, vem de leste, seco, do anticiclone do Atlântico Sul.
- **O mapa muda o céu.** Água viva e mata põem umidade no ar. Um vale verde tem tardes mais úmidas, mais cúmulos e mais pancadas que um vale de vila seca. Não há conta na tela: isso se vê.
- **Nuvens pelos 10 gêneros da OMM**, com altura e largura reais:
  - no horizonte, cada nuvem aparece com o tamanho angular de verdade;
  - no vale, as sombras têm a escala da tabela métrica: um cúmulo de 400 m cobre 20 unidades;
  - os tufos de volume que passam baixo sobre o vale (v1.10, renderizados no Blender) passaram a obedecer à física: quantos nascem, quão alto passam, quanto crescem em torre, para onde vão e quando escurecem.
- **Chuva física:**
  - gotas de Marshall-Palmer com velocidade terminal medida e inclinadas pelo vento;
  - a cortina da pancada atravessa o vale com borda visível;
  - o chão molha e depois seca pela evaporação;
  - frente de rajada, raio e trovão atrasado pela velocidade do som;
  - virga no fim da Seca.
- **Óptica:** arco-íris só com o sol baixo às costas e chuva na frente (primário a 42°, secundário a 51°, faixa de Alexandre) e halo de 22° no cirrostrato.
- **Moinho que gira com o vento.** A torre foi re-renderizada no Blender sem as velas, e as velas são desenhadas em 3D com a mesma câmera:
  - viram para o vento;
  - giram com razão de velocidade de ponta ≈ 2;
  - param com vento fraco;
  - são recolhidas na ventania;
  - sentem o abrigo da mata a barlavento.
- **Nada disso dá pontos nem peças.** É o mundo respondendo ao mapa, como a fauna. Entrou também:
  - uma página **Céu** no Caderno (18 nuvens e fenômenos para ver);
  - um **boletim** no modo Contemplar, com hora, temperatura, umidade, vento na escala de Beaufort, o nome da nuvem e as voltas do moinho.

## 1. O que a pesquisa trouxe

### 1.1 A monção sul-americana e as duas estações do Cerrado

- O Brasil central tem **monção**: a estação chuvosa vai de outubro a abril e concentra **mais de 90% da chuva**; de maio a setembro quase não chove (Embrapa).
- **O início:**
  - o chão aquece e se forma a baixa do Chaco;
  - o vento baixo passa a vir de **noroeste**, trazendo umidade da Amazônia (EGU 2014);
  - no Brasil central, o início médio fica em meados de outubro, com variação de cerca de 3 pêntadas (Gan et al., 2004).
- **Na Seca** manda o anticiclone subtropical do Atlântico Sul:
  - ar que desce, vento de **leste/sudeste** e céu limpo;
  - a umidade da tarde fica abaixo de 20–40% em agosto e setembro, com recordes perto de 11–13% em Brasília.
- **Dentro das Águas** há:
  - **veranicos**, semanas secas no meio da estação chuvosa;
  - episódios de **ZCAS**, a Zona de Convergência do Atlântico Sul: dias de chuva contínua, com nuvens que ligam a Amazônia ao Atlântico.
- **Na Seca** passam **friagens**: frentes frias com vento sul, placas baixas e temperatura alguns graus abaixo.
- **O Cerrado recicla água.** As raízes fundas mantêm a evapotranspiração na Seca, e o desmatamento derruba essa umidade em cerca de 60% na Seca (Spera, Brown University). Essa é a ponte física entre o mapa do jogo e o céu.

### 1.2 Umidade

- A **pressão de vapor de saturação** cresce com a temperatura (fórmula de Magnus): `e_s(T) = 6,112·exp(17,62·T / (243,12 + T))` hPa.
- **Umidade relativa** = `e_s(ponto de orvalho) ÷ e_s(temperatura)`.
- O ponto de orvalho muda pouco ao longo do dia. A temperatura sobe e desce, e por isso a umidade da tarde é baixa e a da madrugada é alta.
- **Neblina de radiação:**
  - forma-se quando a temperatura encosta no ponto de orvalho, em noite clara e calma;
  - o ar frio escorre para o fundo do vale e a água do rio umedece o ar, por isso ela nasce sobre o rio.

### 1.3 Como nasce uma nuvem

- O sol aquece o chão. Bolhas de ar quente (**térmicas**) sobem e esfriam cerca de 10 °C por km.
- Elas condensam no **nível de condensação**, que fica a cerca de **125 m por °C** de diferença entre a temperatura e o ponto de orvalho.
- Todos os cúmulos de uma tarde têm **a base no mesmo nível**, e esse nível sobe ao longo do dia, quando o ar seca.
- **Ar úmido e instável:**
  - o cúmulo de bom tempo (*humilis*) vira *mediocris*, depois *congestus* (couve-flor);
  - por fim vira **cúmulo-nimbo**, cuja torre bate no teto da troposfera (10–14 km) e espalha a **bigorna**.
- **No Cerrado das Águas** as pancadas são de **tarde**, porque o aquecimento do chão leva horas para levantar a camada.
- No **fim da tarde**, os cúmulos se espalham em estratocúmulos.

### 1.4 Tipos e tamanhos de nuvem (Atlas Internacional de Nuvens, OMM)

| Gênero | Nível | Base | Tamanho típico | No Cerrado |
|---|---|---|---|---|
| Cirros (Ci) | alto | 8–11 km | fios de 1,5–6 km | Seca, e no rastro das bigornas |
| Cirrocúmulos (Cc) | alto | 7–10 km | campos de 1–4 km | raros |
| Cirrostratos (Cs) | alto | 7–10 km | véu de dezenas de km | antes da chuva contínua; halo de 22° |
| Altocúmulos (Ac) | médio | 2,5–5 km | fileiras de 0,8–3 km | manhãs das Águas |
| Altostratos (As) | médio | 2,5–5,5 km | véu de dezenas de km | anunciam a ZCAS |
| Nimbostratos (Ns) | baixo a médio | ~1 km | teto de centenas de km | dias de ZCAS |
| Estratocúmulos (Sc) | baixo | 0,6–1,5 km | placas de 0,6–2,5 km | fim de tarde; friagem |
| Estratos (St) | baixo | 0–500 m | camada | a neblina que levanta |
| Cúmulos (Cu) | baixo | 0,8–2,5 km | 0,2–1,8 km | toda tarde das Águas |
| Cúmulo-nimbos (Cb) | baixo a alto | 0,8–1,6 km | torre de 3–12 km, bigorna de 15–40 km | pancadas da tarde |

- A OMM separa os níveis: nuvens baixas com base até cerca de 2 km; médias entre 2 e 8 km nos trópicos; altas entre 6 e 18 km.
- A sequência **Ci → Cs → As → Ns** é a chegada de um sistema de chuva contínua. O jogo segue essa ordem antes de cada ZCAS.

### 1.5 Chuva

- **Gotas (Marshall-Palmer):**
  - o número de gotas de diâmetro D cai exponencialmente, com inclinação `Λ = 4,1·R^-0,21` mm⁻¹ (R em mm/h);
  - o diâmetro mediano é `D0 = 3,67/Λ`;
  - chuva forte quase não tem mais gotas: tem **gotas maiores**.
- **Velocidade terminal** (Atlas, Srivastava e Sekhon, 1973): `v = 9,65 − 10,3·exp(−0,6·D)` m/s.
  - Garoa (0,6 mm) cai a ~2,5 m/s: com vento de 3 m/s, cai quase deitada.
  - Temporal (2 mm) cai a ~6,6 m/s, quase em pé.
- **Pancada × chuva contínua:**
  - a pancada é localizada e curta: uma cortina de algumas centenas de metros que anda com o vento das nuvens;
  - a ZCAS é um teto inteiro de chuva moderada.
- **Frente de rajada:**
  - o ar frio da chuva desce e se espalha pelo chão;
  - o vento vira e aperta (8–15 m/s) antes da pancada chegar, e a temperatura cai alguns graus.
- **Virga:** com o ar seco embaixo da nuvem (base alta), a chuva evapora antes de chegar ao chão. É típica do fim da Seca.
- **Raio e trovão:**
  - o som anda **343 m/s**: são 3 s por km;
  - trovão de tempestade a mais de ~15 km quase não se ouve, daí o "relâmpago sem trovão" no horizonte.

### 1.6 Vento

- **Escala de Beaufort** (m/s): calmaria < 0,3; aragem; brisa leve > 1,6; brisa fraca > 3,4; moderada > 5,5; forte > 8; vento fresco > 10,8; vento forte > 13,9; e assim por diante.
- **Perfil logarítmico:**
  - `v(z) = v10·ln(z/z0) ÷ ln(10/z0)`, com a rugosidade `z0`;
  - água 0,0002 m, pasto 0,03, lavoura 0,08, vila 0,6, mata 1 m.
- **Quebra-vento:** a mata reduz o vento a sotavento por algumas vezes a altura das árvores.
- **Dia × noite:**
  - de dia o sol mistura o ar, o vento desce até o chão e vem em **rajadas**;
  - à noite o ar perto do chão fica parado e separado do de cima: a fumaça sobe reta.
- **Turbulência:** a rajada é uma flutuação em torno do vento médio, para mais e para menos (média zero).
  - A **intensidade de turbulência** `Iu = σu/U` em campo aberto fica perto de 0,10 com ar estável (noite) e de 0,25 a 0,30 na tarde de sol.
  - A rajada de pico de 3 s fica em 1,4 a 1,8 vez o vento médio.
- **Hipótese de Taylor:** os redemoinhos são levados pelo vento médio quase sem mudar. Por isso a "onda" que se vê passar no capim anda na velocidade do vento, e o que sente um ponto fixo é esse campo passando por ele.
- **Força no capim e nas copas:** o arrasto cresce com o **quadrado** da velocidade. Com 3 m/s o capim mal deita; com 10 m/s (força 5, "árvores pequenas balançam") deita bem. Uma árvore de 10 a 15 m oscila na própria frequência, perto de 0,3 a 0,6 Hz.

### 1.7 Moinhos de vento

- A potência do vento é `P = ½·ρ·A·v³`, ou seja, cresce com o cubo da velocidade.
- O limite de Betz: nenhum rotor tira mais que 59% dela.
- **Velas de lona tradicionais:**
  - aproveitam de 10 a 25% (`Cp`);
  - num ensaio, o máximo foi 0,17 com razão de velocidade de ponta (`λ = ω·R ÷ v`) perto de **2**;
  - giram de 12 a 20 voltas por minuto.
- **O moleiro:**
  - recolhe a lona e freia acima de ~12 m/s;
  - vira o capelo para o vento (nos moinhos de torre, um leque de cauda faz isso sozinho).
- **No vale:**
  - ρ = 1,04 kg/m³ a 1.100 m, onde a pressão é ~888 hPa;
  - com velas de 4,4 m (o modelo do atlas), λ = 2 e Cp = 0,17, a 5 m/s o moinho dá ~19 voltas por minuto e ~0,5 kW.

### 1.8 Óptica do céu

- **Arco-íris:**
  - é um círculo de **42°** em volta do ponto antissolar (a sombra da sua cabeça);
  - o vermelho fica por fora;
  - o secundário fica a **51°**, com as cores trocadas e mais fraco;
  - entre os dois o céu é mais escuro (**faixa de Alexandre**);
  - só aparece com o sol a menos de 42° de altura, às costas, e chuva do lado oposto.
- **Halo de 22°:** é a refração nos prismas de gelo do cirrostrato.
- **O sol no Cerrado (15,8° S):**
  - nasce a **leste** e se põe a **oeste**;
  - na Seca (inverno), passa ao **norte**; em dezembro, quase a pino.
  - A câmera do jogo olha para o norte, então, na Seca, o sol fica **na frente** de quem olha.

## 2. Como isso entra no Afluente

**Princípio** (da auditoria das mecânicas, `MECANICAS.md`): uma regra nova precisa criar decisão, caber numa frase e ter consequência perto. O clima **não** passa nesse filtro como regra de pontos, e o jogo já tem a Seca, que é a decisão sobre a água. Por isso o clima entra como a fauna entrou: **o mundo responde ao mapa, sem conta na tela**. A ligação com o jogo é feita assim:

- **Estação do jogo → regime.** Águas e Seca escolhem a climatologia: temperatura, ponto de orvalho, vento e instabilidade. O andamento dentro da estação (jogada por jogada) muda o regime:
  - primeiras chuvas;
  - o meio úmido;
  - o começo frio da Seca;
  - o fim quente e enfumaçado.
- **As chuvas voltam → a frente chega.** No turno em que o jogo anuncia "As chuvas voltaram!", o motor manda uma pancada forte, com rajada e raios, sobre o vale.
- **A Seca chega → a chuva para no chão.** O rio seca pela regra; não há chuva no chão na Seca, só virga (o teste confere isso).
- **O mapa → a umidade do ar.** A conta é `m = (peças com água viva + 0,6 × mata) ÷ peças × 1,6`.
  - Ela soma até +1,4 °C ao ponto de orvalho e tira até 0,6 °C num vale árido.
  - A mata refresca a tarde e a vila esquenta (ilha de calor).
  - Na Seca, o rio que seca tira umidade do vale.

| Fenômeno | Física usada | O que se vê | Código |
|---|---|---|---|
| Hora e sol | posição astronômica (latitude, declinação, ângulo horário) | o sol nasce à direita (leste); sombras, brilho no céu e luz quente seguem o sol | `ATM.sun`, `envStep` |
| Temperatura e umidade | climatologia + ciclo diário (mínima às 6 h, máxima às 15 h) + mapa; Magnus | boletim do Contemplar; neblina; ar seco e enfumaçado na Seca (serras apagadas) | `Sky.thermo` |
| Vento | sinótico da monção + mistura diurna + turbulência de média zero + frente de rajada | capim, copas, fumaça, chuva inclinada, moinho, som do vento; desde a v2.3 capim, copas, faixas de luz e moinho leem o campo de rajadas levado pelo ar (seção 9) | `Sky.step`, `gustAt`, `windAt`, `ENV.gust` |
| Cúmulos | térmicas + nível de condensação | no horizonte, base reta no mesmo nível, subindo ao longo do dia; sombras de 300 m a 1,5 km; sobre o vale, os tufos da v1.10 nascem pela cobertura de cúmulos, passam mais alto com o ar seco e crescem em torre na tarde instável | `covers`, `hzStep`, `ovStep`, `cloudsStep` |
| Pancada | célula com cortina (mm/h), vida acelerada, anda com o vento das nuvens | sombra escura; borda da chuva atravessando o vale; chão molhando e poças (v2.1) só nas peças onde a chuva passou; respingos onde chove | `spawnCell`, `rainAt`, `rainFx`, `wetGround` |
| Chuva contínua (ZCAS) | Ci → Cs → As → Ns | véus no céu, teto escuro e chuva fina | `eplan`, `drawSkyBand` |
| Gotas | Marshall-Palmer + velocidade terminal | garoa fina e deitada; temporal grosso e em pé | `ATM.drops`, `rainFx` |
| Raio e trovão | 343 m/s | clarão e raio sobre o vale; trovão segundos depois, vindo do lado do raio pela escuta do vale (estalo perto, ronco longe); relâmpago mudo ao longe | `flashFx`, `thunder` (voz `CALL.trovao` de `SOM.md`) |
| Neblina | orvalho + ar frio no fundo do vale + água | véu na madrugada, flocos sobre o rio, que viram estrato de manhã | `fogOf`, `fogFx` |
| Arco-íris e halo | 42°/51° do ponto antissolar; 22° do sol | arcos parciais na borda do céu de manhã e à tarde nas Águas | `rainbowFx` |
| Redemoinho | térmica forte + vento fraco + chão seco | só na Seca, de dia, com vento < 5,5 m/s | `devilsStep` |
| Moinho | perfil log + abrigo + λ ≈ 2 + partida e freio | velas viram para o vento e giram; param à noite; recolhidas na ventania | `ATM.mill`, `drawMill` |
| Som | — | o som do vale (`SOM.md`) ouve a chuva, o vento e a noite calculados; cigarras só no calor (acima de 21 °C) | `ambUpdate` |

## 3. Escalas e relógios

- **Espaço:** a tabela métrica da v1.9 (1 u = 20 m) vale para o céu.
  - Um cúmulo de bom tempo (300–800 m) é maior que muitas peças juntas: a sombra dele passa como uma mancha grande e lenta.
  - O vale inteiro (~300 m) cabe embaixo de uma pancada.
- **Horizonte:** a câmera olha para o norte com uma grande-angular de 100° (menos no celular em pé).
  - Cada nuvem aparece com `largura ÷ distância` e a base em `atan(altura ÷ distância)`, com os mesmos graus por pixel nas duas direções.
  - Ao longe, a curvatura da Terra (com refração, k = 7/6) desce a base.
- **Tempo:** são três relógios, de propósito.
  1. **O dia anda com as jogadas** (como antes): 1 jogada = 1 h de dia, 3 h de noite. A temperatura, a umidade, o sol e a regra das térmicas seguem esse relógio.
  2. **O vento leva as nuvens em velocidade real** (m/s → u/s pela tabela). Quem para para pensar vê o céu andando.
  3. **A vida das nuvens de chuva é acelerada**, como num time-lapse de cerca de 15×.
     - Uma pancada dura de 2 a 3 minutos de verdade ou de 1 a 2 jogadas, o que vier primeiro.
     - Jogando rápido, ela não atravessa a tarde inteira.
- **O chão molha no mesmo time-lapse da pancada e seca no relógio do jogo.** A lâmina de água soma `mm/h × tempo × 15` e escurece o chão a partir de ~0,3 mm. Embaixo da chuva não há evaporação, porque o ar está saturado. Depois, a evaporação em mm/h depende do sol, da umidade e do vento: o chão de uma pancada da tarde seca em uma ou duas jogadas, e o da noite espera o sol.

## 4. Números do simulador (`sim/atmos_teste.js`, 10 anos de jogo, 8 s por jogada)

| | Águas | Seca |
|---|---|---|
| Temperatura à tarde / madrugada | 25,4 °C / 17,9 °C | 26,2 °C / 13,2 °C |
| Umidade à tarde / madrugada | 57% / 97% | 34% / 50% |
| Base dos cúmulos à tarde | 1.170 m | 2.270 m (quase não se formam) |
| Vento médio (máx.) | 3,4 m/s (19,6 na frente de rajada) | 4,5 m/s (10,8) |
| Tempo chovendo no vale | ~20% (pancadas, a frente das chuvas e a ZCAS) | 0% no chão (só virga) |
| Neblina (sobre o rio) | 14% (28%) | 0,1% (1,5%) |

- As pancadas do dia caem entre 13 h e 15 h. A frente que traz as chuvas e a ZCAS podem chegar a qualquer hora.
- **O mapa muda o céu.** No mesmo vale e na mesma semente:

| Vale | Umidade à tarde | Cobertura de cúmulos | Tempo chovendo |
|---|---|---|---|
| Úmido (água e mata) | 62% | 0,40 | 21,8% |
| Árido (vila, sem água) | 50% | 0,27 | 18,0% |

- **Referências conferidas pelo teste:**
  - gotas de 1 mm/h: D0 = 0,90 mm a 3,6 m/s; de 50 mm/h: D0 = 2,04 mm a 6,6 m/s;
  - moinho a 5 m/s: 19 voltas por minuto e 0,48 kW;
  - ar a 1.037 kg/m³;
  - o sol nasce a leste e se põe a oeste, passa ao norte no inverno e fica quase a pino em dezembro.
- **Invariantes:**
  - umidade nunca acima de 100%;
  - ponto de orvalho nunca acima da temperatura;
  - nada negativo;
  - mesma semente, mesmo céu; sementes diferentes, céus diferentes.
- **Desempenho:** o quadro custa o mesmo que antes. No teste sem tela (celular em pé, 2×, sobre a v2.1):
  - visão normal: 4,9 ms contra 4,8 ms;
  - numa pancada: 5,7 ms contra 4,2 ms;
  - zoom de perto: 64 ms contra 63 ms.
- **Cuidado de memória:** as peças em cache já ocupam ~48 MB de imagem no zoom de perto. Somando os sprites do céu, isso estourava o cache de imagens e triplicava o quadro. Por isso:
  - os sprites do céu são gerados em meia resolução (nuvem ao longe é macia);
  - as nuvens do horizonte somem no zoom de perto, quando a câmera olha o chão.

## 5. O que ficou de fora, e por quê

- **Clima que dá ou tira pontos** (chuva regando a lavoura, vento rendendo no moinho). É tentador, mas é a mesma armadilha da v0.6: conta escondida e consequência longe da decisão. Se um dia entrar, que seja **uma** regra espacial e visível, testada no simulador como a Seca. Exemplo: "mata a barlavento abriga o moinho", que já se vê.
- **Granizo, tornados, geada.** São raros no Cerrado e pediriam arte nova sem trazer decisão.
- **Queimadas.** A fumaça já aparece como visibilidade baixa no fim da Seca. O fogo em si mexe com perda, um tema que pede cuidado e teste.
- **O sol do lado certo.** As sombras pintadas no Blender vêm do noroeste. Agora as sombras dinâmicas seguem o sol de verdade, e de manhã as duas discordam. Antes, as dinâmicas discordavam à tarde. Para resolver de vez, seria preciso renderizar a sombra no jogo.

## 6. O que observar no teste com pessoas

- Alguém nota que o céu muda com o vale (mais nuvens e pancadas num vale verde)?
- A pancada que chega com "As chuvas voltaram!" ajuda a sentir a virada da estação?
- O moinho parado à noite ou com vento fraco parece defeito? O boletim do Contemplar explica: "parado (vento fraco no cubo)".
- O Caderno do Céu dá vontade de voltar para ver o que falta (arco-íris, halo, virga)?
- Na tempestade, o vale continua legível o bastante para jogar?

## 7. Arquivos

- `prototipo/afluente.html`:
  - `function Atmos()`: o motor;
  - `envStep`, `drawSkyBand`, `hzStep`, `ovStep`, `skyShadows`, `rainFx`, `wetGround`, `fogFx`, `flashFx`, `rainbowFx`: o desenho;
  - `cloudsStep`: os tufos da v1.10, agora dirigidos pela atmosfera;
  - `drawMill`: o moinho;
  - `CEU`, `ceuMark`, `ceuIcon`: o Caderno do Céu;
  - `skyCard`: o boletim.
- `sim/atmos_motor.js`: cópia do motor, gerada por `node sim/extrair_motor.js`, que agora extrai também o `Engine`.
- `sim/atmos_teste.js`: o teste do clima. Uso: `node atmos_teste.js atmos_motor.js` (20 anos de jogo por padrão).
- `sim/coerencia_teste.js`: o teste de coerência no navegador (seção 8).
- `arte/afluente_sprites.py`: modelo novo `windmill_torre` (o moinho sem velas) e atlas atualizado com `atualizar_atlas.py` e `embutir.py`.

## 8. Coerência com as regras do jogo (v2.3)

**Princípio:** o mundo que se vê não pode contradizer a regra. Se o jogo diz "a seca chegou e o rio secou", o céu não pode estar despejando um temporal um segundo antes.

| Incoerência encontrada | Como ficou |
|---|---|
| Uma pancada na última jogada das Águas, e logo depois a seca secando o rio sob o chão encharcado | As chuvas **rareiam nas últimas jogadas** e param na última. É o fim das águas de verdade: a chuva some a 0,0 mm/h na última jogada, contra 3,5 mm/h no começo da estação. A ZCAS sempre termina antes. O hint diz "Ainda chove, mas a seca vem em N jogadas" quando é o caso. |
| A pancada que já existia continuava na Seca, com raio, cortina de chuva e arco-íris | Na Seca, a célula vira nuvem seca: sem chuva no chão, sem raio. |
| Desfazer a jogada que trouxe a seca disparava "as chuvas voltaram" (frente com raios) | A frente só vem numa estação nova de verdade. |
| O leito seco continuava de areia rachada sob temporal | Com chuva, o leito vira barro escuro com água empoçada no fundo. O rio não corre, porque a água só vem da nascente. |
| O campo de palha não reagia à chuva | Onde a chuva molhou, a palha recua: o chão fica verde-escuro molhado e volta a secar. |
| Lua e estrelas atrás de nuvem de chuva | Somem com céu encoberto ou chuva. |
| Araras, bandos, borboletas, libélulas, pólen e brilhos de sol de noite ou na chuva | Só de dia, com tempo bom (junto com o comportamento dos bichos da v2.2). |
| Trovão ao começar uma garoa contínua (ZCAS) | Trovão só com pancada de verdade, com raio. |
| Clarão do raio igual sob o sol e na noite | Mais forte no escuro (noite ou embaixo da tempestade). |
| Lição da seca com céu de Águas | O céu segue a estação do jogo, também nas lições, sempre com tempo bom. |
| Fumaça saindo de igreja e de moinho | Construção especial não tem chaminé. |

**Teste automático** (`sim/coerencia_teste.js`): joga partidas inteiras com o tempo correndo e confere a cada quadro:

- na seca, não chove no chão e não cai raio;
- na última jogada antes da seca, a chuva já parou;
- todo raio vem de uma pancada com chuva;
- arco-íris só com o sol entre 0° e 42°;
- neblina só de madrugada e de manhã;
- redemoinho só na seca;
- nada nasce no céu de noite ou na chuva forte;
- gado, ovelhas e fauna só onde o mapa de colisão deixa (o gado pode se abrigar sob a copa, não no tronco);
- nada de NaN, nenhum erro de JavaScript.

O teste roda 12.830 quadros em 4 vales e uma lição: **tudo coerente**.

O motor também tem o seu teste (`atmos_teste.js`): "chuva média na última jogada das águas: 0,000 mm/h" e "desfazer a seca não traz a frente das chuvas".

## 9. Vento que se vê (v2.3)

**O problema:** o vento do jogo vinha em ondas e parecia forte demais. Havia três causas:

| Causa | Efeito na tela | Como ficou |
|---|---|---|
| A fase das ondas era `tempo × velocidade do vento`. Como o tempo já passa de centenas de segundos, qualquer mudança pequena no vento dava um salto enorme de fase | As ondas do capim, o balanço das matas e as faixas de luz corriam para frente e para trás, em surtos | As rajadas são um campo que **anda com o ar**: o jogo soma quanto o ar andou a cada quadro (`ENV.wadv`) e lê a fase daí. Nada mais é `t × vento` (o mesmo erro movia as nuvens em placa do céu) |
| A rajada do motor só somava (`sin³` positivo, num pulso regular a cada 46 s) | Vento médio de verdade ~20% acima do anunciado; σu/U = 0,47 nas tardes das Águas, quase o dobro do real | Turbulência de **média zero** com a intensidade de campo aberto: `u = U·(1 + Iu·n)`, `Iu` de 0,10 a 0,27, com redemoinhos de 1,6 s, 6 s e 25 s |
| O capim e as matas reagiam à velocidade (linear) e a faixas de luz de lado a lado da tela, sempre visíveis | Mesmo com 2 a 3 m/s tudo balançava | A força segue o **quadrado** da velocidade no lugar; as faixas viraram manchas alongadas no sentido do vento, que só aparecem com vento de verdade |

**Como funciona agora:**

- **O motor** dá o vento médio `U`, a intensidade `Iu` e o vento do momento no ponto de foco (para o som, as folhas e a poeira).
- **O desenho** usa um campo de rajadas (`gustAt`) com manchas de ~70 m, ~30 m e ~14 m, alongadas no sentido do vento e levadas por ele (Taylor). O vento num lugar é `windAt(x, y) = U·(1 + Iu·campo)`.
  - **Capim:** cada lâmina deita conforme `(u/10)²`, com um tremor de ~1,5 Hz por cima.
  - **Árvores:** cada árvore verga sobre a **própria base**, conforme `(u/10)²` no lugar dela, e oscila na própria frequência (0,3 a 0,6 Hz, uma diferente da outra). O buriti verga mais e mais devagar. Antes a peça inteira entortava como uma folha de papel: as árvores do fundo corriam mais que as da frente e todas iam e voltavam juntas.
  - **Faixas de luz:** manchas claras que andam com o ar; a força acompanha `(U/10)²`.
  - **Moinho:** gira com o vento do lugar dele. Quando uma rajada passa pelo capim, chega nas velas.
- **Folhas e poeira** só voam a partir da brisa moderada, pela escala Beaufort: começam em 4,5 m/s e ficam no máximo com 10 m/s.

**Números** (`atmos_teste.js` e o medidor do vento):

| | Antes | Depois |
|---|---|---|
| Tarde das Águas: σu/U | 0,47 | 0,23 |
| Tarde das Águas: rajada de pico ÷ médio (p95) | 1,99 | 1,42 |
| Tarde das Águas: mediana do vento do momento ÷ médio | 1,2 | 1,0 |
| Tarde da Seca: σu/U | 0,25 | 0,24 |
| Noite: σu/U | 0,12 | 0,12 |
| Movimento na tela (diferença entre quadros, tarde de seca) | 3,2 | 1,5 |

## 10. Chuva que se vê (v2.3)

| O que estava ruim | Causa | Como ficou |
|---|---|---|
| "Filtro preto" da pancada impreciso e vazando para fora da peça | A sombra da pancada era recortada no formato das peças, mais um hexágono "suspenso" acima de cada uma (feito para as copas). Escurecia o fundo acima da peça, com lados retos, e deixava a lateral de terra e a borda claras | A torre e a bigorna têm quilômetros; a peça tem 20 m. Debaixo delas a luz cai **por igual** em tudo o que se vê, como a luz da noite (`ENV.stormDim`, em `todGrade`). O recorte das sombras de nuvem passou a ser a peça mais a lateral de terra |
| Peça molhada com aresta reta contra a vizinha | Cada hexágono escurecia por inteiro conforme a chuva no centro dele | Campo contínuo de umidade (`wetField`): média ponderada das peças, numa imagem presa ao mundo. Chuva igual escurece igual; onde a borda da chuva passou, a passagem é suave |
| Anéis grandes na água, muitas vezes fora dela | Anéis de ~2 m de diâmetro lançados em volta do meio da peça, sem saber onde está a água | Uma gota faz um anel de 10 a 20 cm que some em ~0,35 s. Agora é um pontilhado fino de anéis pequenos **dentro do canal** (recortado pela água), na quantidade da chuva sobre a peça. A água arrepiada perde um pouco do reflexo |
| Respingos no chão "pipocando" | Partículas que quicavam alto | Pontinhos que piscam onde a gota bate, dentro de cada peça onde chove |
| Covinhas das poças maiores que a poça | Anéis de até 60% da poça, sem recorte | Covinhas pequenas, recortadas pela poça |
| Correnteza dando saltos quando a chuva muda | Fase `tempo × (1 + chuva)` | Relógio acumulado (`ENV.flowClk`): a chuva acelera a correnteza sem saltos |
| Peixe gigante caindo na margem | Peixe de ~3 m saltando 9 m numa direção qualquer | Peixe de ~40 cm salta ~1,6 m **ao longo do canal**; os anéis da saída e da entrada têm ~1 m |

## 11. Régua: tamanhos e física na tabela métrica (v2.3)

**O problema:** a borboleta estava maior que o boi, e as flores e os girassóis maiores que vários bichos. Medindo cada coisa como o jogo a desenha (1 u = 20 m), a régua era desigual: casas, árvores e igreja estavam perto do real, mas o pequeno estava muito exagerado.

**A regra agora:** o que tem 3 m ou mais é desenhado no tamanho real. O que é menor ganha um exagero suave para continuar legível, sempre o mesmo e sem trocar a ordem (o que é maior de verdade continua maior na tela):

`READ(L) = L` para `L ≥ 3 m`; `READ(L) = 3·(L/3)^0,6` para `L < 3 m`.

| | Real | Antes | Agora |
|---|---|---|---|
| Borboleta (envergadura) | 8 cm | 2 m | 34 cm |
| Libélula | 7 cm | 1,8 m | 31 cm |
| Galinhas | 45 cm | 1,1 m | 50 cm |
| Flores do campo | 45 cm | 2,4 m | 0,8 m |
| Touceira de capim | 0,6 m | 3,5 m | 1,1 m |
| Lâmina de capim | pasto 0,3–0,7 m; capim nativo até 1,2 m | 0,6–2,3 m | 0,3–0,7 m; nativo até 1,2 m |
| Trigo | 0,9 m | 3,9 m | 1,4 m |
| Canela-de-ema | 1,5 m | 4,0 m | 2,0 m |
| Cupinzeiro | 1,6 m | 3,3 m | 1,9 m |
| Girassol | 2,0 m | 4,1 m | 2,2 m |
| Milho | 2,3 m | 4,4 m | 2,4 m |
| Boi (comprimento × altura) | 2,4 × 1,4 m | 5,1 × 2,4 m | 3,0 × 1,4 m |
| Ovelha (comprimento) | 1,3 m | 3,0 m | 1,9 m |
| Onça (comprimento com cauda) | 2,4 m | 5,2 m | 2,6 m |
| Anta | 2,0 m | 5,2 m | 2,4 m |
| Capivara | 1,2 m | 3,1 m | 1,7 m |
| João-de-barro | 20 cm | 1,2 m | 0,6 m |
| Arara voando | 1,1 m | ~5 m | ~1,6 m |
| Casas, igreja, árvores, moinho | 4–14 m | já no real | sem mudança |

A lavoura ficou mais densa, com plantas menores e mais juntas: o campo continua cheio. Lá, o espantalho e o feno são postos antes das plantas.

**Física das partículas:** antes, tudo caía como pedra (`x = v·t`, `y = v·t + ½g·t²`), e as folhas sopradas saíam a 16–36 m/s com 6 m/s de vento. Agora o que é leve sente o ar: sai com a velocidade inicial e, em `tau` segundos, passa a andar com o vento e a cair na velocidade-limite.

`x(t) = x₀ + v_lim·t + (v₀ − v_lim)·tau·(1 − e^(−t/tau))`

| Partícula | Tamanho | tau | Velocidade-limite |
|---|---|---|---|
| Folha arrancada pela rajada, folha caindo | 10 cm (na régua: 39 cm; antes 1,8 m) | 0,6 s | anda com o vento, cai a ~1,2 m/s |
| Pétala de ipê | 7 cm (na régua: 31 cm; antes 2 m) | 0,5 s | anda com o vento, cai a ~1 m/s |
| Poeira da seca | nuvem | 0,4 s | anda com o vento |
| Fumaça da chaminé | pluma | 1,2 s | sobe ~1,5 m/s e anda com o vento |
| Névoa da mata e da água | véu | 2 s | anda com 60% do vento |
| Vaga-lume | brilho | — | ~0,5 m/s (antes 2,4 m/s) |

Os efeitos de jogada (folhas e pétalas quando a peça cai ou uma missão se cumpre) usam folhas do mesmo tamanho e o mesmo arrasto.

**Capim no lugar certo:** o mapa de colisão dos bichos passou a marcar as ruas da vila (`WB.RUA`). O capim só nasce onde o chão é capim: fora da água, das construções, da área que um objeto alto cobre na tela, da lavoura e das ruas. Antes nascia nas ruas de terra e, desenhado depois das casas, aparecia em cima dos telhados. Na margem de fora, a vegetação chega até a beira.

**Margem do rio:** antes eram duas faixas lisas (areia e marrom) paralelas à água. Agora, de fora para dentro:
- terra úmida que passa por baixo do capim, num degradê sem borda;
- barro com a textura do leito (renderizado no Blender), com seixos;
- barro molhado mais escuro junto da água;
- na margem de lá, a face do barranco (o degrau até a água);
- uma linha d'água fina.

Na nascente, o chão é de brejo, mais estreito e com capim.

## Fontes

- Estação chuvosa do Cerrado (mais de 90% da chuva de outubro a abril) e veranicos — [Embrapa, circular técnica](https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/548605/1/cirtec09.pdf); [Embrapa, comunicado técnico](https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/548606/1/comtec04.pdf); [duração da estação chuvosa e veranicos no Cerrado (UFV)](https://locus.ufv.br/handle/123456789/33732)
- Início da monção, baixa do Chaco e fluxo de noroeste — [EGU 2014](https://meetingorganizer.copernicus.org/EGU2014/EGU2014-7416.pdf); datas de início (Gan et al., 2004) — [ICTP-SAIFR](https://www.ictp-saifr.org/wp-content/uploads/2019/08/Workshop_Monsoon_Gan1-compressed.pdf); [The nature of the rainfall onset over central South America](https://www.revistascca.unam.mx/atm/index.php/atm/article/view/8588); jato de baixos níveis e fases ativas e de pausa — [Carvalho (IMD)](https://nwp.imd.gov.in/IWM-7/pdf/0_Leila%20Carvalho_invitedtalk_CARVALHO-SALLJ-SAMS-SACZ.pdf)
- Anticiclone do Atlântico Sul e chuva no Cerrado — [Revista Pesquisa FAPESP](https://revistapesquisa.fapesp.br/seca-avanca-no-cerrado/)
- Umidade em Brasília na Seca — [Climatempo](https://www.climatempo.com.br/noticia/2019/09/05/brasilia-completa-3-meses-sem-chuva-8096); [INMET, balanço de agosto de 2023](https://portal.inmet.gov.br/noticias/balan%C3%A7o-bras%C3%ADlia-df-teve-chuva-e-temperaturas-acima-da-m%C3%A9dia-em-agosto-2023); [Correio Braziliense](https://www.correiobraziliense.com.br/cidades-df/2022/08/5029241-seca-brasilia-chega-a-100-dias-sem-chuva-nesta-segunda-feira.html)
- Evapotranspiração do Cerrado e reciclagem de umidade — [Brown University (Spera)](https://www.brown.edu/news/2016-03-31/Cerrado); [EurekAlert](https://www.eurekalert.org/news-releases/812406); raízes fundas e água no solo — [Christoffersen et al.](https://www.geog.leeds.ac.uk/projects/amazonica/papers/Christoffersen.etal_DMIP_accepted.pdf); [Embrapa](https://www.alice.cnptia.embrapa.br/alice/bitstream/doc/1039664/1/2015AP047.pdf)
- Pancadas convectivas de tarde e cúmulo-nimbos — [Climatempo](https://www.climatempo.com.br/noticia/temporal/calor-e-umidade-entenda-como-se-formam-as-pancadas-de-chuva-convectivas)
- Níveis e gêneros de nuvem — [Atlas Internacional de Nuvens, OMM](https://cloudatlas.wmo.int/en/some-useful-concepts-levels.html); [OMM, classificação](https://wmo.int/world-meteorological-day-2017/classifying-clouds)
- Velocidade terminal das gotas — Atlas, Srivastava e Sekhon (1973), *Reviews of Geophysics* 11(1); implementação de referência — [DISDRODB](https://disdrodb.readthedocs.io/en/latest/_modules/disdrodb/fall_velocity/rain.html). Distribuição de gotas: Marshall e Palmer (1948), *Journal of Meteorology* 5.
- Moinhos tradicionais (Cp, voltas por minuto, recolher as velas) — [Firgelli](https://www.firgelliauto.com/blogs/mechanisms/ancient-windmill); ensaio em túnel de vento de um rotor de quatro pás (Cp 0,17 com λ = 2) — [DeepDyve](https://plosjournal.deepdyve.com/lp/sage/experimental-study-of-a-pinwheel-type-wind-turbine-abu10Fu0F6)
- Não usados como fonte de números, mas fórmulas clássicas de livro-texto: Magnus (pressão de vapor), nível de condensação de ~125 m/°C, perfil logarítmico do vento, limite de Betz, escala de Beaufort, ângulos do arco-íris e do halo.

**Ressalva honesta:** a climatologia do motor usa valores arredondados, de ordem de grandeza. Não consegui abrir a tabela oficial das normais do INMET (1991–2020) para Brasília. As notícias e notas usadas concordam nas faixas (umidade da tarde da Seca entre 15% e 40%; mais de 90% da chuva de outubro a abril). Se for preciso precisão, a tabela do INMET é o próximo passo, e basta trocar os pontos em `CLIM`.

## 12. Régua no 3D (prévia 3D)

A prévia 3D usa a mesma ideia da §11, ajustada para uma câmera que tem zoom: **tudo o que tem 30 cm ou mais é desenhado no tamanho real**, e o que é menor ganha um exagero suave, sempre o mesmo e sem trocar a ordem:

`READ3(L) = L` para `L ≥ 0,3 m`; `READ3(L) = 0,3·(L/0,3)^0,6` para `L < 0,3 m` (borboleta de 8 cm → 14 cm; libélula de 7 cm → 13 cm).

Cada coisa do vale tem uma etiqueta e é **medida em metros** a cada abertura (`js/regua.js`): altura acima do chão e maior medida na horizontal, comparadas com o tamanho de verdade. No painel **Clima › Régua › Sim** aparece a tabela medida e seis **bonecos de 1,70 m** pelo vale (porta da casa, porteira do curral, beira do milho, moinho, vereda e cerrado), para conferir a olho.

| | Medido | Real |
|---|---|---|
| Árvore do cerrado | 5,0–7,0 m | 3–8 m |
| Ipê | 11–12 m | 5–12 m |
| Mata de galeria | 12,6–17 m | 9–20 m |
| Árvore de sombra do pasto | 11–12 m (copa 12–14 m) | 8–15 m |
| Buriti | 19,6–23,7 m | 14–26 m |
| Cupinzeiro | 0,9–1,8 m | 0,6–2,4 m |
| Casa (cumeeira · comprimento) | 5,2 m · 7–8 m | 4–6,2 m · 6–10,5 m |
| Capela com a torre | 12,6 m | 10–15 m |
| Moinho com as pás | 12,5 m | 10–16 m |
| Milho · girassol | 2,4 m · 1,9 m | 1,8–2,8 m · 1,5–3 m |
| Boi nelore (altura · comprimento) | 1,7 m · 3,0 m | 1,35–1,75 m · 2,3–3,0 m |
| Capivara | 0,67 m · 1,28 m | 0,45–0,7 m · 1,0–1,4 m |
| Garça-branca · seriema · galinha | 1,0 m · 0,9 m · 0,47 m | 0,85–1,05 · 0,7–0,95 · 0,3–0,55 m |
| Arara (envergadura) | 1,1 m | 0,9–1,3 m |

**O que a régua pegou e foi corrigido:** árvore do cerrado alta demais (até 9,7 m → até 7 m, tronco mais baixo e copa mais larga, como as tortas do cerrado), moitas de 3,2 m, capivara de 79 cm de altura e 1,5 m, garça de 1,2 m, seriema de 1,1 m, passarinhos do bando com 54 cm de envergadura, borboleta de 32 cm e libélula de 26 cm.

**Câmera do jogo e copas altas:** com o zoom, a câmera desce para 18–25 m e entra nas copas dos buritis (20–24 m). As copas que ficam entre a câmera e o ponto que se olha abrem uma janela pontilhada, e o que chega a menos de 14 m da lente se desfaz; a sombra delas no chão continua inteira.
