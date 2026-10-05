# Protótipo 0.1 — decisões implementadas

Esta nota tem precedência sobre hipóteses do GDD v0.3 quando descreve o código desta versão. O GDD original foi preservado para comparação.

## Escopo

Vertical slice próximo ao MVP v2: três encontros, oito Protocolos, preview, locks, cascata e restart. Inclui também laboratório livre, replay e Atlas local para facilitar o playtest. Não é a implementação do produto completo.

## Ajuste necessário: descanso do link

As primeiras simulações mostraram que dar uma carga nova a um link imediatamente após consumi-lo podia manter as duas arestas continuamente ligadas. Isso reduzia seis controles nominais aos mesmos dois movimentos globais.

Regra experimental adotada: **um link atravessado na ação atual não pode gerar nova carga nessa mesma ação**. As cargas restantes continuam disponíveis. A restrição não custa ação nem usa recurso extra. No turno seguinte, o link volta a poder receber carga.

O jogador alterna entre explorar acoplamentos e recuperar independência. Esta é uma hipótese para playtest, não um resultado validado de diversão.

## Identidade dos pares

Novos alinhamentos são comparados por IDs dos dois glifos, não apenas por cor ou posição. Um par que continua junto ao se deslocar não pode gerar cargas repetidas. Refill cria glifos com novos IDs. A geração se limita a uma carga por aresta por ação.

## Protocolos

| Família | Nome | Regra exata implementada |
|---|---|---|
| Phase | Contrapeso | +3 energia por carga usada. |
| Phase | Co-rotação | Propagação no mesmo sentido. |
| Phase | Malha completa | Se ambos os links tinham carga no início da ação, ×2 nas ressonâncias dessa ação. |
| Echo | Pós-tom | Primeira ressonância de cada ação ganha +50%, sem consumo ou refill adicional. |
| Echo | Reverberação | Ondas 2 em diante têm um ×2 adicional. |
| Prism | Tríade | Uma vez por ação, o menor setor com três tons diferentes também ressoa; base 5. Pode ocorrer junto às ressonâncias normais. |
| Anchor | Fortaleza | Ressonância no setor ameaçado dá 1 escudo, máximo 1; absorve um dano futuro no encontro. |
| Flux | Antevisão | Fila visível de 12 tons. |

Pós-tom ocorre uma vez por ação, em vez de uma vez por encontro como em um exemplo do GDD. Isso torna seu comportamento fácil de observar na mini-run. Reverberação não altera o movimento nem repõe glifos duas vezes. Tríade não fica reativando em todas as ondas da mesma ação.

Run: zero Protocolos no primeiro encontro, um após a primeira vitória, dois após a segunda. Laboratório: até três Protocolos escolhidos diretamente. Todos os oito estão disponíveis neste protótipo; famílias locais sorteadas ficam para a próxima etapa.

## Anomalias e contrajogo

| Encontro | Meta | Intervalo | Contrajogo |
|---|---:|---:|---|
| Needle | 60 | 5 ações | Ressoar no setor marcado antes do ataque. |
| Parasite | 100 | 4 ações | Ter zero cargas no link marcado quando a contagem termina. Se houver cargas, remove todas e causa um dano. |
| The Clamp | 160 | 4 ações | Ressoar no setor marcado; um anel bloqueado para escolha manual ainda pode girar por propagação. O bloqueio muda a cada novo Intent. |

Ressonância normal ou Tríade pode neutralizar ataque setorial. A ameaça neutralizada mantém sua contagem e não causa dano ao vencer o prazo. A vitória por energia tem precedência sobre ataque pronto. Integridade e escudos reiniciam no próximo encontro.

## Determinismo e limites

Seed + modo + decisões reconstroem o mesmo estado. Escolhas e Rewrite são parte do registro. A alteração de Protocolos no modo livre reinicia o tabuleiro e registra a configuração para preservar reprodução.

Até 32 ondas por ação; multiplicador-base limitado a ×1024; detecção de repetição durante cascata. Não são promessas de balanceamento final. Os limites impedem uma resolução infinita de travar o navegador.

## Critérios do próximo playtest

1. O jogador entende o gesto e sua primeira ressonância sem ajuda externa?
2. Consegue explicar em quais sentidos os três anéis giram com dois links ativos?
3. Explora a carga ou a percebe apenas como inconveniente?
4. O descanso do link cria ritmo ou confunde o jogador?
5. Parasite muda uma escolha ou só acrescenta dano arbitrário?
6. O chefe incentiva usar propagação para mover o anel bloqueado?
7. Consegue descrever sua build após a vitória?
8. Quer testar espontaneamente outra configuração no laboratório?

Estatísticas automatizadas de uma política simples não substituem essas respostas.
