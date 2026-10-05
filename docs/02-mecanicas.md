# 02 — Mecânicas (histórico)

> Este documento registra o protótipo 0.3.0. Para as regras da campanha atual, veja [17 — Campanha tática](17-campanha-tatica.md).

## Arena e fusões

- A grade tem 4×4 casas. Cada casa contém no máximo um bloco, o Mech, o Artilheiro ou nada.
- Blocos seguem 2, 4, 8, 16, 32…; dois iguais fundem em um do dobro do valor. Cada bloco participa de no máximo uma fusão por deslize.
- Mech e Artilheiro são obstáculos fixos para o deslize; mover o Mech altera os corredores disponíveis.
- Um deslize sem deslocamento ou fusão é inválido e não consome a ação.

## Turno

1. O Artilheiro fixa a linha de ataque a partir do maior bloco presente no início do turno. A linha não muda durante esse turno.
2. O jogador precisa fazer um deslize válido. Pode também escolher **uma** reação opcional, antes ou depois dele: mover o Mech uma casa ortogonal vazia **ou** descarregar um bloco ortogonalmente adjacente ao Mech para cancelar o ataque. Não pode fazer as duas coisas.
3. Até confirmar, o jogador pode desfazer as ações do turno. A consequência do ataque é atualizada na interface conforme o tabuleiro muda.
4. Ao confirmar, se o ataque não foi cancelado: Mech na linha sofre 2 de dano no Reator; caso contrário, o maior bloco atualmente nessa linha é destruído; sem bloco, o ataque erra.
5. Primeiro são checadas derrota e vitória. Se a partida continuar, entra a próxima peça 2 ou 4 numa casa vazia, e uma nova linha é anunciada.

O valor da próxima peça é conhecido antes do turno; sua casa só é escolhida na entrada, sem preview ou reserva. Se não houver casa vazia, a peça aguarda uma vaga, preservando o valor anunciado.

## Fim da partida

- Vitória: após o ataque, Reator acima de 0 e pelo menos um bloco de valor 32 ou maior preservado.
- Derrota: Reator em 0, ou nenhuma sequência legal de reação e deslize consegue produzir um deslize válido.
- Não há cartas, energia, relíquias nem outros Kaijus nesta versão.

## Regra de ouro

Fundir deve melhorar a meta numérica, mas também alterar a posição e a exposição dos blocos; descarregar um bloco protege agora ao custo de progresso futuro.
