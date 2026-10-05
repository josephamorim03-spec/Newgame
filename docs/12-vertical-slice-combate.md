# 12 — Vertical Slice de Combate (histórico)

> Este documento descreve o protótipo 0.3.0 e foi substituído pela campanha atual em [17 — Campanha tática](17-campanha-tatica.md). As regras abaixo não são canônicas para o jogo aberto em `index.html`.

Registro do contrato do antigo vertical slice com um Artilheiro.

## Arena e meta

- Grade 4×4 com blocos 2, 4, 8, 16, 32…; uma casa contém um bloco, o Mech, o Artilheiro ou fica vazia.
- Mech e Artilheiro interrompem o deslize dos blocos. O Artilheiro permanece fixo.
- Reator começa com **8 HP**. O Mech não possui outra barra de vida.
- Vitória: **após o ataque**, preservar ao menos um bloco 32 ou maior com Reator acima de 0. Derrota: Reator chega a 0 ou não é possível obter um deslize válido, mesmo com uma reação legal.

## Intenção do Artilheiro

- No início do turno, ele escolhe a linha do maior bloco presente. Empates usam o menor índice no tabuleiro (de cima para baixo, da esquerda para a direita); se não houver blocos, mira a linha do Mech.
- A linha fica fixa até a confirmação. A consequência mostrada ao jogador é recalculada depois de cada ação: com Mech na linha, o Reator perderá 2 HP; sem Mech, o maior bloco ainda nessa linha será destruído; sem bloco, o tiro errará.
- Descarregar um bloco cancela o ataque do turno. A interface deve marcar a intenção como cancelada.

## Ações do jogador

- **Deslize:** exatamente um válido por turno; desloca e funde blocos em uma direção. Um gesto que não muda a grade não consome a ação.
- **Reação opcional:** no máximo uma por turno, antes ou depois do deslize. Escolha entre mover o Mech uma casa ortogonal vazia **ou** descarregar um bloco ortogonalmente adjacente ao Mech para cancelar o ataque. Descarregar destrói o bloco; não causa dano ao Artilheiro.
- **Desfazer:** antes de confirmar, o jogador pode restaurar ações ainda não confirmadas para tentar outra linha de jogo.
- **Confirmar:** só é permitido após um deslize válido. Se nenhuma reação legal conseguir liberar um deslize, a grade está travada e a partida acaba.

## Ordem de resolução

1. Anunciar a linha inimiga e o valor da próxima peça (2 ou 4), sem prever sua casa.
2. Jogador age e pode desfazer antes de confirmar.
3. Ao confirmar, resolver ou cancelar o ataque anunciado.
4. Verificar derrota e vitória, nessa ordem. Um bloco 32 destruído pelo tiro não satisfaz a meta; Reator em 0 prevalece sobre a meta.
5. Se a partida continuar, inserir a peça anunciada numa casa vazia. Não existe reserva de casa. Sem vaga, a peça espera mantendo o mesmo valor.
6. Iniciar o próximo turno e anunciar sua nova linha.

## Critério de sucesso da experiência

Em poucos minutos, o jogador entende por que cada fusão aproxima a meta mas também expõe blocos, consegue prever o efeito de confirmar e percebe o custo de descarregar um bloco para proteger o tabuleiro.
