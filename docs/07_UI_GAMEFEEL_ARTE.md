# 07 — UI, controles, gamefeel e arte

Arte não é o foco desta fase, mas legibilidade e resposta sensorial são parte da mecânica.

---

# 1. Direção estética

Evitar:
- steampunk genérico;
- tabuleiro cheio de engrenagens literais;
- wire/circuit aesthetic semelhante a jogos de automação;
- pixel art obrigatória;
- excesso de partículas.

Direção sugerida:

> **instrumento cinético espectral**

Materiais:
- vidro fosco;
- cerâmica;
- metal limpo;
- luz emissiva;
- fundo escuro;
- linhas concêntricas precisas.

A máquina parece:
- tecnológica;
- tátil;
- elegante;
- pouco narrativa.

---

# 2. Phase Lock visual

Não representar como uma engrenagem industrial obrigatoriamente.

Melhor:
- ponte luminosa;
- onda estacionária;
- arco de fase;
- duas marcas sincronizadas.

Isso reforça “ressonância” e afasta o projeto de puzzle mecânico convencional.

---

# 3. Mobile portrait-first

Layout conceitual:

```text
┌─────────────────────┐
│ ANOMALIA      2      │
│ Ruptura  42/80       │
│                     │
│      ╭────────╮      │
│   ╭──╯ R1     ╰──╮   │
│  │    ╭────╮     │   │
│  │ R2 │ R3 │     │   │
│   ╰──╮╰────╯  ╭──╯   │
│      ╰────────╯      │
│                     │
│ NEXT: ● ▲ ◆ ■ ...   │
│                     │
│ [P][P][P][P][P]      │
└─────────────────────┘
```

O tabuleiro deve ocupar a maior parte da largura útil.

---

# 4. Desktop

O mesmo board.

Laterais podem mostrar:
- Protocolos;
- Atlas rápido;
- stats;
- fila maior.

Não redesenhar o jogo completamente para desktop.

---

# 5. Hierarquia de feedback

## Giro comum
- click mecânico curto;
- snap;
- haptic mínimo.

## Novo Phase Lock
- “clack”/pulso;
- arco de fase aparece.

## Ressonância
- impacto grave;
- pequena expansão radial;
- glifos convergem.

## Cascata
- pitch/ritmo sobe progressivamente;
- feedback acelera;
- sem esconder board.

## Engine Break
- resposta audiovisual rara;
- música abre camada;
- iluminação do Core muda.

---

# 6. Specialist Dance Principle

Eventos realmente raros devem ser **celebrados**, não apenas calculados.

Exemplos:
- primeiro ×16 da run;
- primeiro loop emergente;
- Singularity ativada;
- recorde pessoal;
- boss derrotado no último timing.

O jogo reconhece:
> “isso foi especial.”

Mas não celebrar tudo.

---

# 7. Som como estado do sistema

A estrutura circular permite um sistema musical elegante.

Cada Tom pode possuir:
- timbre;
- nota;
- textura.

Ressonância:
- forma acorde.

Phase Lock:
- introduz intervalo/ritmo.

Cascata:
- adiciona camadas.

A run pode soar progressivamente mais complexa conforme a máquina fica mais complexa.

Importante:
**não é um rhythm game.**

Áudio reforça estado e recompensa.

---

# 8. Preview

Ao arrastar:

- ring alvo se desloca em ghost;
- anéis propagados também;
- setas mostram sentido;
- Locks consumidos pulsam;
- Ressonâncias diretas recebem halo.

Nunca obrigar o jogador a imaginar a cinemática de três anéis mentalmente.

A decisão deve ser difícil.
O controle não.

---

# 9. Tooltips

Tap/hold em Protocolo:

```text
AFTERTONE

A primeira Ressonância do encontro
repete 50% da Energia.

Ativações nesta run: 17

[interações descobertas]
```

Jogador avançado obtém informação no próprio jogo.

---

# 10. Redução de movimento

Opções:
- Screen shake off;
- flash reduzido;
- particle density;
- haptic off;
- animation speed 1×/2×/4×;
- instant resolve opcional depois de dominar tutorial.

Não remover informação junto com efeitos.

---

# 11. Cor

Todo estado importante precisa possuir redundância:
- cor;
- forma;
- animação/ícone.

Nunca:
> vermelho versus verde é a única informação.

---

# 12. Texto

Durante o puzzle:
- mínimo.

Anomalia:
- ícone + countdown + região.

Protocolos:
- texto apenas quando inspecionados.

---

# 13. Restart

Após derrota:

```text
COLAPSO

Intent: SPOKE 6
Cascata máxima: ×8

[ RETRY ]
[ NOVA SEED ]
```

`Retry` deve ser focado/selecionado por padrão.

---

# 14. Velocidade adaptada ao domínio

Não mudar automaticamente sem consentimento.

Mas oferecer:
- animação 2× após algumas runs;
- 4×;
- Fast Resolve.

Veterano deve gastar tempo pensando, não esperando.
