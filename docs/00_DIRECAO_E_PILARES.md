# 00 — Direção, público e pilares

## 1. Problema que o jogo tenta resolver

Existe um público que gosta de Balatro, Slay the Spire, Isaac, Brotato, Tetris, 2048 e Geometry Dash por razões parecidas, apesar de os jogos parecerem diferentes.

Esse público procura:
- começar rapidamente;
- aprender fazendo;
- sentir que está ficando melhor;
- construir algo que pareça pessoal;
- descobrir interações;
- adaptar-se ao que recebeu;
- ocasionalmente “quebrar” o sistema;
- perder entendendo por quê;
- tentar de novo sem atrito;
- ter algo novo para pensar mesmo depois de centenas de runs.

RING//BREAK deve atender a esse desejo sem virar:
- clone de Balatro;
- deckbuilder com skin diferente;
- “2048 com poderes”;
- auto-battler;
- match-3 tradicional;
- puzzle de fases descartáveis;
- RPG disfarçado.

## 2. Público-alvo comportamental

Não definimos o público primariamente por idade ou plataforma.

O jogador central é alguém que sente prazer em:
- otimizar sistemas;
- perceber padrões;
- montar sinergias;
- comparar soluções;
- reconhecer que uma derrota veio de uma escolha;
- fazer uma run absurda e querer mostrar para alguém.

Ele pode jogar 5 minutos no celular ou duas horas no PC.

## 3. Os seis desejos que o design deve alimentar

### 3.1 Domínio
“Estou ficando melhor.”

O jogo precisa permitir evolução de habilidade sem obrigar progressão numérica permanente.

### 3.2 Descoberta
“Não sabia que isso interagia com aquilo.”

A descoberta deve vir de regras combináveis, não de tutorial infinito.

### 3.3 Autoria
“Eu construí esta máquina.”

Uma run precisa adquirir identidade própria.

### 3.4 Adaptação
“Recebi uma situação ruim e encontrei uma saída.”

RNG serve para propor problemas, não decidir resultados.

### 3.5 Transgressão
“Consegui fazer algo que parecia proibido.”

Runs raras devem produzir resultados absurdos.

### 3.6 Expressão social
“Olha o que aconteceu na minha run.”

Seeds, replays, desafios e estatísticas devem transformar runs em objetos compartilháveis.

## 4. Pilares de design

### Pilar 1 — Uma ação; muitas consequências

O verbo fundamental é **girar**.

A profundidade vem do que esse giro pode causar:
- mudança direta de posição;
- propagação por Phase Lock;
- Ressonância;
- criação de novo Lock;
- resposta de Protocolos;
- cascata;
- neutralização de Intent;
- alteração de fila;
- ganho/perda de risco futuro.

Evitar adicionar novos botões quando uma nova interação pode ser expressa por uma regra.

### Pilar 2 — Legibilidade sem resolver o puzzle

O jogador deve enxergar:
- quais anéis vão se mover;
- quais Phase Locks serão consumidos;
- quais Ressonâncias diretas serão criadas;
- qual ameaça está chegando.

O jogo não deve obrigatoriamente mostrar:
- toda cascata futura;
- todo refill oculto;
- a solução ótima;
- a ação recomendada.

**Automatizar cálculo; nunca automatizar julgamento.**

### Pilar 3 — Profundidade descoberta, não apresentada

A primeira partida deve funcionar com:
- girar;
- alinhar;
- ressoar.

Phase Lock pode ser ensinado alguns movimentos depois.

Protocolos entram depois.

Anomalias complexas entram depois.

O jogador deve pensar “tem mais coisa aqui” em vez de “preciso decorar tudo antes de jogar”.

### Pilar 4 — Conteúdo multiplicativo

Preferir:
- uma regra que interage com 20 regras existentes;

a:
- 20 itens independentes.

Cada novo Protocolo deve perguntar:
> “Que comportamentos antigos ele torna novos?”

### Pilar 5 — Derrota informativa

Depois de perder, o jogador deve conseguir formar uma hipótese:
- “gastei o Lock cedo demais”;
- “ignorei o ataque no setor 5”;
- “forcei Echo quando a run estava oferecendo Anchor”.

Uma derrota que não gera hipótese reduz replay.

### Pilar 6 — Ritmo sem tempo morto

Todo intervalo entre:
> “tive uma ideia”

e
> “quero testá-la”

deve ser minimizado.

Prioridades:
- restart em um toque;
- drafts rápidos;
- animações aceleráveis;
- nenhuma caminhada;
- nenhum hub obrigatório;
- nenhuma confirmação redundante.

### Pilar 7 — O jogo pode ser quebrado

Balanceamento não deve esterilizar a fantasia de combinação.

A meta não é impedir runs absurdas.

A meta é:
- torná-las raras;
- exigir compreensão;
- manter o modo competitivo comparável;
- separar “Standard” de experiências deliberadamente caóticas quando necessário.

## 5. Anti-pilares

### Não: progressão permanente de poder
Evitar:
- +5% energia inicial;
- +10% vida permanente;
- árvore de status.

### Não: conteúdo como substituto de profundidade
Não lançar 300 Protocolos antes de provar que 30 geram decisões diferentes.

### Não: RNG sem contrajogo
Se o jogador perde e pensa “não havia nada que eu pudesse fazer”, revisar.

### Não: dificuldade que só reduz builds viáveis
Mais difícil deve significar:
- novas restrições;
- timing mais exigente;
- leitura mais profunda.

Não apenas:
- números maiores;
- menos vida;
- inimigos esponja.

### Não: wiki obrigatória
Tooltip e Atlas devem existir dentro do produto.

### Não: efeitos visuais escondendo estado
Gamefeel deve reforçar a leitura do tabuleiro.

### Não: “retenção por obrigação”
Evitar depender de:
- energia;
- login diário punitivo;
- streak com perda;
- timers artificiais;
- FOMO.

## 6. A frase de pitch

> **Gire três anéis, crie Ressonâncias e transforme alinhamentos parciais em Phase Locks que mudam a física dos seus próximos movimentos. Construa Protocolos até sua pequena máquina começar a fazer coisas que você não imaginava no início da run.**

## 7. A pergunta de qualidade

Antes de adicionar qualquer feature:

> **Isso cria uma nova decisão interessante ou apenas mais uma coisa para administrar?**

Se for a segunda opção, cortar.
