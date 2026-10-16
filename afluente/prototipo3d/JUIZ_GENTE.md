# O juiz de gente

Relatório de `sim/juiz_gente.js` (o motor fica em `prototipo3d/js/juizgente.js`). Nota média: **95**.

Cada tipo de morador é montado, medido parado, posto nas poses do jogo e (o andar) seguido por 4 s. Na saia, mede-se também a folga do pano até o corpo (saiaFolga, em mm: os 10% mais afastados entre a cintura e o quadril).

| Tipo | Nota | Forma | Integração | Pose | Movimento | Triângulos |
|---|---|---|---|---|---|---|
| homem | **90** | 93 | 100 | 68 | 100 | 20048 |
| homem de chapéu | **91** | 92 | 100 | 73 | 100 | 18976 |
| mulher de saia | **98** | 97 | 100 | 96 | 100 | 20968 |
| mulher de vestido e lenço | **96** | 91 | 100 | 92 | 100 | 19208 |
| mulher forte de saia comprida | **98** | 97 | 100 | 96 | 100 | 19432 |
| mulher magra de vestido | **98** | 97 | 100 | 96 | 100 | 18156 |
| idoso | **88** | 85 | 100 | 67 | 100 | 19724 |
| menino | **99** | 97 | 100 | 100 | 100 | 18684 |
| menina | **99** | 97 | 100 | 100 | 100 | 18604 |

## homem (90)

Medidas (frações da altura; mm nas emendas): altura 1.696 · cabeca 0.141 · ombros 0.272 · quadril 0.217 · braco 0.179 · antebraco 0.155 · coxa 0.246 · canela 0.249 · pe 0.155 · hOmbro 0.808 · hCotovelo 0.63 · hPunho 0.489 · hQuadril 0.531 · hJoelho 0.286 · triangulos 20048 · quina_tronco 0.9 · quina_coxa 1.6 · quina_braço 1 · tampaOmbro 0 · mão solta do punho 4.4 · pé solto da perna 1.3 · cabeça solta do pescoço 0.1 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente 5.1

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 5.6 · passoAltura 0.429 · bracoContraPerna -0.4

Poses: braço erguido (lata na cabeça) (vinco 48, dentro 0 mm) · braços à frente (vinco 33, dentro 0 mm) · braços abertos (vinco 21, dentro 0 mm) · agachado juntando (vinco 33, dentro 0 mm) · ajoelhado lavando (vinco 70, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 53, dentro 0 mm) · enxuga a testa (vinco 40, dentro 0 mm) · mão na cintura (vinco 28, dentro 0 mm)

- **pose** (−6): ajoelhado lavando: 70 cm² de pele esticando/encolhendo demais (perna 60, braço 10 cm²)
- **pose** (−5): enxada no alto: 53 cm² de pele esticando/encolhendo demais (braço 38, tronco 15 cm²)
- **pose** (−5): braço erguido (lata na cabeça): 48 cm² de pele esticando/encolhendo demais (braço 36, tronco 12 cm²)
- **pose** (−4): enxuga a testa: 40 cm² de pele esticando/encolhendo demais (braço 34, tronco 6 cm²)
- **pose** (−4): braços à frente: 33 cm² de pele esticando/encolhendo demais (braço 33 cm²)
- **pose** (−4): agachado juntando: 33 cm² de pele esticando/encolhendo demais (braço 33 cm²)
- **pose** (−4): mão na cintura: 28 cm² de pele esticando/encolhendo demais (braço 28 cm²)
- **forma** (−4): largura do quadril 0.217 da altura (o corpo de verdade: 0.163–0.215) — longo/largo
- **forma** (−3): cabeça (alto ao queixo) 0.141 da altura (o corpo de verdade: 0.12–0.14) — longo/largo

## homem de chapéu (91)

Medidas (frações da altura; mm nas emendas): altura 1.695 · cabeca 0.141 · ombros 0.273 · quadril 0.219 · braco 0.179 · antebraco 0.155 · mao 0.105 · coxa 0.244 · canela 0.247 · pe 0.155 · hOmbro 0.807 · hCotovelo 0.629 · hPunho 0.49 · hQuadril 0.528 · hJoelho 0.284 · triangulos 18976 · quina_tronco 0.9 · quina_coxa 1.5 · quina_braço 1 · tampaOmbro 0 · mão solta do punho 4.7 · pé solto da perna 0.8 · cabeça solta do pescoço 0.2 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente 5.9

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 5.6 · passoAltura 0.429 · bracoContraPerna -0.4

Poses: braço erguido (lata na cabeça) (vinco 42, dentro 0 mm) · braços à frente (vinco 27, dentro 0 mm) · braços abertos (vinco 18, dentro 0 mm) · agachado juntando (vinco 27, dentro 0 mm) · ajoelhado lavando (vinco 69, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 47, dentro 0 mm) · enxuga a testa (vinco 42, dentro 0 mm) · mão na cintura (vinco 25, dentro 0 mm)

- **pose** (−6): ajoelhado lavando: 69 cm² de pele esticando/encolhendo demais (perna 59, braço 10 cm²)
- **pose** (−5): enxada no alto: 47 cm² de pele esticando/encolhendo demais (braço 32, tronco 15 cm²)
- **pose** (−5): braço erguido (lata na cabeça): 42 cm² de pele esticando/encolhendo demais (braço 30, tronco 12 cm²)
- **pose** (−5): enxuga a testa: 42 cm² de pele esticando/encolhendo demais (braço 36, tronco 6 cm²)
- **forma** (−4): largura do quadril 0.219 da altura (o corpo de verdade: 0.163–0.215) — longo/largo
- **pose** (−4): braços à frente: 27 cm² de pele esticando/encolhendo demais (braço 27 cm²)
- **pose** (−4): agachado juntando: 27 cm² de pele esticando/encolhendo demais (braço 27 cm²)
- **forma** (−3): cabeça (alto ao queixo) 0.141 da altura (o corpo de verdade: 0.12–0.14) — longo/largo

## mulher de saia (98)

Medidas (frações da altura; mm nas emendas): altura 1.694 · cabeca 0.139 · ombros 0.243 · quadril 0.218 · braco 0.173 · antebraco 0.145 · mao 0.1 · coxa 0.238 · canela 0.242 · pe 0.141 · hOmbro 0.802 · hCotovelo 0.629 · hPunho 0.5 · hQuadril 0.516 · hJoelho 0.278 · triangulos 20968 · quina_tronco 0.9 · quina_coxa 1.5 · quina_braço 1 · tampaOmbro 0 · mão solta do punho 4.5 · pé solto da perna 0.3 · cabeça solta do pescoço 0.7 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente 4.5 · saiaFolga 38.8

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 5.6 · passoAltura 0.429 · bracoContraPerna -0.4

Poses: braço erguido (lata na cabeça) (vinco 15, dentro 0 mm) · braços à frente (vinco 17, dentro 0 mm) · braços abertos (vinco 16, dentro 0 mm) · agachado juntando (vinco 17, dentro 0 mm) · ajoelhado lavando (vinco 9, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 18, dentro 0 mm) · enxuga a testa (vinco 26, dentro 0 mm) · mão na cintura (vinco 21, dentro 0 mm)

- **pose** (−4): enxuga a testa: 26 cm² de pele esticando/encolhendo demais (braço 26 cm²)
- **forma** (−3): altura do punho 0.5 da altura (o corpo de verdade: 0.46–0.5) — longo/largo

## mulher de vestido e lenço (96)

Medidas (frações da altura; mm nas emendas): altura 1.694 · cabeca 0.14 · ombros 0.251 · quadril 0.235 · braco 0.173 · antebraco 0.145 · mao 0.101 · coxa 0.24 · canela 0.244 · pe 0.147 · hOmbro 0.803 · hCotovelo 0.631 · hPunho 0.503 · hQuadril 0.521 · hJoelho 0.281 · triangulos 19208 · quina_tronco 0.9 · quina_coxa 1.4 · quina_braço 0.9 · tampaOmbro 0 · mão solta do punho 4.5 · pé solto da perna 0.7 · cabeça solta do pescoço 0.5 · cabeloNoRosto 2 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente 4.6 · saiaFolga 43

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 5.6 · passoAltura 0.429 · bracoContraPerna -0.4

Poses: braço erguido (lata na cabeça) (vinco 30, dentro 0 mm) · braços à frente (vinco 18, dentro 0 mm) · braços abertos (vinco 17, dentro 0 mm) · agachado juntando (vinco 18, dentro 0 mm) · ajoelhado lavando (vinco 9, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 22, dentro 0 mm) · enxuga a testa (vinco 24, dentro 0 mm) · mão na cintura (vinco 32, dentro 0 mm)

- **forma** (−6): largura do quadril 0.235 da altura (o corpo de verdade: 0.172–0.225) — longo/largo
- **pose** (−4): mão na cintura: 32 cm² de pele esticando/encolhendo demais (braço 32 cm²)
- **pose** (−4): braço erguido (lata na cabeça): 30 cm² de pele esticando/encolhendo demais (braço 27, tronco 3 cm²)
- **forma** (−3): altura do punho 0.503 da altura (o corpo de verdade: 0.46–0.5) — longo/largo

## mulher forte de saia comprida (98)

Medidas (frações da altura; mm nas emendas): altura 1.695 · cabeca 0.14 · ombros 0.249 · quadril 0.223 · braco 0.173 · antebraco 0.145 · mao 0.098 · coxa 0.241 · canela 0.245 · pe 0.147 · hOmbro 0.804 · hCotovelo 0.632 · hPunho 0.503 · hQuadril 0.523 · hJoelho 0.282 · triangulos 19432 · quina_tronco 0.9 · quina_coxa 1.4 · quina_braço 0.9 · tampaOmbro 0 · mão solta do punho 4.5 · pé solto da perna 0.7 · cabeça solta do pescoço 0.8 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente 4.7 · saiaFolga 40.1

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 5.6 · passoAltura 0.429 · bracoContraPerna -0.4

Poses: braço erguido (lata na cabeça) (vinco 18, dentro 0 mm) · braços à frente (vinco 17, dentro 0 mm) · braços abertos (vinco 16, dentro 0 mm) · agachado juntando (vinco 17, dentro 0 mm) · ajoelhado lavando (vinco 9, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 21, dentro 0 mm) · enxuga a testa (vinco 26, dentro 0 mm) · mão na cintura (vinco 21, dentro 0 mm)

- **pose** (−4): enxuga a testa: 26 cm² de pele esticando/encolhendo demais (braço 26 cm²)
- **forma** (−3): altura do punho 0.503 da altura (o corpo de verdade: 0.46–0.5) — longo/largo

## mulher magra de vestido (98)

Medidas (frações da altura; mm nas emendas): altura 1.694 · cabeca 0.14 · ombros 0.245 · quadril 0.223 · braco 0.173 · antebraco 0.145 · mao 0.097 · coxa 0.238 · canela 0.242 · pe 0.147 · hOmbro 0.802 · hCotovelo 0.63 · hPunho 0.501 · hQuadril 0.517 · hJoelho 0.279 · triangulos 18156 · quina_tronco 0.8 · quina_coxa 1.4 · quina_braço 0.9 · tampaOmbro 0 · mão solta do punho 4.5 · pé solto da perna 0.7 · cabeça solta do pescoço 0.1 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente 4.9 · saiaFolga 39.6

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 5.6 · passoAltura 0.429 · bracoContraPerna -0.4

Poses: braço erguido (lata na cabeça) (vinco 20, dentro 0 mm) · braços à frente (vinco 18, dentro 0 mm) · braços abertos (vinco 16, dentro 0 mm) · agachado juntando (vinco 18, dentro 0 mm) · ajoelhado lavando (vinco 9, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 19, dentro 0 mm) · enxuga a testa (vinco 27, dentro 0 mm) · mão na cintura (vinco 22, dentro 0 mm)

- **pose** (−4): enxuga a testa: 27 cm² de pele esticando/encolhendo demais (braço 27 cm²)
- **forma** (−3): altura do punho 0.501 da altura (o corpo de verdade: 0.46–0.5) — longo/largo

## idoso (88)

Medidas (frações da altura; mm nas emendas): altura 1.687 · cabeca 0.143 · ombros 0.277 · quadril 0.227 · braco 0.179 · antebraco 0.156 · mao 0.109 · coxa 0.244 · canela 0.247 · pe 0.156 · hOmbro 0.808 · hCotovelo 0.63 · hPunho 0.487 · hQuadril 0.529 · hJoelho 0.284 · triangulos 19724 · quina_tronco 1 · quina_coxa 1.6 · quina_braço 1.1 · tampaOmbro 0 · mão solta do punho 4.8 · pé solto da perna 0.7 · cabeça solta do pescoço 0.8 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente 5.3

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 5.6 · passoAltura 0.429 · bracoContraPerna -0.4

Poses: braço erguido (lata na cabeça) (vinco 48, dentro 0 mm) · braços à frente (vinco 28, dentro 0 mm) · braços abertos (vinco 20, dentro 0 mm) · agachado juntando (vinco 41, dentro 0 mm) · ajoelhado lavando (vinco 74, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 47, dentro 0 mm) · enxuga a testa (vinco 43, dentro 0 mm) · mão na cintura (vinco 36, dentro 0 mm)

- **forma** (−7): largura do quadril 0.227 da altura (o corpo de verdade: 0.163–0.215) — longo/largo
- **pose** (−6): ajoelhado lavando: 74 cm² de pele esticando/encolhendo demais (perna 59, braço 15 cm²)
- **pose** (−5): braço erguido (lata na cabeça): 48 cm² de pele esticando/encolhendo demais (braço 35, tronco 13 cm²)
- **pose** (−5): enxada no alto: 47 cm² de pele esticando/encolhendo demais (braço 34, tronco 13 cm²)
- **pose** (−5): enxuga a testa: 43 cm² de pele esticando/encolhendo demais (braço 34, tronco 9 cm²)
- **pose** (−4): agachado juntando: 41 cm² de pele esticando/encolhendo demais (braço 28, tronco 13 cm²)
- **forma** (−4): cabeça (alto ao queixo) 0.143 da altura (o corpo de verdade: 0.12–0.14) — longo/largo
- **pose** (−4): mão na cintura: 36 cm² de pele esticando/encolhendo demais (braço 36 cm²)
- **pose** (−4): braços à frente: 28 cm² de pele esticando/encolhendo demais (braço 28 cm²)
- **forma** (−3): largura dos ombros 0.277 da altura (o corpo de verdade: 0.225–0.275) — longo/largo
- **forma** (−0): silhueta facetada: até 1.6 mm de quina no coxa com 18 lados (mais segmentos)

## menino (99)

Medidas (frações da altura; mm nas emendas): altura 1.675 · cabeca 0.155 · ombros 0.24 · quadril 0.193 · braco 0.171 · antebraco 0.142 · mao 0.095 · coxa 0.232 · canela 0.244 · pe 0.149 · hOmbro 0.784 · hCotovelo 0.616 · hPunho 0.494 · hQuadril 0.514 · hJoelho 0.281 · triangulos 18684 · quina_tronco 0.6 · quina_coxa 1.1 · quina_braço 0.8 · tampaOmbro 0 · mão solta do punho 4.3 · pé solto da perna 5 · cabeça solta do pescoço 0.4 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente -1.2

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 5.6 · passoAltura 0.429 · bracoContraPerna -0.4

Poses: braço erguido (lata na cabeça) (vinco 17, dentro 0 mm) · braços à frente (vinco 17, dentro 0 mm) · braços abertos (vinco 5, dentro 0 mm) · agachado juntando (vinco 17, dentro 0 mm) · ajoelhado lavando (vinco 11, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 18, dentro 0 mm) · enxuga a testa (vinco 22, dentro 0 mm) · mão na cintura (vinco 19, dentro 0 mm)

- **forma** (−3): altura do punho 0.494 da altura (o corpo de verdade: 0.42–0.49) — longo/largo

## menina (99)

Medidas (frações da altura; mm nas emendas): altura 1.674 · cabeca 0.156 · ombros 0.243 · quadril 0.197 · braco 0.171 · antebraco 0.143 · mao 0.094 · coxa 0.232 · canela 0.243 · pe 0.149 · hOmbro 0.784 · hCotovelo 0.615 · hPunho 0.492 · hQuadril 0.512 · hJoelho 0.281 · triangulos 18604 · quina_tronco 0.7 · quina_coxa 1.2 · quina_braço 0.8 · tampaOmbro 0 · mão solta do punho 4.3 · pé solto da perna 5 · cabeça solta do pescoço 0.3 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente -1.1

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 5.6 · passoAltura 0.429 · bracoContraPerna -0.4

Poses: braço erguido (lata na cabeça) (vinco 19, dentro 0 mm) · braços à frente (vinco 17, dentro 0 mm) · braços abertos (vinco 5, dentro 0 mm) · agachado juntando (vinco 17, dentro 0 mm) · ajoelhado lavando (vinco 11, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 18, dentro 0 mm) · enxuga a testa (vinco 22, dentro 0 mm) · mão na cintura (vinco 19, dentro 0 mm)

- **forma** (−3): altura do punho 0.492 da altura (o corpo de verdade: 0.42–0.49) — longo/largo

## Fontes

- Segmentos do corpo como fração da altura: Drillis & Contini (1966); Winter, *Biomechanics and Motor Control of Human Movement*.
- Criança de 6 a 8 anos: cabeça com ~1/6 da altura, pernas proporcionalmente mais curtas (tabelas de crescimento e antropometria infantil).
- Andar: passo de ~0,41 da altura a ~1,2 m/s, centro do corpo subindo e descendo 3–6 cm, braço em oposição à perna (Perry, *Gait Analysis*).
