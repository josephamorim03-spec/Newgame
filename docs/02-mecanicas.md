# 02 — Mecânicas

## Tabuleiro
- Grade fixa 4x4.
- Cada casa pode conter bloco, mech, Kaiju ou estar vazia.
- Blocos usam progressão 2, 4, 8, 16...

## Deslize
- O jogador escolhe uma direção.
- Blocos deslizam até obstáculo.
- Blocos iguais colidem e fundem.
- Mech e Kaijus alteram as rotas e criam topologia.

## Fusão
- 2+2=4, 4+4=8 etc.
- Cada fusão gera energia.
- Fusões em cadeia aumentam payoff.
- Fusão precisa ter custo de oportunidade espacial: criar um número maior deve também alterar o tabuleiro.

## Mech
- Ocupa uma casa.
- Possui 1 movimento ortogonal básico por turno.
- Ataque básico curto; cartas expandem alcance/movimento.
- Pode consumir bloco adjacente como munição.

## Kaijus
- Sempre mostram a próxima ação.
- Exemplos: atacar linha, esmagar bloco, consumir bloco, empurrar mech.
- O jogador deve conseguir prever o estado final antes de confirmar.

## Turno — alvo
1. Kaijus anunciam intenção.
2. Jogador move/desliza/manipula a grade.
3. Joga cartas dentro do orçamento de energia.
4. Confirma.
5. Kaijus resolvem.
6. Novo bloco entra / novo turno.

## Regra de ouro
Nenhuma ação deve ser automaticamente correta em todas as situações.
