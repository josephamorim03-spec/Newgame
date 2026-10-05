# 16 — Auditoria de regras e invariantes do vertical slice (histórico)

> Esta auditoria cobre o protótipo 0.3.0. Os invariantes da campanha atual estão em [17 — Campanha tática](17-campanha-tatica.md) e nos testes de `tests/`.

Este documento cobre a versão enxuta. As regras antigas de casa reservada, alvo de bloco congelado, cartas, energia, relíquias e múltiplos Kaijus foram substituídas; não devem orientar correções no jogo atual.

## Entrada mobile

- Um swipe só é aceito com distância mínima e direção dominante; toque curto e gesto diagonal não gastam o deslize.
- Um deslize que não altera o tabuleiro é inválido. O toque gerado ao fim do swipe não pode ativar outra ação.
- Botões de direção e gesto na grade obedecem à mesma lógica. Alvos de reação e confirmação permanecem utilizáveis em tela estreita.

## Spawn sem reserva

- Antes do turno, só o **valor** da próxima peça 2/4 é conhecido.
- Nenhuma casa é pré-selecionada, mostrada como preview ou bloqueada para o Mech.
- Depois de confirmado e resolvido o ataque, checam-se derrota e vitória; só então, se a partida continuar, escolhe-se uma casa vazia e a peça entra.
- Se não houver casa vazia, a entrada é adiada sem trocar o valor prometido. O spawn jamais sobrepõe bloco ou unidade.

## Ordem e desfazer

- Uma reação opcional (mover **ou** descarregar) pode ocorrer antes ou depois do único deslize válido.
- Confirmar permanece indisponível até um deslize válido. Ações sem efeito não consomem o orçamento.
- Desfazer antes da confirmação restaura o estado anterior da jogada sem avançar ataque, turno ou valor da próxima peça.
- Se não existir deslize válido, mesmo depois de uma reação legal, a derrota por grade travada é explícita.

## Contrato da intenção

- O Artilheiro fixa a **linha**, não um bloco específico, ao começar o turno. Ela contém o maior bloco inicial; empates escolhem o menor índice. Sem blocos, mira a linha do Mech.
- A consequência é calculada sobre o estado atual e exibida antes de confirmar: Mech na linha → Reator −2; senão, maior bloco na linha destruído; sem bloco → erro.
- Descarregar um bloco adjacente cancela o ataque, não causa dano ao Artilheiro e impede movimento no mesmo turno.
- Nenhum spawn ocorre entre o último preview da consequência e a resolução inimiga.

## Invariantes de estado

1. Cada casa tem no máximo um ocupante principal; unidades nunca dividem casa com blocos.
2. Uma fusão usa cada bloco no máximo uma vez por deslize.
3. Intenção, HP, maior bloco, estado da reação e próxima peça mostrados na UI correspondem ao estado usado na resolução.
4. Nenhuma ação inválida consome deslize ou reação.
5. Reator em 0 causa derrota antes de avaliar o bloco 32; o bloco 32 precisa sobreviver ao ataque para vencer.
6. O valor anunciado da peça é preservado ao desfazer ou adiar sua entrada.
7. Renderizar novamente a grade não instala handlers duplicados de input.

## Cenários mínimos de regressão

- Tentar mover o Mech para a casa onde uma peça poderia surgir é legal antes do spawn.
- Deslizar 2–2–2 produz 4–2, não 8; obstáculos separam os segmentos.
- Mover o Mech dentro da linha anunciada ainda causa dano; sair dela expõe o maior bloco remanescente.
- Descarregar um bloco adjacente elimina esse bloco e cancela o ataque; não permite mover no mesmo turno.
- Criar 32 e perdê-lo para o ataque não vence. Chegar a 0 HP no mesmo turno de um 32 sobrevivente perde.
- Sem espaço para spawn, nenhum ocupante é substituído e o próximo valor não muda.
