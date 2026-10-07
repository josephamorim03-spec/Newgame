# 09 - MVP e Implementação

## Pergunta do MVP

> Tomar uma região, sabendo que ela pode ajudar minha civilização e negar o rival de maneiras diferentes, é prazeroso e estrategicamente rico por sete turnos?

Todo código que não ajuda a responder isso é secundário.

## Escopo funcional

### Mapa

- aproximadamente 29 hexes;
- duas Capitais;
- regiões comuns;
- cinco Ruínas;
- dois Marcos;
- uma seed reproduzível.

### Jogadores

- humano;
- IA;
- hot-seat.

### Regras

- 7 ações por jogador;
- expansão apenas por adjacência;
- território permanente;
- Posto/Vila/Cidade;
- Vanguarda;
- Urbanização;
- Sabedoria;
- Marcos;
- Prestígio;
- Renome;
- dois Conselhos;
- 12 Doutrinas iniciais.

### UX

- retrato;
- preview;
- uma ação por toque/arraste;
- undo apenas antes da confirmação;
- feedback de cascata;
- onboarding de menos de 60 s.

## Fora do MVP

- login;
- servidor;
- matchmaking;
- ranked;
- monetização;
- campanha;
- progressão permanente;
- cosméticos;
- guildas;
- temporadas;
- daily;
- fog of war;
- captura territorial;
- combate;
- recursos econômicos;
- dezenas de biomas.

## Arquitetura recomendada para o protótipo

Para validação rápida mobile:

- HTML/CSS/JavaScript ou TypeScript simples;
- Canvas ou SVG para o mapa;
- estado puro e serializável;
- engine de regras separada da renderização;
- PRNG seeded;
- IA chamando a mesma API de ações do humano.

Evitar acoplar score, animação e regra.

## Modelo de estado conceitual

~~~text
GameState
  seed
  round
  currentPlayer
  regions[]
    owner
    siteType
    developmentLevel
    neighbors[]
  players[]
    prestige
    renown
    doctrines[]
  mandates[]
    holder
    metric
  council
~~~

## API conceitual

~~~text
getValidClaims(state, player)
previewClaim(state, player, region)
applyClaim(state, player, region)
resolveDevelopment(state)
resolveMandates(state)
resolveDoctrines(state, eventLog)
scoreRenown(eventLog)
chooseAIAction(state)
~~~

Preview e resolução devem compartilhar a mesma engine. Não escrever lógica duplicada para "o que vai acontecer" e "o que aconteceu".

## Event log

Toda resolução gera eventos semânticos:

~~~text
REGION_CLAIMED
RUIN_CLAIMED
VILLAGE_PROMOTED
CITY_PROMOTED
MANDATE_TIED
MANDATE_TRANSFERRED
DOCTRINE_TRIGGERED
RENOWN_AWARDED
~~~

A UI transforma eventos em animação e áudio.

Isso garante causalidade legível.

## Branch de implementação

A main deve continuar documental.

O primeiro código deve nascer em:

**limiar/prototype-v0.1**

Só após o núcleo provar valor deve surgir uma branch de produção.
