# O juiz dos bichos

Relatório de `sim/juiz_bichos.js` (o motor fica em `prototipo3d/js/juiz.js`): 45 bichos com esqueleto, 335 mil triângulos no total. Nota média: **99**.

| Espécie | Nota | Forma | Pose | Movimento | Comportamento | Triângulos |
|---|---|---|---|---|---|---|
| capivara | **97** | 100 | 88 | 100 | 100 | 7596 |
| tamanduá-bandeira | **97** | 100 | 94 | 100 | 96 | 7056 |
| ovelha | **97** | 100 | 88 | 100 | 100 | 8312 |
| boi | **98** | 100 | 91 | 100 | 100 | 13876 |
| bezerro | **99** | 100 | 100 | 100 | 96 | 12884 |
| lobo-guará | **99** | 100 | 96 | 100 | 100 | 10016 |
| garça-branca | **100** | 100 | 100 | 100 | 100 | 3380 |
| seriema | **100** | 100 | 100 | 100 | 100 | 3452 |
| garça-moura | **100** | 100 | 100 | 100 | 100 | 3390 |
| galinha | **100** | 100 | 100 | 100 | 100 | 3652 |
| ema | **100** | 100 | 100 | 100 | 100 | 3364 |
| anta | **100** | 100 | 100 | 100 | 100 | 8100 |
| onça-pintada | **100** | 100 | 99 | 100 | 100 | 14060 |

## capivara (97)

Medidas: cern 0.64 · comp 1.19 · peito 0.68 · cab 0.45 · jF 176.3 · jH 144.1 · fora 0 · focinho 0.02 · vincoPastar 38 · vel 0.5 · deslize 0 · afunda 0.1 · apoio 0.64 · passo 1.23 · balanco 3.2 · joelhoAndando 163.2 · flutua 0.5 · ordem 1 · froude 0.41

Tempo: graze 43% · idle 32% · walk 15% · swim 8% · flee 2%

- **pose** (−12): pastando, a pele dobra/estica demais em 38 triângulos (pescoco 24, perna2 14)

## tamanduá-bandeira (97)

Medidas: cern 0.69 · comp 1.38 · peito 0.61 · cab 0.39 · jF 164.9 · jH 157.3 · fora 1.3 · vel 0.45 · deslize 0.01 · afunda 0.1 · apoio 0.64 · passo 0.96 · balanco 3.1 · joelhoAndando 161 · flutua 1.2 · ordem 1 · froude 0.4

Tempo: graze 37% · idle 3% · walk 61%

- **pose** (−6): perna sai do tronco: 1.3 cm para fora da silhueta (parado)
- **comportamento** (−4): andando 61% do tempo (o bicho de verdade: 15–55%)

## ovelha (97)

Medidas: cern 0.81 · comp 0.88 · peito 0.61 · cab 0.21 · jF 157.5 · jH 149 · fora 0 · focinho 0.02 · vincoPastar 8 · vel 0.49 · deslize 0.04 · afunda 0.1 · apoio 0.64 · passo 0.85 · balanco 3.3 · joelhoAndando 161.5 · flutua 1.4 · ordem 1 · froude 0.41

Tempo: graze 61% · idle 22% · walk 17%

- **pose** (−8): perna da frente dobrada parado: carpo a 157.5° (reta: 168–180°)
- **pose** (−3): pastando, a pele dobra/estica demais em 8 triângulos (perna2 8)

## boi (98)

Medidas: cern 1.43 · comp 1.74 · peito 0.56 · cab 0.47 · jF 176.3 · jH 150.6 · fora 0.4 · focinho 0.05 · vincoPastar 22 · vel 0.95 · deslize 0.11 · afunda 0.1 · apoio 0.64 · passo 1.05 · balanco 7.8 · joelhoAndando 163.4 · flutua 2.4 · ordem 1 · froude 0.42

Tempo: graze 49% · idle 19% · walk 31%

- **pose** (−9): pastando, a pele dobra/estica demais em 22 triângulos (pescoco 22)

## bezerro (99)

Medidas: cern 0.85 · comp 1.03 · peito 0.56 · cab 0.28 · jF 176.2 · jH 150.2 · fora 0.2 · vel 0.95 · deslize 0 · afunda 0.1 · apoio 0.64 · passo 1.22 · balanco 3.5 · joelhoAndando 162.9 · flutua 0.6 · ordem 1 · froude 0.41

Tempo: graze 55% · idle 15% · walk 30%

- **comportamento** (−4): parado 15% do tempo (o bicho de verdade: 20–60%)

## lobo-guará (99)

Medidas: cern 0.91 · comp 1.11 · peito 0.34 · cab 0.36 · jF 160.6 · jH 151.4 · fora 0.6 · vel 1.5 · deslize 0.01 · afunda 0.1 · apoio 0.66 · passo 1.24 · balanco 4.3 · joelhoAndando 160.4 · flutua 1 · ordem 1 · froude 0.41

Tempo: graze 25% · idle 25% · walk 50%

- **pose** (−4): perna da frente dobrada parado: carpo a 160.6° (reta: 165–180°)

## garça-branca (100)

Medidas: cern 0.95 · comp 0.43 · peito 0.26 · cab 0.18

Tempo: graze 9% · idle 68% · walk 22% · flee 1%

- nada a corrigir

## seriema (100)

Medidas: cern 0.83 · comp 0.42 · peito 0.34 · cab 0.12

Tempo: graze 51% · idle 17% · walk 32%

- nada a corrigir

## garça-moura (100)

Medidas: cern 1.19 · comp 0.56 · peito 0.29 · cab 0.31

Tempo: idle 83% · walk 11% · flee 6%

- nada a corrigir

## galinha (100)

Medidas: cern 0.46 · comp 0.26 · peito 0.45 · cab 0.08

Tempo: graze 71% · idle 14% · walk 11% · flee 4%

- nada a corrigir

## ema (100)

Medidas: cern 1.47 · comp 0.7 · peito 0.42 · cab 0.17

Tempo: graze 54% · idle 7% · walk 39%

- nada a corrigir

## anta (100)

Medidas: cern 1.07 · comp 1.82 · peito 0.64 · cab 0.55 · jF 176.4 · jH 156.2 · fora 0 · focinho 0.05 · vincoPastar 0 · vel 0.6 · deslize 0.01 · afunda 0.1 · apoio 0.64 · passo 0.98 · balanco 5 · joelhoAndando 157.4 · flutua 0.9 · ordem 1 · froude 0.4

Tempo: graze 53% · idle 11% · walk 36%

- nada a corrigir

## onça-pintada (100)

Medidas: cern 0.71 · comp 1.43 · peito 0.57 · cab 0.33 · jF 159.1 · jH 138.5 · fora 0.5 · vel 0.82 · deslize 0.1 · afunda 0.1 · apoio 0.64 · passo 1.38 · balanco 4.9 · joelhoAndando 160.4 · flutua 1.9 · ordem 1 · froude 0.41

Tempo: graze 15% · idle 48% · walk 34% · flee 3%

- **pose** (−1): perna da frente dobrada parado: carpo a 159.1° (reta: 160–180°)

## Fontes das medidas

- Ângulo do jarrete (150–155° ideal; 160° reto, 134° em foice): classificação linear dinamarquesa e guia Ayrshire.
- Perna da frente reta de lado (coluna), ombro a ~45°: extensões ACES (Alabama) e UT (Tennessee).
- Troca andar→trote perto de Froude 0,5 (Alexander & Jayes, 1983), com h = altura do quadril.
- Fração de apoio do andar 0,6–0,75 e sequência lateral das pisadas: biomecânica de quadrúpedes (Hildebrand).
- Tamanhos: fichas das espécies (zebu, capivara, ovelha, lobo-guará, onça-pintada, anta, tamanduá-bandeira, garças, seriema, ema, galinha).
- Tempo de pastejo do gado de dia (30–65%): estudos de comportamento ingestivo de bovinos a pasto.
