# 04 — Balanceamento (histórico)

> Os números abaixo eram do protótipo 0.3.0. Valores atuais e metas das sete fases: [17 — Campanha tática](17-campanha-tatica.md).

## Números de partida

- Reator inicial: **8 HP**.
- Ataque do Artilheiro: **2 de dano** se o Mech estiver na linha anunciada; fora dela, destrói o maior bloco da linha.
- Vitória: preservar um bloco **32 ou maior** após o ataque, com HP acima de 0.
- Por turno: **1 deslize válido obrigatório** e **até 1 reação opcional** (mover ou descarregar), em qualquer ordem.
- Próxima peça: 2 ou 4, valor revelado antes de entrar; casa sorteada apenas após o ataque.

## Princípios

- O objetivo exige fusões, não apenas sobrevivência ou dano ao Kaiju.
- Descarregar um bloco cancela um ataque, mas sacrifica massa necessária para alcançar 32.
- Mover o Mech altera tanto a exposição ao ataque quanto os corredores do próximo deslize.
- A linha anunciada é fixa no turno e a consequência exata deve permanecer legível após cada ação.
- O sorteio da casa da próxima peça não pode bloquear uma reação ainda disponível.
- Evitar partidas decididas apenas pelo acaso do spawn ou por um único caminho dominante.

## Métricas do protótipo

- taxa de vitória e turnos até alcançar 32;
- dano recebido, separado entre evitável e inevitável;
- fusões e maior bloco por turno;
- frequência de movimento, descarga e turno sem reação;
- derrotas por grade travada, inclusive com casas vazias;
- frequência de turnos sem solução plausível por causa da entrada de 2/4;
- tempo médio por decisão e uso de desfazer no celular.
