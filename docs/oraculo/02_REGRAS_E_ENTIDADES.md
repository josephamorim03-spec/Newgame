# 02 — Regras e entidades

## Tabuleiro

MVP:

- grade 4×4;
- câmera fixa;
- células grandes;
- sem pan ou zoom.

5×5 só depois de o 4×4 provar baixa carga cognitiva.

## Fases universais

### 1. MOVER
Todas as Figuras tentam mover uma casa simultaneamente.

### 2. COLIDIR
Conflitos são resolvidos.

### 3. DISPARAR
Torres disparam.

### 4. REAGIR
Entidades ativadas resolvem até estabilizar.

## FIGURA

```text
A →
```

Propriedades:

- ID;
- posição;
- direção;
- viva/destruída.

Move uma casa em MOVER.

IDs existem para permitir profecias nominais: "A colide com B".

## TORRE

```text
T →
```

- não se move;
- possui direção;
- dispara em linha;
- o primeiro bloqueador recebe o impacto;
- Pilar bloqueia;
- Bomba pode ser ativada;
- Figura pode ser destruída.

Linha de tiro atual fica visível.

## BOMBA

```text
X
```

- inerte até ser atingida;
- explode nas oito células vizinhas;
- pode ativar outra Bomba;
- cria cadeias claras.

## PILAR

```text
█
```

- imóvel;
- bloqueia movimento;
- bloqueia tiro;
- sem regra extra no MVP.

## Colisões

### Mesmo destino
Duas ou mais Figuras tentando terminar na mesma célula colidem e são destruídas.

### Troca de posição
Se A tenta ir para B e B tenta ir para A, ambas colidem.

### Célula bloqueada
Se o destino contém Pilar, Torre ou Bomba imóvel, a Figura permanece na origem.

## Intervenções

### IMPULSO
Mover uma Figura uma casa ortogonal.

### DESVIO
Girar a intenção de Figura ou Torre 90°.

## Custo canônico

```text
custo =
Σ distância_manhattan(pos_final, pos_original)
+
Σ distância_angular_em_quartos(dir_final, dir_original)
```

Distância angular usa o menor caminho:

- 90° = 1;
- 180° = 2;
- voltar ao original = 0.

## Não entram ainda

- empurrão;
- escudo;
- status;
- dano numérico;
- HP;
- cooldown;
- teleport;
- reflexo;
- IA;
- sorte.

Cada entidade futura deve gerar várias novas relações profetizáveis com regra legível.
