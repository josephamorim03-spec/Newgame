# O juiz dos bichos

Relatório de `sim/juiz_bichos.js` (o motor fica em `prototipo3d/js/juiz.js`): 45 bichos com esqueleto, 320 mil triângulos no total. Nota média: **95**.

| Espécie | Nota | Forma | Pose | Movimento | Comportamento | Triângulos |
|---|---|---|---|---|---|---|
| boi | **88** | 82 | 94 | 75 | 100 | 13876 |
| anta | **90** | 93 | 68 | 100 | 100 | 8100 |
| ovelha | **91** | 86 | 88 | 100 | 92 | 6120 |
| bezerro | **92** | 91 | 100 | 81 | 95 | 12884 |
| tamanduá-bandeira | **92** | 94 | 89 | 88 | 96 | 7056 |
| capivara | **93** | 100 | 88 | 91 | 95 | 7060 |
| onça-pintada | **93** | 100 | 100 | 77 | 95 | 13396 |
| garça-moura | **96** | 100 | 100 | 100 | 86 | 3390 |
| lobo-guará | **96** | 100 | 93 | 92 | 100 | 10016 |
| garça-branca | **100** | 100 | 100 | 100 | 100 | 3380 |
| seriema | **100** | 100 | 100 | 100 | 100 | 3452 |
| galinha | **100** | 100 | 100 | 100 | 100 | 3652 |
| ema | **100** | 100 | 100 | 100 | 100 | 3364 |

## boi (88)

Medidas: cern 1.43 · comp 1.78 · peito 0.67 · cab 0.47 · jF 176.3 · jH 149.7 · fora 0.4 · focinho 0.08 · vincoPastar 14 · vel 0.87 · deslize 0.73 · afunda 0.1 · apoio 0.64 · passo 1.05 · balanco 7.7 · joelhoAndando 174.9 · flutua 4.6 · ordem 1 · froude 0.42

Tempo: graze 51% · idle 18% · walk 31%

- **movimento** (−18): casco patina no apoio: 0.73 m/s (pisada firme: < 0,1 m/s)
- **forma** (−11): peito/altura 0.67 (o bicho de verdade: 0.48–0.6)
- **movimento** (−7): no apoio o casco fica 4.6 cm acima do chão
- **forma** (−7): comprimento do corpo 1.78m (o bicho de verdade: 1.4–1.75m)
- **pose** (−6): pastando, a pele dobra/estica demais em 14 triângulos (pescoco 14)

## anta (90)

Medidas: cern 1.09 · comp 1.86 · peito 0.64 · cab 0.56 · jF 137.3 · jH 140.1 · fora 0 · focinho 0.11 · vincoPastar 18 · vel 0.6 · deslize 0.02 · afunda 0.1 · apoio 0.64 · passo 0.98 · balanco 4.7 · joelhoAndando 169.9 · flutua 2.9 · ordem 1 · froude 0.42

Tempo: graze 63% · idle 11% · walk 26%

- **pose** (−18): perna da frente dobrada parado: carpo a 137.3° (reta: 162–180°)
- **pose** (−7): pastando, a pele dobra/estica demais em 18 triângulos (perna2 14, pescoco 4)
- **pose** (−7): pastando, o focinho fica a 11 cm do capim
- **forma** (−7): altura do dorso 1.09m (o bicho de verdade: 0.75–1.08m)

## ovelha (91)

Medidas: cern 0.83 · comp 0.82 · peito 0.62 · cab 0.27 · jF 167.3 · jH 160.5 · fora 0 · focinho 0.1 · vincoPastar 14 · vel 0.5 · deslize 0.1 · afunda 0.1 · apoio 0.64 · passo 0.85 · balanco 2.4 · joelhoAndando 176.5 · flutua 3.5 · ordem 1 · froude 0.43

Tempo: graze 76% · idle 11% · walk 14%

- **forma** (−7): comprimento do corpo 0.82m (o bicho de verdade: 0.85–1.25m)
- **forma** (−7): altura do dorso 0.83m (o bicho de verdade: 0.6–0.82m)
- **pose** (−6): pastando, o focinho fica a 10 cm do capim
- **pose** (−6): pastando, a pele dobra/estica demais em 14 triângulos (perna1 14)
- **comportamento** (−5): pastando/ciscando 76% do tempo (o bicho de verdade: 35–70%)
- **comportamento** (−4): parado 11% do tempo (o bicho de verdade: 15–50%)
- **pose** (−1): perna da frente dobrada parado: carpo a 167.3° (reta: 168–180°)

## bezerro (92)

Medidas: cern 0.85 · comp 1.05 · peito 0.61 · cab 0.28 · jF 172.9 · jH 148.6 · fora 0.2 · vel 0.95 · deslize 0.18 · afunda 0.1 · apoio 0.64 · passo 1.22 · balanco 3.6 · joelhoAndando 176 · flutua 5.3 · ordem 1 · froude 0.41

Tempo: graze 62% · idle 12% · walk 26%

- **movimento** (−11): casco patina no apoio: 0.18 m/s (pisada firme: < 0,1 m/s)
- **forma** (−9): peito/altura 0.61 (o bicho de verdade: 0.42–0.58)
- **movimento** (−8): no apoio o casco fica 5.3 cm acima do chão
- **comportamento** (−5): parado 12% do tempo (o bicho de verdade: 20–60%)

## tamanduá-bandeira (92)

Medidas: cern 0.69 · comp 1.38 · peito 0.6 · cab 0.39 · jF 161.6 · jH 151.7 · fora 2.3 · vel 0.44 · deslize 0.2 · afunda 0 · apoio 0.64 · passo 0.96 · balanco 3.5 · joelhoAndando 176.5 · flutua 4 · ordem 1 · froude 0.4

Tempo: graze 42% · idle 1% · walk 57%

- **movimento** (−12): casco patina no apoio: 0.2 m/s (pisada firme: < 0,1 m/s)
- **pose** (−11): perna sai do tronco: 2.3 cm para fora da silhueta (parado)
- **forma** (−6): peito/altura 0.6 (o bicho de verdade: 0.6–0.85)
- **comportamento** (−4): parado 1% do tempo (o bicho de verdade: 5–40%)

## capivara (93)

Medidas: cern 0.64 · comp 1.17 · peito 0.68 · cab 0.44 · jF 176.3 · jH 141.5 · fora 0 · focinho 0.06 · vincoPastar 47 · vel 0.5 · deslize 0.15 · afunda 0.1 · apoio 0.63 · passo 1.23 · balanco 2.2 · joelhoAndando 174.9 · flutua 3.9 · ordem 1 · froude 0.41

Tempo: graze 30% · idle 11% · walk 24% · drink 6% · swim 27% · flee 2%

- **pose** (−12): pastando, a pele dobra/estica demais em 47 triângulos (pescoco 27, perna0 10)
- **movimento** (−9): casco patina no apoio: 0.15 m/s (pisada firme: < 0,1 m/s)
- **comportamento** (−5): parado 11% do tempo (o bicho de verdade: 20–60%)

## onça-pintada (93)

Medidas: cern 0.72 · comp 1.39 · peito 0.6 · cab 0.34 · jF 168.5 · jH 142.1 · fora 0.2 · vel 0.86 · deslize 0.26 · afunda 0.1 · apoio 0.64 · passo 1.38 · balanco 3.7 · joelhoAndando 172.9 · flutua 4.9 · ordem 1 · froude 0.42

Tempo: graze 21% · idle 23% · walk 46% · flee 10%

- **movimento** (−16): casco patina no apoio: 0.26 m/s (pisada firme: < 0,1 m/s)
- **movimento** (−7): no apoio o casco fica 4.9 cm acima do chão
- **comportamento** (−5): parado 23% do tempo (o bicho de verdade: 30–80%)

## garça-moura (96)

Medidas: cern 1.19 · comp 0.56 · peito 0.29 · cab 0.31

Tempo: flee 100%

- **comportamento** (−10): parado 0% do tempo (o bicho de verdade: 45–95%)
- **comportamento** (−4): andando 0% do tempo (o bicho de verdade: 5–45%)

## lobo-guará (96)

Medidas: cern 0.91 · comp 1.11 · peito 0.36 · cab 0.36 · jF 167.9 · jH 154.8 · fora 1.4 · vel 1.5 · deslize 0.06 · afunda 0.1 · apoio 0.64 · passo 1.24 · balanco 1.9 · joelhoAndando 176.5 · flutua 5.6 · ordem 1 · froude 0.41

Tempo: graze 28% · idle 32% · walk 40%

- **movimento** (−8): no apoio o casco fica 5.6 cm acima do chão
- **pose** (−7): perna sai do tronco: 1.4 cm para fora da silhueta (parado)

## garça-branca (100)

Medidas: cern 0.95 · comp 0.43 · peito 0.26 · cab 0.18

Tempo: graze 11% · idle 62% · walk 26%

- nada a corrigir

## seriema (100)

Medidas: cern 0.83 · comp 0.42 · peito 0.34 · cab 0.12

Tempo: graze 40% · idle 20% · walk 40%

- nada a corrigir

## galinha (100)

Medidas: cern 0.46 · comp 0.26 · peito 0.45 · cab 0.08

Tempo: graze 56% · idle 16% · walk 12% · flee 16%

- nada a corrigir

## ema (100)

Medidas: cern 1.47 · comp 0.7 · peito 0.42 · cab 0.17

Tempo: graze 55% · idle 12% · walk 33%

- nada a corrigir

## Fontes das medidas

- Ângulo do jarrete (150–155° ideal; 160° reto, 134° em foice): classificação linear dinamarquesa e guia Ayrshire.
- Perna da frente reta de lado (coluna), ombro a ~45°: extensões ACES (Alabama) e UT (Tennessee).
- Troca andar→trote perto de Froude 0,5 (Alexander & Jayes, 1983), com h = altura do quadril.
- Fração de apoio do andar 0,6–0,75 e sequência lateral das pisadas: biomecânica de quadrúpedes (Hildebrand).
- Tamanhos: fichas das espécies (zebu, capivara, ovelha, lobo-guará, onça-pintada, anta, tamanduá-bandeira, garças, seriema, ema, galinha).
- Tempo de pastejo do gado de dia (30–65%): estudos de comportamento ingestivo de bovinos a pasto.
