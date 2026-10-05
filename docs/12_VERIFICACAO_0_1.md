# Verificação do protótipo 0.1

## Motor

13 testes de regressão passaram com `npm test`:

- abertura seeded e preview sem mutação;
- direção e consumo da propagação;
- descanso dos links usados;
- geração correta de pares nas duas arestas;
- ordem da reposição;
- cascatas e multiplicadores de Protocolos;
- limite de Tríade;
- vitória antes do ataque pendente;
- bloqueio manual com propagação permitida;
- neutralização e escudo;
- draft e Rewrite;
- replay normal/laboratório e rejeição de entradas inválidas;
- 2.000 ações com estado válido, finito e reproduzível.

## Interface

Verificação automatizada em Chromium com Playwright:

- viewports 390×844, 320×700 e 1440×950;
- sem erros de JavaScript ou console e sem overflow horizontal;
- toque no botão de giro;
- arraste tangencial do anel via eventos reais de toque;
- teclado;
- salvar e retomar após recarregar;
- reprodução de uma mini-run completa da seed FIRST-LIGHT-2, passando por escolhas de Protocolos e vitória;
- retry imediato;
- laboratório com dois Protocolos, persistência e replay;
- HTML standalone aberto diretamente com rede desligada, executando a primeira jogada.

As capturas de celular, desktop, vitória e tela estreita foram inspecionadas visualmente. A verificação em viewport móvel não equivale a testar Safari em um iPhone físico.

## Limites destas evidências

O teste automatizado confirma que as interações funcionam e que uma sequência vencedora atravessa o fluxo completo. Não valida diversão, profundidade ou retenção.

O simulador de política simples em 100 seeds é ferramenta exploratória. Sua taxa de vitória varia com os critérios usados para escolher jogadas; não deve ser interpretada como taxa de vitória de jogadores humanos ou balanceamento aprovado.
