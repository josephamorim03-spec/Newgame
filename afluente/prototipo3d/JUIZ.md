# O juiz dos bichos

Relatório de `sim/juiz_bichos.js` (o motor fica em `prototipo3d/js/juiz.js`): 45 bichos com esqueleto, 320 mil triângulos no total. Nota média: **98**.

| Espécie | Nota | Forma | Pose | Movimento | Comportamento | Triângulos |
|---|---|---|---|---|---|---|
| boi | **92** | 82 | 92 | 95 | 100 | 13876 |
| bezerro | **94** | 91 | 94 | 100 | 92 | 12884 |
| capivara | **96** | 100 | 88 | 100 | 96 | 7060 |
| anta | **96** | 100 | 84 | 100 | 100 | 8100 |
| ovelha | **96** | 94 | 92 | 100 | 100 | 6120 |
| tamanduá-bandeira | **97** | 94 | 93 | 100 | 100 | 7056 |
| lobo-guará | **98** | 100 | 93 | 100 | 100 | 10016 |
| garça-branca | **100** | 100 | 100 | 100 | 100 | 3380 |
| seriema | **100** | 100 | 100 | 100 | 100 | 3452 |
| garça-moura | **100** | 100 | 100 | 100 | 100 | 3390 |
| galinha | **100** | 100 | 100 | 100 | 100 | 3652 |
| ema | **100** | 100 | 100 | 100 | 100 | 3364 |
| onça-pintada | **100** | 100 | 100 | 100 | 100 | 14060 |

## boi (92)

Medidas: cern 1.43 · comp 1.78 · peito 0.67 · cab 0.47 · jF 167.7 · jH 145.6 · fora 0.4 · focinho 0.06 · vincoPastar 20 · vel 0.87 · deslize 0.1 · afunda 0.1 · apoio 0.64 · passo 1.05 · balanco 10 · joelhoAndando 163.6 · flutua 2.2 · ordem 1 · froude 0.42

Tempo: graze 56% · idle 14% · walk 29% · drink 1%

- **forma** (−11): peito/altura 0.67 (o bicho de verdade: 0.48–0.6)
- **pose** (−8): pastando, a pele dobra/estica demais em 20 triângulos (pescoco 14, perna3 6)
- **forma** (−7): comprimento do corpo 1.78m (o bicho de verdade: 1.4–1.75m)
- **movimento** (−5): corpo sobe e desce 10 cm a cada passo (demais)
- **pose** (−0): perna da frente dobrada parado: carpo a 167.7° (reta: 168–180°)

## bezerro (94)

Medidas: cern 0.85 · comp 1.05 · peito 0.61 · cab 0.28 · jF 160.9 · jH 145 · fora 0.2 · vel 0.95 · deslize 0.02 · afunda 0.1 · apoio 0.64 · passo 1.22 · balanco 8.3 · joelhoAndando 166.1 · flutua 1.4 · ordem 1 · froude 0.41

Tempo: graze 64% · idle 15% · walk 21%

- **forma** (−9): peito/altura 0.61 (o bicho de verdade: 0.42–0.58)
- **pose** (−6): perna da frente dobrada parado: carpo a 160.9° (reta: 168–180°)
- **comportamento** (−4): parado 15% do tempo (o bicho de verdade: 20–60%)
- **comportamento** (−4): pastando/ciscando 64% do tempo (o bicho de verdade: 20–60%)

## capivara (96)

Medidas: cern 0.64 · comp 1.17 · peito 0.68 · cab 0.44 · jF 170.4 · jH 139.7 · fora 0 · focinho 0.02 · vincoPastar 46 · vel 0.5 · deslize 0.02 · afunda 0.1 · apoio 0.64 · passo 1.23 · balanco 3 · joelhoAndando 161.7 · flutua 1 · ordem 1 · froude 0.41

Tempo: graze 47% · idle 16% · walk 22% · drink 1% · swim 12% · flee 2%

- **pose** (−12): pastando, a pele dobra/estica demais em 46 triângulos (pescoco 26, perna2 14)
- **comportamento** (−4): parado 16% do tempo (o bicho de verdade: 20–60%)

## anta (96)

Medidas: cern 1.07 · comp 1.82 · peito 0.64 · cab 0.55 · jF 157.1 · jH 158.7 · fora 0 · focinho 0.02 · vincoPastar 52 · vel 0.6 · deslize 0.01 · afunda 0.1 · apoio 0.64 · passo 0.98 · balanco 4.4 · joelhoAndando 155.5 · flutua 1.1 · ordem 1 · froude 0.4

Tempo: graze 60% · idle 12% · walk 28%

- **pose** (−12): pastando, a pele dobra/estica demais em 52 triângulos (perna2 21, perna3 21)
- **pose** (−4): perna da frente dobrada parado: carpo a 157.1° (reta: 162–180°)

## ovelha (96)

Medidas: cern 0.81 · comp 0.88 · peito 0.62 · cab 0.27 · jF 166.8 · jH 154 · fora 0 · focinho 0.01 · vincoPastar 17 · vel 0.5 · deslize 0.02 · afunda 0.1 · apoio 0.64 · passo 0.85 · balanco 2.8 · joelhoAndando 164.5 · flutua 1 · ordem 1 · froude 0.41

Tempo: graze 60% · idle 18% · walk 22%

- **pose** (−7): pastando, a pele dobra/estica demais em 17 triângulos (perna2 17)
- **forma** (−6): peito/altura 0.62 (o bicho de verdade: 0.45–0.62)
- **pose** (−1): perna da frente dobrada parado: carpo a 166.8° (reta: 168–180°)

## tamanduá-bandeira (97)

Medidas: cern 0.69 · comp 1.38 · peito 0.6 · cab 0.39 · jF 176.3 · jH 159.9 · fora 1.3 · vel 0.44 · deslize 0.03 · afunda 0.1 · apoio 0.63 · passo 0.96 · balanco 3.3 · joelhoAndando 160 · flutua 0.8 · ordem 1 · froude 0.4

Tempo: graze 44% · idle 4% · walk 53%

- **pose** (−7): perna sai do tronco: 1.3 cm para fora da silhueta (parado)
- **forma** (−6): peito/altura 0.6 (o bicho de verdade: 0.6–0.85)

## lobo-guará (98)

Medidas: cern 0.91 · comp 1.11 · peito 0.36 · cab 0.36 · jF 166 · jH 153.8 · fora 1.4 · vel 1.5 · deslize 0.01 · afunda 0.1 · apoio 0.66 · passo 1.24 · balanco 4.1 · joelhoAndando 160.6 · flutua 1 · ordem 1 · froude 0.41

Tempo: graze 33% · idle 16% · walk 50%

- **pose** (−7): perna sai do tronco: 1.4 cm para fora da silhueta (parado)

## garça-branca (100)

Medidas: cern 0.95 · comp 0.43 · peito 0.26 · cab 0.18

Tempo: graze 17% · idle 51% · walk 28% · flee 4%

- nada a corrigir

## seriema (100)

Medidas: cern 0.83 · comp 0.42 · peito 0.34 · cab 0.12

Tempo: graze 45% · idle 21% · walk 35%

- nada a corrigir

## garça-moura (100)

Medidas: cern 1.19 · comp 0.56 · peito 0.29 · cab 0.31

Tempo: graze 4% · idle 82% · walk 8% · flee 6%

- nada a corrigir

## galinha (100)

Medidas: cern 0.46 · comp 0.26 · peito 0.45 · cab 0.08

Tempo: graze 64% · idle 17% · walk 13% · flee 6%

- nada a corrigir

## ema (100)

Medidas: cern 1.47 · comp 0.7 · peito 0.42 · cab 0.17

Tempo: graze 53% · idle 16% · walk 31%

- nada a corrigir

## onça-pintada (100)

Medidas: cern 0.71 · comp 1.43 · peito 0.61 · cab 0.33 · jF 176.3 · jH 144.9 · fora 0.1 · vel 0.86 · deslize 0.03 · afunda 0.1 · apoio 0.64 · passo 1.38 · balanco 5.8 · joelhoAndando 165.4 · flutua 0.7 · ordem 1 · froude 0.41

Tempo: graze 4% · idle 47% · walk 49%

- nada a corrigir

## Fontes das medidas

- Ângulo do jarrete (150–155° ideal; 160° reto, 134° em foice): classificação linear dinamarquesa e guia Ayrshire.
- Perna da frente reta de lado (coluna), ombro a ~45°: extensões ACES (Alabama) e UT (Tennessee).
- Troca andar→trote perto de Froude 0,5 (Alexander & Jayes, 1983), com h = altura do quadril.
- Fração de apoio do andar 0,6–0,75 e sequência lateral das pisadas: biomecânica de quadrúpedes (Hildebrand).
- Tamanhos: fichas das espécies (zebu, capivara, ovelha, lobo-guará, onça-pintada, anta, tamanduá-bandeira, garças, seriema, ema, galinha).
- Tempo de pastejo do gado de dia (30–65%): estudos de comportamento ingestivo de bovinos a pasto.
