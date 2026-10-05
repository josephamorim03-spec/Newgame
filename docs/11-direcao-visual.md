# 11 — Direção Visual do Combate

## Objetivo
O combate deve parecer um **puzzle tático de mechs vs Kaijus**, não um dashboard. O tabuleiro é o foco; cartas, intenções e status orbitam a grade.

## Hierarquia
1. **Tabuleiro 4x4** — maior área visual.
2. **Telegrafia inimiga** — sempre visível e legível.
3. **Mech e Kaijus** — silhuetas distintas dos blocos.
4. **Mão** — cinco cartas, abaixo do tabuleiro.
5. **Reator / Energia / Turno** — compactos, sem competir com a grade.
6. **Relíquias** — topo, pequenas, persistentes.

## Paleta funcional

| Elemento | Cor |
|---|---|
| Fundo | #1A1A2E / #101820 |
| Casa vazia | #3A3A4A |
| Bloco 2 | #B8B8C8 |
| Bloco 4 | #7EC8E3 |
| Bloco 8 | #5FD068 |
| Bloco 16 | #FFD93D |
| Bloco 32 | #FF8C42 |
| Bloco 64 | #FF4C4C |
| Bloco 128+ | #B14CFF |
| Mech | #4FE0E0 |
| Artilheiro | #6B2D8C |
| Esmagador | #4A7C3A |
| Parasita | #D44A8C |
| Dano telegráfico | #FF0000 / 40% |
| Movimento telegráfico | #FFD700 / 40% |
| Energia | #FFD93D |
| Vida do reator | #FF4C4C |

## Formas
- **Blocos:** quadrados simples, número dominante.
- **Mech:** losango/hexágono técnico, ciano.
- **Artilheiro:** alongado, direção clara do canhão.
- **Esmagador:** massa larga e pesada.
- **Parasita:** pequeno, irregular, tentacular.
- **Telegráfica de dano:** linha/área vermelha tracejada.
- **Movimento:** seta amarela.
- **Destruição:** caveira/estilhaço.

## Gamefeel
### Deslize
- 160–220 ms.
- Movimento simultâneo dos blocos.
- Obstáculos devem interromper o fluxo visualmente.

### Fusão
- Compressão curta.
- Flash de 1 frame.
- Novo valor cresce e retorna.
- Partículas da cor do valor criado.
- Cadeias usam intensidade crescente.

### Dano
- Linha de ataque acende antes do impacto.
- Impacto curto; shake proporcional ao evento.
- Sem shake em ações rotineiras.

### Cartas
- Seleção levanta a carta.
- Casas válidas acendem.
- Prévia mostra o estado resultante antes da confirmação.

## Regra
**Informação tática nunca pode depender só de cor.** Cor + ícone + forma + posição.
