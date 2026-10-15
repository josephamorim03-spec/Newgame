# Afluente, núcleo v5: o rio é o orçamento

Protótipo jogável para testar se a regra nova diverte, antes de levá-la ao vale 3D.

**O que mudou em relação ao jogo de hoje:**
- **Sai a mata ciliar:** a regra "a mata segura a água na seca" deixa de existir.
- **O rio vira o recurso:**
  - ele tem vazão (💧);
  - cada lavoura ou vila encostada nele gasta 1;
  - a água chega primeiro em quem está mais perto da nascente;
  - ligar o rio a um olho-d'água do mapa soma a vazão dele.
- **Do `../DIVERSAO_v4.md` ficam:**
  - as vilas que pedem uma coisa por vez e crescem;
  - a escolha entre dois pacotes de peças.
- **A seca:** cada nascente dá metade (4 vira 2), e a tela mostra antes quanto e quem vai secar. O botão 💧 do topo mostra o vale na seca.
- **Primeira partida:** dicas curtas aparecem na hora em que cada coisa acontece (nascente, olho-d'água, peça seca, seca chegando, seca, chuva). `python3 montar.py` gera `afluente-nucleo-v5.html`, um arquivo só que abre direto no navegador.

**Arquivos:**
- `regras.js`: o motor, sem desenho.
- `index.html`: o tabuleiro 2D jogável, publicado como Artifact (abre com um servidor local, por exemplo `python3 -m http.server`).
- `sim.mjs`: o simulador. Uso: `node sim.mjs 10 guloso`.

**Números do simulador** (bot guloso, 10 vales): só checam se as regras se sustentam, não se divertem.

| Medida | Valor |
|---|---|
| Duração | mediana 35 jogadas |
| Vazão no fim | 14, das quais 13 usadas: a água fica no limite |
| Pedidos atendidos | 5 por partida |
| Jogadas que ligam um olho-d'água | 13% |
| Jogadas em que nada acontece | 38% (eram 44% no jogo de hoje) |
| Bot ao acaso | não atende nenhum pedido e acaba em 20 jogadas: jogar bem faz diferença |
