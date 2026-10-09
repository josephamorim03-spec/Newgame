# Dice Duel: progressão, moedas e cosméticos

> Versão 0.7. Os números saem de `sim/economia.py`.

## 1. Princípio: progredir sem pagar para vencer

- **As cartas ampliam o estilo, não a força.**
  - Seis cartas vêm liberadas: Ajuste, Virar, Pressa, Coringa, Âncora e Interferência.
  - Cinco se compram com moedas: Rerrolar, Espelho, Sobrecarga, Fundo Falso e Pedágio.
  - **Medido:** o melhor deck só com cartas grátis (Ajuste + Âncora + Interferência) vence **60,8%** contra o campo.
    **Nenhum dos 113 decks com carta comprada passa dele**; o melhor deles faz 57,5%.
- **Moedas só vêm de vitórias,** e rendem mais quando a vitória é melhor.
- **Cartas nunca são vendidas por dinheiro.** Dinheiro (no futuro) só compra aparência.
- **Toda partida faz progredir,** ganhando ou perdendo: a experiência (XP) sobe sempre, e os níveis dão
  presentes cosméticos. Assim, quem perde muito ainda sente que está andando.

## 2. Moedas por vitória

```
moedas = base do modo × margem × rapidez
margem  = 1 + min(1, diferença de pontos / (meta × 2/3))   → ×1,0 a ×2,0 (na meta 12, vencer por 8+ dobra)
rapidez = ×1,5 em até 5 Mesas · ×1,25 em 6 · ×1,0 depois   (na meta 16: 7 e 8 Mesas)
```

**Calibração** (6.000 vitórias entre robôs, `sim/economia.py`):
- a margem mediana é de 4 pontos;
- a partida mediana usa 7 Mesas;
- o bônus de rapidez sai em 16% das vitórias (×1,5) e em 33% (×1,25).

| Modo | Base | Vitória apertada (p25) | Típica (mediana) | Excelente (máx.) |
|---|---|---|---|---|
| Biscoito (iniciante) | 8 | 11 | 14 | 24 |
| Dona Coruja (avançado) | 14 | 19 | 24 | 42 |
| Online (futuro) | 22 | 30 | 38 | 66 |

Uma vitória excelente rende mais de 2× uma apertada: quem joga bem é recompensado de forma visível.

## 3. Contra o farm

| Situação | Regra |
|---|---|
| Jogador forte farmando o modo fácil | cada rival só paga moedas enquanto o **maior rating já alcançado** estiver abaixo de um teto: Biscoito até 1.050, Dona Coruja até 1.400. Acima disso, as moedas vêm do online |
| Perder de propósito para baixar o rating | não adianta: o teto olha o pico, não o rating atual |
| Duas pessoas no mesmo aparelho | não dá moedas nem rating |
| Online: atropelar iniciantes (smurf) | proposta: multiplicar por `1 + clamp((rating do rival − seu rating) / 400, −0,5, +0,5)`. Vencer quem é melhor vale até ×1,5; vencer quem é bem pior, ×0,5 |

O **rating** do protótipo é provisório: um Elo (K = 32) contra o rating fixo de cada rival (Biscoito 850,
Dona Coruja 1.250). No jogo final, o rating online é a referência.

**Títulos por rating:** Aprendiz de mesa (até 999), Jogador de chá (1.000), Tecelão de correntes (1.150),
Mestre do Bolso (1.300) e Grão-mestre da Mesa (1.450).

## 4. Experiência e níveis

**Ganhos por partida:**
- vitória: +20 XP; derrota: +10 XP;
- +3 por bom momento (até +15).

**Níveis:** 60, 150, 280, 450, 700… XP.

**Presentes (só cosméticos):**
- nível 2: ícone Xícara;
- nível 3: dado Menta;
- nível 5: mesa Noite estrelada.

## 5. Loja (preços em moedas)

| Categoria | Itens |
|---|---|
| **Cartas** | Rerrolar 90 · Espelho 110 · Sobrecarga 120 · Fundo Falso 140 · Pedágio 140 (total 600) |
| **Dados** | Marfim (grátis) · Madeira 80 · Rosa 120 · Pelúcia 220 · Dourado 450 (reluz) · Diamante 800 (reluz) · Menta (nível 3) |
| **Ícones** | Bolinha (grátis) · Raposa 100 · Sapinho 100 · Cogumelo 140 · Xícara (nível 2) |
| **Mesas** | Feltro sálvia (grátis) · Feltro vinho 150 · Piquenique 250 · Noite estrelada (nível 5) |

**Quanto tempo leva:**
- **todas as cartas:** ~25 vitórias contra a Dona Coruja (~4 a 5 horas jogando);
- **tudo, cartas e cosméticos (~3.000 moedas):** ~125 vitórias contra a Coruja ou ~80 online.

As cartas chegam rápido; os cosméticos caros (Dourado, Diamante) ficam como metas longas.

**Onde aparece:**
- a skin vale para os seus dados na corrente, no Bolso e na Mesa;
- cada rival usa a sua (Biscoito, rosa; Dona Coruja, madeira);
- o ícone aparece na sua ficha e na tela de "versus";
- a mesa muda o feltro inteiro.

**Vitrine:** a Dona Coruja joga com cartas que você ainda não tem. Ver o que elas fazem é o melhor anúncio da Loja.

## 6. Dinheiro de verdade (quando houver)

- **Só cosméticos.** Cartas, moedas de jogo e vantagens, nunca.
- **Compra direta com preço visível.** Nada de caixa de sorte ou pacote aleatório: além de ser o que mais
  incomoda jogadores, já é regulado em vários países.
- **Sem energia, sem limite de partidas e sem avisos insistentes.**
- **Todo cosmético pago tem um equivalente que se ganha jogando** (como Menta e Noite estrelada), para ninguém
  sentir que a mesa bonita é só de quem pagou.

## 7. Riscos e o que medir no teste

| Risco | O que observar |
|---|---|
| **Moeda só na vitória frustra quem perde muito** | quantas partidas até a 1ª vitória; abandono depois de 3 derrotas seguidas. Se pesar, dar 1–2 moedas por derrota contra a Coruja, ou missões diárias leves |
| **A margem incentiva humilhar o rival** | no online, o ajuste por rating (§3) já compensa |
| **Os preços** | se as 5 cartas saírem em menos de 2 horas, encarecer os cosméticos, não as cartas |
| **O teto de 1.400 deixa o jogador forte sem moedas antes do online existir** | no protótipo, a mensagem do fim de partida explica e aponta o online |
| **Duas contas combinando resultado no online** | o mesmo par vale rating e moedas 3 vezes por dia; vitória por desistência não paga (docs/servidor.md) |
| **Resultado falso contra os rivais do jogo** (eles rodam no aparelho) | com conta, essas vitórias pagam até 300 moedas por dia; o ranking só conta partidas online, que o servidor arbitra |
