# 16 — Auditoria de bugs e invariantes do vertical slice

Atualizado após a revisão mobile do input e da telegráfica.

## Bugs corrigidos

### Swipe acidental
Problema: pequenos movimentos do dedo podiam ser interpretados como deslize.

Correção:
- input do grid usa Pointer Events;
- gesto exige deslocamento mínimo relevante;
- exige direção dominante;
- toque gerado logo após um swipe é ignorado;
- não há handlers touch duplicados;
- um deslize sem alteração real do tabuleiro não consome a ação.

## Spawn do próximo bloco

Regra consolidada:
1. Antes do deslize, o jogador conhece o **valor** do próximo bloco.
2. Um deslize válido resolve o novo estado do grid.
3. Só então o jogo escolhe e mostra a **casa exata** de entrada.
4. Essa casa fica reservada até o fim do turno.
5. Movimento do robô, Criar 2 e Empurrar não podem ocupar a casa reservada.
6. O spawn não é reroteado silenciosamente.
7. Se uma violação de estado conseguir bloquear a entrada, o bloco prometido é adiado em vez de ser trocado por outro.

Motivo: a posição precisa ser informação confiável, não uma previsão que muda escondido.

## Ordem do turno

Regra:
- o deslize é obrigatório para abrir o turno;
- depois dele, movimento do robô, cartas e tiro de bloco são opcionais e podem ser combinados;
- Encerrar Turno só fica disponível após um deslize válido.

A interface não deve fingir que movimento e cartas são obrigatórios.

## Intenções inimigas

Intenções são contratos congelados.

### Artilheiro
- congela linha e bloco-alvo no início do turno;
- se o robô continuar na linha: dano no Reator;
- se sair da linha e o bloco-alvo ainda estiver exatamente ali: destrói aquele bloco;
- se o alvo mudou/sumiu: erra;
- nunca escolhe outro bloco na resolução.

### Esmagador
- congela casa-alvo;
- se for empurrado e a casa deixar de ser adjacente: intenção quebrada;
- não teleporta para o alvo antigo.

### Parasita
- congela célula e valor do bloco que pretende consumir;
- se o bloco sair, fundir ou mudar de valor: intenção quebrada;
- não escolhe outro bloco na resolução.

A UI agora mostra **o que acontecerá se o turno terminar naquele instante**, sem recalcular o alvo.

## Cartas

- cartas sem alvo legal ficam desabilitadas;
- cartas não podem ser usadas antes do deslize obrigatório;
- Fusão só permite escolher um primeiro bloco que realmente tenha par adjacente;
- cartas usadas saem da mão;
- o mesmo card não pode ser executado repetidamente por acidente.

## Munição

Regra canônica:
**dano = valor do bloco consumido**.

Foi removido o teto escondido de 16 que contradizia a documentação.

## Gemas Gêmeas

A primeira fusão do turno sobe um nível adicional.

O feedback `GÊMEAS!` agora só aparece quando o efeito realmente foi acionado; fusões posteriores não reutilizam o feedback incorretamente.

## Checks estruturais

O protótipo possui validação interna de estado para detectar:
- unidade fora do grid;
- duas unidades na mesma casa;
- unidade sobre bloco;
- casa de spawn reservada ocupada.

Esses problemas geram aviso no console durante desenvolvimento.

## Invariantes a preservar

1. Nenhum alvo inimigo muda escondido durante o turno.
2. Nenhuma ação inválida deve consumir recurso.
3. Nenhum swipe sem movimento deve consumir o deslize.
4. Informação mostrada como exata deve permanecer exata.
5. Nenhum handler de input deve ser registrado dentro de render().
6. Uma carta indisponível deve parecer indisponível antes do toque.
7. O jogador deve conseguir prever o resultado de Encerrar Turno olhando a tela.
