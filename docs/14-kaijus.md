# 14 — Kaijus: contrato de telegrafia e execução

## Princípio
A intenção inimiga é um **contrato visível**. Ela pode ser quebrada pelo jogador, mas nunca pode ser secretamente recalculada depois que o turno começa.

Isso é crucial para o jogo funcionar como puzzle tático.

## Regras gerais

1. O inimigo escolhe sua intenção no início do turno.
2. A UI mostra todas as casas afetadas.
3. Movimento do Mech não faz o inimigo escolher outro alvo.
4. Empurrões podem invalidar uma intenção.
5. Se a geometria necessária deixa de existir, a ação falha em vez de teleportar ou retargetear.
6. A ordem de resolução deve ser determinística e visível.
7. Status têm duração finita e decrementam no início da fase inimiga.

## Artilheiro

### Estado
- HP: 6.
- Dano: 2.
- Papel: pressão de linha.

### Telegrafia
O Artilheiro escolhe uma linha ou coluna no início do turno. Essa faixa fica fixa até a resolução.

### Execução
- Se o Mech estiver na faixa: Reator sofre 2.
- Se não estiver, o protótipo pode destruir o menor bloco atingido.
- Nunca retargeteia porque o Mech se moveu.

### Força
Obriga reposicionamento e cria conflito entre proteger o Reator e preservar topologia.

## Esmagador

### Estado
- HP: 8.
- Dano: 2.
- Papel: destruir topologia.

### Telegrafia
Mostra a casa de destino.

### Execução
- A casa deve continuar adjacente ao Esmagador.
- Se houver bloco: destrói e ocupa.
- Se houver Mech: causa 2 ao Reator.
- Se estiver vazia: ocupa.
- Se um Empurrão tornou o destino não adjacente: **INTENÇÃO QUEBRADA** e a ação falha.

### Observação
Esse detalhe é importante: manter um alvo absoluto e depois mover o Esmagador não pode resultar em teleporte.

## Parasita

### Estado
- HP inicial: 5.
- HP máximo: 10.
- Papel: punir blocos altos mantidos perto dele.

### Telegrafia
Escolhe o maior bloco ortogonalmente adjacente.

### Execução
- Se o bloco ainda existir: consome e recupera +2 HP.
- Se o alvo foi removido antes da resolução: a ação falha.
- Sem bloco adjacente no início do turno: telegráfa um movimento simples.

### Por que funciona
Cria tensão direta contra a estratégia clássica de manter um número grande protegido.

## Arquiteto

### Estado correto
- HP total: 20.
- Fase 1: HP 20 → 11.
- Fase 2: HP <= 10.

### Correção importante
Não usar max_hp=10 e hp=10 na fase 1. Isso faria a condição hp <= 10 ativar a fase 2 imediatamente.

### Fase 1
- Invoca Parasitas em até 2 casas livres.
- Alterna ou combina com uma área 2x2 telegráfica.

### Fase 2
- Modifica uma regra de fusão do combate.
- Usa ataques em linha mais fortes.
- A alteração de regra deve ficar persistente e explícita na UI.

## Status

### Queimadura
- 1 dano no início da fase inimiga.
- duração diminui em 1.

### Congelamento
- impede ação por 1 turno.
- duração diminui mesmo quando o Kaiju não age.

### Atordoamento
- impede ação por 1 turno.
- duração diminui mesmo quando o Kaiju não age.

### Erro a evitar
Não decrementar apenas Queimadura. Congelamento e Atordoamento permanentes quebrariam o combate.

## Ordem recomendada da fase inimiga

1. Tick de status.
2. Remover mortos.
3. Resolver intenções em ordem de iniciativa visível.
4. Aplicar mudanças de fase de chefe.
5. Spawn de bloco.
6. Gerar as intenções do próximo turno.

## Pontos corrigidos em relação ao rascunho inicial

- Arquiteto passa a ter 20 HP reais.
- Congelamento/Atordoamento não são permanentes.
- Esmagador não teleporta para um alvo antigo depois de ser empurrado.
- Intenções não são recalculadas silenciosamente.
- Fallbacks não usam aleatoriedade escondida durante a fase do jogador.

## Regra de ouro
**O jogador pode alterar o resultado previsto; o jogo nunca pode alterar escondido o que foi previsto.**
