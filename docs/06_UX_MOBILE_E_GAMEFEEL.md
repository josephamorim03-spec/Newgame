# 06 - UX Mobile e Gamefeel

## Prioridade

A UI não pode ser a razão pela qual o jogo parece complexo.

O mapa é o centro. O jogador deve conseguir operar tudo com uma mão em retrato.

## Hierarquia da tela

Topo:

- Prestígio A x B;
- rodada;
- três Mandatos com titular atual.

Centro:

- mapa inteiro;
- fronteiras;
- Capitais;
- Ruínas;
- Marcos;
- níveis de desenvolvimento.

Rodapé compacto:

- duas Doutrinas do jogador;
- acesso às Doutrinas do rival;
- ajuda contextual mínima.

Não usar HUD lateral estreito com dezenas de números.

## Interação

Fluxo ideal:

1. tocar ou pressionar uma região válida;
2. preview aparece sem confirmar;
3. arrastar para outra região troca o preview;
4. soltar ou segundo toque confirma, conforme o playtest indicar mais segurança;
5. regiões inválidas não aceitam confirmação.

A primeira experiência não deve depender de tutorial textual longo.

## Preview

O preview deve responder:

- esta região entra para mim;
- quais Postos promovem;
- qual Mandato muda;
- qual Ruína/Marco é conquistado;
- qual Doutrina dispara.

Preferir símbolos e animação fantasma.

Exemplo conceitual:

~~~
+ território
Vila x2
Urbanização ↑
Sabedoria +1
Rival perde acesso ao Marco
~~~

A versão final deve reduzir texto ainda mais.

## Juice causal

### Incorporação

Som seco, curto, material: CLACK.

Pequeno haptic.

### Pulso territorial

Uma onda discreta percorre somente regiões causalmente afetadas.

Não deve atravessar o império inteiro por decoração.

### Promoção para Vila

THUM leve. A estrutura cresce no próprio hex.

### Promoção para Cidade

Som mais grave, pausa curta, silhueta claramente diferente.

### Ruína

Nota cristalina curta.

### Marco

Resposta mais rara e mais valiosa.

### Mandato roubado

O cartão do Mandato se desloca fisicamente do lado anterior para o novo titular.

Esse é um dos momentos de maior impacto da partida.

### Doutrina

A placa da Doutrina acende apenas quando ela participa de uma consequência.

## Ritmo

Planejamento: calmo.

Confirmação: seca.

Cascata: rápida e escalonada.

Retorno à decisão: imediato.

Uma resolução comum não deveria durar mais de aproximadamente 0,7 s. Uma grande cascata pode chegar perto de 1,5 s.

## Som no iOS

O protótipo web precisa considerar desde o início:

- AudioContext iniciado por gesto do usuário;
- retomada após suspensão;
- nenhum autoplay de áudio na carga;
- assets ou áudio procedural com caminhos compatíveis com deploy estático;
- teste real em Safari/iPhone, não apenas desktop.

## Legibilidade

Cores não podem ser a única diferença entre jogadores.

Usar:

- cor;
- padrão/contorno;
- orientação de ícone;
- forma de Capital.

Objetivo: screenshot de três segundos deve deixar claro onde está cada território e quais regiões ainda podem ser disputadas.
