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
  - no vale, as sombras têm a escala da tabela métrica: um cúmulo de 400 m cobre 20 unidades.
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
| Vento | sinótico da monção + mistura diurna + rajadas + frente de rajada | capim, copas, fumaça, chuva inclinada, moinho, som do vento | `Sky.step` |
| Cúmulos | térmicas + nível de condensação | no horizonte, base reta no mesmo nível, subindo ao longo do dia; sombras de 300 m a 1,5 km | `covers`, `hzStep`, `ovStep` |
| Pancada | célula com cortina (mm/h), vida acelerada, anda com o vento das nuvens | sombra escura; borda da chuva atravessando o vale; chão molhando por peça | `spawnCell`, `rainAt`, `rainFx`, `wetGround` |
| Chuva contínua (ZCAS) | Ci → Cs → As → Ns | véus no céu, teto escuro e chuva fina | `eplan`, `drawSkyBand` |
| Gotas | Marshall-Palmer + velocidade terminal | garoa fina e deitada; temporal grosso e em pé | `ATM.drops`, `rainFx` |
| Raio e trovão | 343 m/s | clarão e raio sobre o vale; trovão segundos depois (estalo perto, ronco longe); relâmpago mudo ao longe | `flashFx`, `thunder` |
| Neblina | orvalho + ar frio no fundo do vale + água | véu na madrugada, flocos sobre o rio, que viram estrato de manhã | `fogOf`, `fogFx` |
| Arco-íris e halo | 42°/51° do ponto antissolar; 22° do sol | arcos parciais na borda do céu de manhã e à tarde nas Águas | `rainbowFx` |
| Redemoinho | térmica forte + vento fraco + chão seco | só na Seca, de dia, com vento < 5,5 m/s | `devilsStep` |
| Moinho | perfil log + abrigo + λ ≈ 2 + partida e freio | velas viram para o vento e giram; param à noite; recolhidas na ventania | `ATM.mill`, `drawMill` |
| Som | — | chuva pela intensidade; cigarras só no calor; sapos e pererecas nas noites molhadas | `ambUpdate` |

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
- **Desempenho:** o quadro custa o mesmo que na v1.9d (4,5 ms contra 5,3 ms no teste sem tela, celular em pé, 2×).

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
  - `envStep`, `drawSkyBand`, `hzStep`, `ovStep`, `cloudShadows`, `rainFx`, `wetGround`, `fogFx`, `flashFx`, `rainbowFx`: o desenho;
  - `drawMill`: o moinho;
  - `CEU`, `ceuMark`, `ceuIcon`: o Caderno do Céu;
  - `skyCard`: o boletim.
- `sim/atmos_motor.js`: cópia do motor, gerada por `node sim/extrair_motor.js`, que agora extrai também o `Engine`.
- `sim/atmos_teste.js`: o teste do clima. Uso: `node atmos_teste.js atmos_motor.js 10`.
- `arte/afluente_sprites.py`: modelo novo `windmill_torre` (o moinho sem velas) e atlas atualizado com `atualizar_atlas.py` e `embutir.py`.

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
