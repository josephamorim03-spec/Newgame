# O juiz dos bichos

Relatório de `sim/juiz_bichos.js` (o motor fica em `prototipo3d/js/juiz.js`): 45 bichos com esqueleto, 320 mil triângulos no total. Nota média: **93**.

| Espécie | Nota | Forma | Pose | Movimento | Comportamento | Triângulos |
|---|---|---|---|---|---|---|
| boi | **85** | 82 | 91 | 67 | 100 | 13876 |
| anta | **88** | 93 | 86 | 78 | 96 | 8100 |
| ovelha | **88** | 86 | 83 | 82 | 100 | 6120 |
| tamanduá-bandeira | **90** | 94 | 85 | 90 | 90 | 7056 |
| onça-pintada | **91** | 100 | 100 | 73 | 90 | 14060 |
| bezerro | **92** | 91 | 96 | 92 | 90 | 12884 |
| capivara | **92** | 100 | 88 | 92 | 90 | 7060 |
| lobo-guará | **92** | 100 | 94 | 73 | 100 | 10016 |
| garça-moura | **96** | 100 | 100 | 100 | 86 | 3390 |
| garça-branca | **100** | 100 | 100 | 100 | 100 | 3380 |
| seriema | **100** | 100 | 100 | 100 | 100 | 3452 |
| galinha | **100** | 100 | 100 | 100 | 100 | 3652 |
| ema | **100** | 100 | 100 | 100 | 100 | 3364 |

## boi (85)

Medidas: cern 1.43 · comp 1.78 · peito 0.67 · cab 0.47 · jF 163.3 · jH 144.3 · fora 0.4 · focinho 0.04 · vincoPastar 12 · vel 0.3 · deslize 0.69 · afunda 0.1 · apoio 0.64 · passo 1.05 · balanco 9.6 · joelhoAndando 174.3 · flutua 7 · ordem 1 · froude 0.42

Tempo: graze 55% · idle 16% · walk 28% · drink 2%

- **movimento** (−18): casco patina no apoio: 0.69 m/s (pisada firme: < 0,1 m/s)
- **forma** (−11): peito/altura 0.67 (o bicho de verdade: 0.48–0.6)
- **movimento** (−10): no apoio o casco fica 7 cm acima do chão
- **forma** (−7): comprimento do corpo 1.78m (o bicho de verdade: 1.4–1.75m)
- **movimento** (−5): corpo sobe e desce 9.6 cm a cada passo (demais)
- **pose** (−5): pastando, a pele dobra/estica demais em 12 triângulos (pescoco 12)
- **pose** (−4): perna da frente dobrada parado: carpo a 163.3° (reta: 168–180°)

## anta (88)

Medidas: cern 1.09 · comp 1.86 · peito 0.64 · cab 0.56 · jF 151 · jH 146.3 · fora 0 · focinho 0.06 · vincoPastar 14 · vel 0.6 · deslize 0.19 · afunda 0.1 · apoio 0.64 · passo 0.98 · balanco 7.6 · joelhoAndando 174.3 · flutua 6.9 · ordem 1 · froude 0.42

Tempo: graze 59% · idle 4% · walk 20% · drink 4% · swim 13%

- **movimento** (−11): casco patina no apoio: 0.19 m/s (pisada firme: < 0,1 m/s)
- **movimento** (−10): no apoio o casco fica 6.9 cm acima do chão
- **pose** (−9): perna da frente dobrada parado: carpo a 151° (reta: 162–180°)
- **forma** (−7): altura do dorso 1.09m (o bicho de verdade: 0.75–1.08m)
- **pose** (−6): pastando, a pele dobra/estica demais em 14 triângulos (perna2 14)
- **comportamento** (−5): parado 4% do tempo (o bicho de verdade: 10–50%)

## ovelha (88)

Medidas: cern 0.83 · comp 0.82 · peito 0.62 · cab 0.27 · jF 176.4 · jH 176.4 · fora 0 · focinho 0.11 · vincoPastar 10 · vel 0.41 · deslize 0.35 · afunda 0.1 · apoio 0.64 · passo 0.85 · balanco 4.3 · joelhoAndando 175.2 · flutua 3.4 · ordem 1 · froude 0.43

Tempo: graze 70% · idle 12% · walk 18%

- **movimento** (−18): casco patina no apoio: 0.35 m/s (pisada firme: < 0,1 m/s)
- **forma** (−7): comprimento do corpo 0.82m (o bicho de verdade: 0.85–1.25m)
- **pose** (−7): pastando, o focinho fica a 11 cm do capim
- **forma** (−7): altura do dorso 0.83m (o bicho de verdade: 0.6–0.82m)
- **pose** (−6): jarrete a 176.4° (perna boa: 135–166°)
- **pose** (−4): pastando, a pele dobra/estica demais em 10 triângulos (perna1 10)

## tamanduá-bandeira (90)

Medidas: cern 0.69 · comp 1.38 · peito 0.6 · cab 0.39 · jF 157.4 · jH 147.9 · fora 3 · vel 0.45 · deslize 0.16 · afunda 0.1 · apoio 0.64 · passo 0.96 · balanco 3.1 · joelhoAndando 176.5 · flutua 3.5 · ordem 1 · froude 0.4

Tempo: graze 31% · idle 2% · walk 68%

- **pose** (−15): perna sai do tronco: 3 cm para fora da silhueta (parado)
- **movimento** (−10): casco patina no apoio: 0.16 m/s (pisada firme: < 0,1 m/s)
- **comportamento** (−6): andando 68% do tempo (o bicho de verdade: 15–55%)
- **forma** (−6): peito/altura 0.6 (o bicho de verdade: 0.6–0.85)
- **comportamento** (−4): parado 2% do tempo (o bicho de verdade: 5–40%)

## onça-pintada (91)

Medidas: cern 0.71 · comp 1.43 · peito 0.61 · cab 0.33 · jF 173.6 · jH 140 · fora 0.3 · vel 0.8 · deslize 0.86 · afunda 0.1 · apoio 0.64 · passo 1.38 · balanco 3.5 · joelhoAndando 175.5 · flutua 5.7 · ordem 1 · froude 0.41

Tempo: graze 19% · idle 17% · walk 64%

- **movimento** (−18): casco patina no apoio: 0.86 m/s (pisada firme: < 0,1 m/s)
- **movimento** (−9): no apoio o casco fica 5.7 cm acima do chão
- **comportamento** (−6): parado 17% do tempo (o bicho de verdade: 30–80%)
- **comportamento** (−4): andando 64% do tempo (o bicho de verdade: 15–60%)

## bezerro (92)

Medidas: cern 0.85 · comp 1.05 · peito 0.61 · cab 0.28 · jF 162.5 · jH 144.7 · fora 0.2 · vel 0.93 · deslize 0.12 · afunda 0.1 · apoio 0.64 · passo 1.22 · balanco 3.2 · joelhoAndando 175.7 · flutua 5.3 · ordem 1 · froude 0.41

Tempo: graze 64% · idle 8% · walk 28% · flee 1%

- **forma** (−9): peito/altura 0.61 (o bicho de verdade: 0.42–0.58)
- **movimento** (−8): no apoio o casco fica 5.3 cm acima do chão
- **comportamento** (−6): parado 8% do tempo (o bicho de verdade: 20–60%)
- **pose** (−4): perna da frente dobrada parado: carpo a 162.5° (reta: 168–180°)
- **comportamento** (−4): pastando/ciscando 64% do tempo (o bicho de verdade: 20–60%)

## capivara (92)

Medidas: cern 0.64 · comp 1.17 · peito 0.68 · cab 0.44 · jF 154.7 · jH 140 · fora 0 · focinho 0.03 · vincoPastar 47 · vel 0.5 · deslize 0.13 · afunda 0.1 · apoio 0.65 · passo 1.23 · balanco 2.8 · joelhoAndando 172.8 · flutua 3.9 · ordem 1 · froude 0.41

Tempo: graze 31% · idle 12% · walk 14% · drink 5% · swim 35% · flee 2%

- **pose** (−12): pastando, a pele dobra/estica demais em 47 triângulos (pescoco 33, perna0 10)
- **movimento** (−8): casco patina no apoio: 0.13 m/s (pisada firme: < 0,1 m/s)
- **comportamento** (−6): nadando 35% do tempo (o bicho de verdade: 0–25%)
- **comportamento** (−5): parado 12% do tempo (o bicho de verdade: 20–60%)

## lobo-guará (92)

Medidas: cern 0.91 · comp 1.11 · peito 0.36 · cab 0.36 · jF 176.4 · jH 163.6 · fora 1.2 · vel 1.4 · deslize 0.48 · afunda 0.1 · apoio 0.64 · passo 1.24 · balanco 4.4 · joelhoAndando 175.5 · flutua 5.9 · ordem 1 · froude 0.41

Tempo: graze 22% · idle 21% · walk 56%

- **movimento** (−18): casco patina no apoio: 0.48 m/s (pisada firme: < 0,1 m/s)
- **movimento** (−9): no apoio o casco fica 5.9 cm acima do chão
- **pose** (−6): perna sai do tronco: 1.2 cm para fora da silhueta (parado)

## garça-moura (96)

Medidas: cern 1.19 · comp 0.56 · peito 0.29 · cab 0.31

Tempo: flee 100%

- **comportamento** (−10): parado 0% do tempo (o bicho de verdade: 45–95%)
- **comportamento** (−4): andando 0% do tempo (o bicho de verdade: 5–45%)

## garça-branca (100)

Medidas: cern 0.95 · comp 0.43 · peito 0.26 · cab 0.18

Tempo: graze 7% · idle 60% · walk 31% · flee 2%

- nada a corrigir

## seriema (100)

Medidas: cern 0.83 · comp 0.42 · peito 0.34 · cab 0.12

Tempo: graze 44% · idle 18% · walk 38%

- nada a corrigir

## galinha (100)

Medidas: cern 0.46 · comp 0.26 · peito 0.45 · cab 0.08

Tempo: graze 55% · idle 12% · walk 10% · flee 23%

- nada a corrigir

## ema (100)

Medidas: cern 1.47 · comp 0.7 · peito 0.42 · cab 0.17

Tempo: graze 51% · idle 13% · walk 36%

- nada a corrigir

## Fontes das medidas

- Ângulo do jarrete (150–155° ideal; 160° reto, 134° em foice): classificação linear dinamarquesa e guia Ayrshire.
- Perna da frente reta de lado (coluna), ombro a ~45°: extensões ACES (Alabama) e UT (Tennessee).
- Troca andar→trote perto de Froude 0,5 (Alexander & Jayes, 1983), com h = altura do quadril.
- Fração de apoio do andar 0,6–0,75 e sequência lateral das pisadas: biomecânica de quadrúpedes (Hildebrand).
- Tamanhos: fichas das espécies (zebu, capivara, ovelha, lobo-guará, onça-pintada, anta, tamanduá-bandeira, garças, seriema, ema, galinha).
- Tempo de pastejo do gado de dia (30–65%): estudos de comportamento ingestivo de bovinos a pasto.
