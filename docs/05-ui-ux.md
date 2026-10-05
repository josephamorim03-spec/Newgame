# 05 — UI/UX (histórico)

> Esta hierarquia é do protótipo 0.3.0. A interface vertical atual está descrita em [17 — Campanha tática](17-campanha-tatica.md).

## Hierarquia
1. Grade 4×4 e valores dos blocos.
2. Meta 32, Reator e linha de ataque.
3. Mech, Artilheiro e consequência se confirmar agora.
4. Próxima peça por valor, reação opcional, desfazer e confirmar.

## Regras

- A linha do Artilheiro não muda dentro do turno; a previsão de dano, bloco destruído ou erro atualiza após deslize, movimento ou descarga.
- A posição da próxima peça **não** aparece antes da entrada nem reserva uma casa. Só o valor 2/4 é anunciado.
- A grade nunca fica coberta por HUD, botões ou efeitos.
- Ameaças e alvos usam texto, forma/padrão e cor; não dependem somente de vermelho/ciano.
- Ações indisponíveis parecem indisponíveis antes do toque. Um deslize sem mudança não consome ação.
- Até confirmar, desfazer restaura ações do turno. Depois da confirmação, o resultado é definitivo.
- Animações explicam causa e efeito sem atrasar a leitura do estado final; respeitar preferência por movimento reduzido.

## Feedback

- deslize: deslocamento físico curto; fusão: compressão, impacto e novo valor;
- descarga: bloco sai da grade, projétil vai ao Artilheiro e a intenção muda para “cancelada”;
- dano: impacto breve e perda de HP explícita;
- linha de ataque: marca estática e contínua antes da confirmação, sem piscar a ponto de ocultar números;
- spawn: revelação apenas depois do ataque.

## Fluxo e celular

- Mostre uma instrução contextual junto à grade: deslize, escolha uma reação, desfaça ou confirme.
- Swipe na grade e quatro botões de direção executam a mesma regra. Gestos diagonais/curtos não executam ações.
- Casas e botões interativos mantêm alvo confortável para toque; telas curtas usam controles no fluxo, sem rodapé sobre a grade e com espaço para a área segura do aparelho.
- Mostre o modo de movimento/descarga e os alvos legais antes do toque final; cancelar seleção não consome reação.
- Tutorial inicial curto; explicação completa no botão de ajuda; controle de mudo sempre acessível.
