# O juiz dos bichos

Relatório de `sim/juiz_bichos.js` (o motor fica em `prototipo3d/js/juiz.js`): 45 bichos com esqueleto, 320 mil triângulos no total. Nota média: **99**.

| Espécie | Nota | Forma | Pose | Movimento | Comportamento | Triângulos |
|---|---|---|---|---|---|---|
| anta | **94** | 100 | 75 | 100 | 100 | 8100 |
| boi | **96** | 100 | 90 | 95 | 100 | 13876 |
| capivara | **97** | 100 | 88 | 100 | 100 | 7060 |
| ovelha | **98** | 100 | 90 | 100 | 100 | 6120 |
| bezerro | **99** | 100 | 100 | 100 | 95 | 12884 |
| lobo-guará | **99** | 100 | 100 | 100 | 96 | 10016 |
| garça-branca | **100** | 100 | 100 | 100 | 100 | 3380 |
| seriema | **100** | 100 | 100 | 100 | 100 | 3452 |
| garça-moura | **100** | 100 | 100 | 100 | 100 | 3390 |
| galinha | **100** | 100 | 100 | 100 | 100 | 3652 |
| ema | **100** | 100 | 100 | 100 | 100 | 3364 |
| tamanduá-bandeira | **100** | 100 | 100 | 100 | 100 | 7056 |
| onça-pintada | **100** | 100 | 100 | 100 | 100 | 14060 |

## anta (94)

Medidas: cern 1.07 · comp 1.82 · peito 0.64 · cab 0.55 · jF 176.3 · jH 176.3 · fora 1.3 · focinho 0.01 · vincoPastar 36 · vel 0.6 · deslize 0.01 · afunda 0.1 · apoio 0.64 · passo 0.98 · balanco 4.4 · joelhoAndando 155.3 · flutua 1 · ordem 1 · froude 0.4

Tempo: graze 50% · idle 14% · walk 24% · swim 13%

- **pose** (−12): pastando, a pele dobra/estica demais em 36 triângulos (perna3 17, perna2 13)
- **pose** (−7): perna sai do tronco: 1.3 cm para fora da silhueta (parado)
- **pose** (−6): jarrete a 176.3° (perna boa: 130–166°)

## boi (96)

Medidas: cern 1.43 · comp 1.74 · peito 0.56 · cab 0.47 · jF 176.3 · jH 149.9 · fora 0.4 · focinho 0.03 · vincoPastar 24 · vel 0.87 · deslize 0.1 · afunda 0.1 · apoio 0.64 · passo 1.05 · balanco 9.8 · joelhoAndando 163 · flutua 2.4 · ordem 1 · froude 0.42

Tempo: graze 59% · idle 17% · walk 24% · drink 1%

- **pose** (−10): pastando, a pele dobra/estica demais em 24 triângulos (pescoco 22, perna3 2)
- **movimento** (−5): corpo sobe e desce 9.8 cm a cada passo (demais)

## capivara (97)

Medidas: cern 0.64 · comp 1.17 · peito 0.68 · cab 0.44 · jF 176.3 · jH 143 · fora 0 · focinho 0.02 · vincoPastar 38 · vel 0.5 · deslize 0.02 · afunda 0.1 · apoio 0.64 · passo 1.23 · balanco 3.1 · joelhoAndando 162.6 · flutua 0.5 · ordem 1 · froude 0.41

Tempo: graze 31% · idle 17% · walk 21% · drink 4% · swim 27%

- **pose** (−12): pastando, a pele dobra/estica demais em 38 triângulos (pescoco 24, perna2 14)

## ovelha (98)

Medidas: cern 0.81 · comp 0.88 · peito 0.61 · cab 0.27 · jF 159.7 · jH 150.4 · fora 0 · focinho 0.01 · vincoPastar 8 · vel 0.5 · deslize 0.02 · afunda 0.1 · apoio 0.64 · passo 0.85 · balanco 2.8 · joelhoAndando 164.2 · flutua 1.4 · ordem 1 · froude 0.41

Tempo: graze 66% · idle 14% · walk 20%

- **pose** (−7): perna da frente dobrada parado: carpo a 159.7° (reta: 168–180°)
- **pose** (−3): pastando, a pele dobra/estica demais em 8 triângulos (perna2 8)

## bezerro (99)

Medidas: cern 0.85 · comp 1.03 · peito 0.56 · cab 0.28 · jF 176.3 · jH 152.5 · fora 0.2 · vel 0.95 · deslize 0.02 · afunda 0.1 · apoio 0.64 · passo 1.22 · balanco 8.1 · joelhoAndando 166 · flutua 1.6 · ordem 1 · froude 0.41

Tempo: graze 53% · idle 12% · walk 34%

- **comportamento** (−5): parado 12% do tempo (o bicho de verdade: 20–60%)

## lobo-guará (99)

Medidas: cern 0.91 · comp 1.11 · peito 0.34 · cab 0.36 · jF 166.2 · jH 153.9 · fora 0.5 · vel 1.5 · deslize 0.01 · afunda 0.1 · apoio 0.66 · passo 1.24 · balanco 4.2 · joelhoAndando 160.1 · flutua 0.9 · ordem 1 · froude 0.41

Tempo: graze 41% · idle 18% · walk 42%

- **comportamento** (−5): pastando/ciscando 41% do tempo (o bicho de verdade: 0–35%)

## garça-branca (100)

Medidas: cern 0.95 · comp 0.43 · peito 0.26 · cab 0.18

Tempo: graze 13% · idle 47% · walk 38% · flee 2%

- nada a corrigir

## seriema (100)

Medidas: cern 0.83 · comp 0.42 · peito 0.34 · cab 0.12

Tempo: graze 42% · idle 19% · walk 38%

- nada a corrigir

## garça-moura (100)

Medidas: cern 1.19 · comp 0.56 · peito 0.29 · cab 0.31

Tempo: idle 86% · walk 9% · flee 5%

- nada a corrigir

## galinha (100)

Medidas: cern 0.46 · comp 0.26 · peito 0.45 · cab 0.08

Tempo: graze 67% · idle 14% · walk 14% · flee 5%

- nada a corrigir

## ema (100)

Medidas: cern 1.47 · comp 0.7 · peito 0.42 · cab 0.17

Tempo: graze 52% · idle 13% · walk 35%

- nada a corrigir

## tamanduá-bandeira (100)

Medidas: cern 0.69 · comp 1.38 · peito 0.61 · cab 0.39 · jF 160.1 · jH 151 · fora 1.1 · vel 0.44 · deslize 0.02 · afunda 0.1 · apoio 0.63 · passo 0.96 · balanco 3.3 · joelhoAndando 159.6 · flutua 1.3 · ordem 1 · froude 0.4

Tempo: graze 37% · idle 5% · walk 58%

- nada a corrigir

## onça-pintada (100)

Medidas: cern 0.71 · comp 1.43 · peito 0.57 · cab 0.33 · jF 160.8 · jH 139.3 · fora 0.4 · vel 0.86 · deslize 0.03 · afunda 0.1 · apoio 0.64 · passo 1.38 · balanco 5.8 · joelhoAndando 164.6 · flutua 1.9 · ordem 1 · froude 0.41

Tempo: graze 16% · idle 51% · walk 28% · flee 6%

- nada a corrigir

## Fontes das medidas

- Ângulo do jarrete (150–155° ideal; 160° reto, 134° em foice): classificação linear dinamarquesa e guia Ayrshire.
- Perna da frente reta de lado (coluna), ombro a ~45°: extensões ACES (Alabama) e UT (Tennessee).
- Troca andar→trote perto de Froude 0,5 (Alexander & Jayes, 1983), com h = altura do quadril.
- Fração de apoio do andar 0,6–0,75 e sequência lateral das pisadas: biomecânica de quadrúpedes (Hildebrand).
- Tamanhos: fichas das espécies (zebu, capivara, ovelha, lobo-guará, onça-pintada, anta, tamanduá-bandeira, garças, seriema, ema, galinha).
- Tempo de pastejo do gado de dia (30–65%): estudos de comportamento ingestivo de bovinos a pasto.
