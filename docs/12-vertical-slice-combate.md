# 12 — Vertical Slice de Combate

## Escopo
O primeiro slice não implementa a run inteira. Ele valida apenas:

- grade 4x4;
- blocos 2/4/8/16...;
- 1 Mech;
- Artilheiro + Esmagador;
- telegrafia perfeita;
- 1 deslize grátis por turno;
- 1 movimento grátis do Mech;
- mão de 5 cartas;
- energia 3 + bônus por fusão;
- bloco adjacente como munição;
- resolução inimiga;
- vitória/derrota.

## Regras resolvidas

### Mech
O Mech **não possui HP separado no MVP**. Se um Kaiju atinge o Mech, o dano vai para o Reator. Isso evita um segundo medidor de vida.

### Ocupação
Cada casa contém apenas uma entidade principal: bloco, Mech, Kaiju ou vazio.

### Movimento do Mech
- 1 movimento ortogonal gratuito por turno.
- Só pode entrar em casa vazia.
- Cartas podem alterar essa regra depois.

### Bloco como munição
- Mech pode consumir um bloco ortogonalmente adjacente.
- Dano = valor do bloco, com teto temporário de 16 no protótipo.
- É forte porque sacrifica progressão 2048.

### Artilheiro
- Telegráfa uma linha/coluna.
- Se o Mech estiver na linha atingida, Reator sofre 2.
- Caso contrário, destrói o menor bloco da linha atingida.
- O jogador sempre vê qual linha será atacada antes de agir.

### Esmagador
- Telegráfa a casa para a qual tentará avançar.
- Se houver bloco: destrói e ocupa a casa.
- Se houver Mech: Reator sofre 2 e o Esmagador não entra.
- Se estiver vazia: ocupa a casa.

## Turno
1. Inimigos mostram intenção.
2. Jogador pode executar **1 deslize grátis**.
3. Jogador pode mover o Mech **1 vez grátis**.
4. Jogador usa cartas enquanto tiver energia.
5. Jogador confirma.
6. Inimigos resolvem.
7. Novo bloco entra.
8. Compra nova mão e energia volta a 3.

## Cartas do vertical slice
1. Ataque Básico — 1 energia — 2 dano, alcance 2.
2. Ataque Básico — 1 energia.
3. Empurrão — 1 energia — empurra Kaiju 1 casa.
4. Criar Bloco — 1 energia — cria 2 em casa vazia.
5. Fusão Forçada — 2 energia — funde dois blocos adjacentes iguais.

## Vitória
Derrotar os dois Kaijus.

## Derrota
Reator chega a 0.

## Critério de sucesso
Depois de 5 minutos, o jogador deve conseguir prever:
- o que o inimigo fará;
- o efeito do deslize;
- se vale sacrificar um bloco como munição;
- se uma fusão melhora ou piora o espaço.
