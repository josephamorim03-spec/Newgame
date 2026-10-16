# O juiz de gente

Relatório de `sim/juiz_gente.js` (o motor fica em `prototipo3d/js/juizgente.js`). Nota média: **96**.

Cada tipo de morador é montado, medido parado, posto nas poses do jogo e (o andar) seguido por 4 s. Na saia, mede-se também a folga do pano até o corpo (saiaFolga, em mm: os 10% mais afastados entre a cintura e o quadril).

| Tipo | Nota | Forma | Integração | Pose | Movimento | Triângulos |
|---|---|---|---|---|---|---|
| homem | **92** | 93 | 100 | 76 | 100 | 20270 |
| homem de chapéu | **93** | 93 | 100 | 80 | 100 | 21146 |
| mulher de saia | **99** | 100 | 100 | 96 | 100 | 19720 |
| mulher de vestido e lenço | **98** | 97 | 100 | 96 | 100 | 19016 |
| mulher forte de saia comprida | **97** | 96 | 100 | 92 | 100 | 19176 |
| mulher magra de vestido | **97** | 97 | 100 | 92 | 100 | 17900 |
| idoso | **87** | 84 | 100 | 66 | 100 | 19488 |
| menino | **100** | 100 | 100 | 100 | 100 | 17932 |
| menina | **99** | 100 | 100 | 96 | 100 | 18348 |

## homem (92)

Medidas (frações da altura; mm nas emendas): altura 1.694 · cabeca 0.141 · ombros 0.27 · quadril 0.215 · braco 0.179 · antebraco 0.155 · coxa 0.247 · canela 0.25 · pe 0.155 · hOmbro 0.809 · hCotovelo 0.631 · hPunho 0.484 · hQuadril 0.533 · hJoelho 0.286 · triangulos 20270 · quina_tronco 1 · quina_coxa 1.6 · quina_braço 1.1 · tampaOmbro 0 · mão solta do punho 4.3 · pé solto da perna 1.2 · cabeça solta do pescoço 0.4 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente 3.5

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 6.3 · passoAltura 0.429 · bracoContraPerna -0.483

Poses: braço erguido (lata na cabeça) (vinco 44, dentro 0 mm) · braços à frente (vinco 17, dentro 0 mm) · braços abertos (vinco 0, dentro 0 mm) · agachado juntando (vinco 17, dentro 0 mm) · ajoelhado lavando (vinco 68, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 54, dentro 0 mm) · enxuga a testa (vinco 33, dentro 0 mm) · mão na cintura (vinco 28, dentro 0 mm)

- **pose** (−6): ajoelhado lavando: 68 cm² de pele esticando/encolhendo demais (perna 60, braço 8 cm²)
- **pose** (−5): enxada no alto: 54 cm² de pele esticando/encolhendo demais (braço 29, tronco 25 cm²)
- **pose** (−5): braço erguido (lata na cabeça): 44 cm² de pele esticando/encolhendo demais (braço 32, tronco 12 cm²)
- **pose** (−4): enxuga a testa: 33 cm² de pele esticando/encolhendo demais (braço 25, tronco 9 cm²)
- **pose** (−4): mão na cintura: 28 cm² de pele esticando/encolhendo demais (braço 28 cm²)
- **forma** (−3): cabeça (alto ao queixo) 0.141 da altura (o corpo de verdade: 0.12–0.14) — longo/largo
- **forma** (−3): largura do quadril 0.215 da altura (o corpo de verdade: 0.163–0.215) — longo/largo
- **forma** (−0): silhueta facetada: até 1.6 mm de quina no coxa com 18 lados (mais segmentos)

## homem de chapéu (93)

Medidas (frações da altura; mm nas emendas): altura 1.695 · cabeca 0.141 · ombros 0.271 · quadril 0.216 · braco 0.179 · antebraco 0.155 · mao 0.104 · coxa 0.243 · canela 0.246 · pe 0.155 · hOmbro 0.807 · hCotovelo 0.628 · hPunho 0.484 · hQuadril 0.526 · hJoelho 0.283 · triangulos 21146 · quina_tronco 1.1 · quina_coxa 1.6 · quina_braço 1.1 · tampaOmbro 0 · mão solta do punho 4.7 · pé solto da perna 1.6 · cabeça solta do pescoço 0.2 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente 3.4

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 6.3 · passoAltura 0.429 · bracoContraPerna -0.483

Poses: braço erguido (lata na cabeça) (vinco 42, dentro 0 mm) · braços à frente (vinco 17, dentro 0 mm) · braços abertos (vinco 0, dentro 0 mm) · agachado juntando (vinco 17, dentro 0 mm) · ajoelhado lavando (vinco 67, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 55, dentro 0 mm) · enxuga a testa (vinco 38, dentro 0 mm) · mão na cintura (vinco 25, dentro 0 mm)

- **pose** (−6): ajoelhado lavando: 67 cm² de pele esticando/encolhendo demais (perna 59, braço 8 cm²)
- **pose** (−5): enxada no alto: 55 cm² de pele esticando/encolhendo demais (braço 29, tronco 25 cm²)
- **pose** (−5): braço erguido (lata na cabeça): 42 cm² de pele esticando/encolhendo demais (braço 29, tronco 12 cm²)
- **pose** (−4): enxuga a testa: 38 cm² de pele esticando/encolhendo demais (braço 29, tronco 9 cm²)
- **forma** (−3): cabeça (alto ao queixo) 0.141 da altura (o corpo de verdade: 0.12–0.14) — longo/largo
- **forma** (−3): largura do quadril 0.216 da altura (o corpo de verdade: 0.163–0.215) — longo/largo
- **forma** (−0): silhueta facetada: até 1.6 mm de quina no coxa com 18 lados (mais segmentos)

## mulher de saia (99)

Medidas (frações da altura; mm nas emendas): altura 1.695 · cabeca 0.138 · ombros 0.244 · quadril 0.219 · braco 0.173 · antebraco 0.145 · mao 0.101 · coxa 0.243 · canela 0.247 · pe 0.147 · hOmbro 0.805 · hCotovelo 0.633 · hPunho 0.5 · hQuadril 0.526 · hJoelho 0.283 · triangulos 19720 · quina_tronco 0.8 · quina_coxa 1.4 · quina_braço 0.9 · tampaOmbro 0 · mão solta do punho 4.5 · pé solto da perna 0.7 · cabeça solta do pescoço 0.1 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente 2.2 · saiaFolga 50.8

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 6.3 · passoAltura 0.429 · bracoContraPerna -0.483

Poses: braço erguido (lata na cabeça) (vinco 15, dentro 0 mm) · braços à frente (vinco 14, dentro 0 mm) · braços abertos (vinco 0, dentro 0 mm) · agachado juntando (vinco 14, dentro 0 mm) · ajoelhado lavando (vinco 7, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 24, dentro 0 mm) · enxuga a testa (vinco 27, dentro 0 mm) · mão na cintura (vinco 21, dentro 0 mm)

- **pose** (−4): enxuga a testa: 27 cm² de pele esticando/encolhendo demais (braço 27 cm²)

## mulher de vestido e lenço (98)

Medidas (frações da altura; mm nas emendas): altura 1.696 · cabeca 0.139 · ombros 0.244 · quadril 0.221 · braco 0.173 · antebraco 0.145 · mao 0.099 · coxa 0.243 · canela 0.247 · pe 0.146 · hOmbro 0.805 · hCotovelo 0.633 · hPunho 0.501 · hQuadril 0.526 · hJoelho 0.284 · triangulos 19016 · quina_tronco 0.8 · quina_coxa 1.4 · quina_braço 0.9 · tampaOmbro 0 · mão solta do punho 4.5 · pé solto da perna 0.7 · cabeça solta do pescoço 0 · cabeloNoRosto 2 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente 3 · saiaFolga 47.4

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 6.3 · passoAltura 0.429 · bracoContraPerna -0.483

Poses: braço erguido (lata na cabeça) (vinco 21, dentro 0 mm) · braços à frente (vinco 14, dentro 0 mm) · braços abertos (vinco 0, dentro 0 mm) · agachado juntando (vinco 14, dentro 0 mm) · ajoelhado lavando (vinco 7, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 26, dentro 0 mm) · enxuga a testa (vinco 24, dentro 0 mm) · mão na cintura (vinco 24, dentro 0 mm)

- **pose** (−4): enxada no alto: 26 cm² de pele esticando/encolhendo demais (braço 26 cm²)
- **forma** (−3): altura do punho 0.501 da altura (o corpo de verdade: 0.46–0.5) — longo/largo

## mulher forte de saia comprida (97)

Medidas (frações da altura; mm nas emendas): altura 1.694 · cabeca 0.139 · ombros 0.253 · quadril 0.23 · braco 0.173 · antebraco 0.145 · mao 0.1 · coxa 0.239 · canela 0.242 · pe 0.147 · hOmbro 0.802 · hCotovelo 0.63 · hPunho 0.497 · hQuadril 0.517 · hJoelho 0.279 · triangulos 19176 · quina_tronco 0.9 · quina_coxa 1.5 · quina_braço 1 · tampaOmbro 0 · mão solta do punho 4.5 · pé solto da perna 0.7 · cabeça solta do pescoço 0.2 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente 2.9 · saiaFolga 43.3

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 6.3 · passoAltura 0.429 · bracoContraPerna -0.483

Poses: braço erguido (lata na cabeça) (vinco 18, dentro 0 mm) · braços à frente (vinco 15, dentro 0 mm) · braços abertos (vinco 0, dentro 0 mm) · agachado juntando (vinco 15, dentro 0 mm) · ajoelhado lavando (vinco 4, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 31, dentro 0 mm) · enxuga a testa (vinco 28, dentro 0 mm) · mão na cintura (vinco 22, dentro 0 mm)

- **forma** (−4): largura do quadril 0.23 da altura (o corpo de verdade: 0.178–0.225) — longo/largo
- **pose** (−4): enxada no alto: 31 cm² de pele esticando/encolhendo demais (braço 26, tronco 5 cm²)
- **pose** (−4): enxuga a testa: 28 cm² de pele esticando/encolhendo demais (braço 28 cm²)

## mulher magra de vestido (97)

Medidas (frações da altura; mm nas emendas): altura 1.694 · cabeca 0.138 · ombros 0.246 · quadril 0.225 · braco 0.173 · antebraco 0.145 · mao 0.098 · coxa 0.239 · canela 0.243 · pe 0.147 · hOmbro 0.802 · hCotovelo 0.63 · hPunho 0.497 · hQuadril 0.518 · hJoelho 0.279 · triangulos 17900 · quina_tronco 0.9 · quina_coxa 1.5 · quina_braço 1 · tampaOmbro 0 · mão solta do punho 4.5 · pé solto da perna 0.7 · cabeça solta do pescoço 0.8 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente 2.5 · saiaFolga 41.4

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 6.3 · passoAltura 0.429 · bracoContraPerna -0.483

Poses: braço erguido (lata na cabeça) (vinco 20, dentro 0 mm) · braços à frente (vinco 15, dentro 0 mm) · braços abertos (vinco 0, dentro 0 mm) · agachado juntando (vinco 15, dentro 0 mm) · ajoelhado lavando (vinco 4, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 31, dentro 0 mm) · enxuga a testa (vinco 28, dentro 0 mm) · mão na cintura (vinco 23, dentro 0 mm)

- **pose** (−4): enxada no alto: 31 cm² de pele esticando/encolhendo demais (braço 27, tronco 5 cm²)
- **pose** (−4): enxuga a testa: 28 cm² de pele esticando/encolhendo demais (braço 28 cm²)
- **forma** (−3): largura do quadril 0.225 da altura (o corpo de verdade: 0.171–0.225) — longo/largo

## idoso (87)

Medidas (frações da altura; mm nas emendas): altura 1.666 · cabeca 0.143 · ombros 0.281 · quadril 0.229 · braco 0.182 · antebraco 0.158 · mao 0.111 · coxa 0.248 · canela 0.251 · pe 0.158 · hOmbro 0.813 · hCotovelo 0.638 · hPunho 0.487 · hQuadril 0.537 · hJoelho 0.289 · triangulos 19488 · quina_tronco 1.1 · quina_coxa 1.6 · quina_braço 1.1 · tampaOmbro 0 · mão solta do punho 4.8 · pé solto da perna 0.8 · cabeça solta do pescoço 0.8 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente 3.6

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 6.3 · passoAltura 0.429 · bracoContraPerna -0.483

Poses: braço erguido (lata na cabeça) (vinco 61, dentro 0 mm) · braços à frente (vinco 18, dentro 0 mm) · braços abertos (vinco 0, dentro 0 mm) · agachado juntando (vinco 55, dentro 0 mm) · ajoelhado lavando (vinco 91, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 76, dentro 0 mm) · enxuga a testa (vinco 55, dentro 0 mm) · mão na cintura (vinco 36, dentro 0 mm)

- **pose** (−7): ajoelhado lavando: 91 cm² de pele esticando/encolhendo demais (perna 59, tronco 16 cm²)
- **forma** (−7): largura do quadril 0.229 da altura (o corpo de verdade: 0.163–0.215) — longo/largo
- **pose** (−7): enxada no alto: 76 cm² de pele esticando/encolhendo demais (tronco 45, braço 31 cm²)
- **pose** (−6): braço erguido (lata na cabeça): 61 cm² de pele esticando/encolhendo demais (braço 33, tronco 28 cm²)
- **pose** (−5): agachado juntando: 55 cm² de pele esticando/encolhendo demais (tronco 30, braço 18 cm²)
- **pose** (−5): enxuga a testa: 55 cm² de pele esticando/encolhendo demais (tronco 28, braço 26 cm²)
- **forma** (−4): largura dos ombros 0.281 da altura (o corpo de verdade: 0.225–0.275) — longo/largo
- **forma** (−4): cabeça (alto ao queixo) 0.143 da altura (o corpo de verdade: 0.12–0.14) — longo/largo
- **pose** (−4): mão na cintura: 36 cm² de pele esticando/encolhendo demais (braço 36 cm²)
- **forma** (−0): silhueta facetada: até 1.6 mm de quina no coxa com 18 lados (mais segmentos)

## menino (100)

Medidas (frações da altura; mm nas emendas): altura 1.674 · cabeca 0.155 · ombros 0.237 · quadril 0.194 · braco 0.171 · antebraco 0.143 · mao 0.093 · coxa 0.232 · canela 0.243 · pe 0.141 · hOmbro 0.784 · hCotovelo 0.615 · hPunho 0.486 · hQuadril 0.512 · hJoelho 0.281 · triangulos 17932 · quina_tronco 0.6 · quina_coxa 1.1 · quina_braço 0.7 · tampaOmbro 0 · mão solta do punho 4.3 · pé solto da perna 5 · cabeça solta do pescoço 0 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente -2.4

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 6.3 · passoAltura 0.429 · bracoContraPerna -0.483

Poses: braço erguido (lata na cabeça) (vinco 11, dentro 0 mm) · braços à frente (vinco 13, dentro 0 mm) · braços abertos (vinco 0, dentro 0 mm) · agachado juntando (vinco 13, dentro 0 mm) · ajoelhado lavando (vinco 7, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 19, dentro 0 mm) · enxuga a testa (vinco 24, dentro 0 mm) · mão na cintura (vinco 19, dentro 0 mm)

- nada a corrigir

## menina (99)

Medidas (frações da altura; mm nas emendas): altura 1.675 · cabeca 0.155 · ombros 0.242 · quadril 0.2 · braco 0.171 · antebraco 0.142 · mao 0.094 · coxa 0.232 · canela 0.244 · pe 0.149 · hOmbro 0.784 · hCotovelo 0.615 · hPunho 0.489 · hQuadril 0.513 · hJoelho 0.281 · triangulos 18348 · quina_tronco 0.6 · quina_coxa 1 · quina_braço 0.6 · tampaOmbro 0 · mão solta do punho 4.3 · pé solto da perna 5 · cabeça solta do pescoço 0 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente -2.6

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 6.3 · passoAltura 0.429 · bracoContraPerna -0.483

Poses: braço erguido (lata na cabeça) (vinco 22, dentro 0 mm) · braços à frente (vinco 13, dentro 0 mm) · braços abertos (vinco 0, dentro 0 mm) · agachado juntando (vinco 13, dentro 0 mm) · ajoelhado lavando (vinco 7, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 32, dentro 0 mm) · enxuga a testa (vinco 25, dentro 0 mm) · mão na cintura (vinco 20, dentro 0 mm)

- **pose** (−4): enxada no alto: 32 cm² de pele esticando/encolhendo demais (tronco 17, braço 15 cm²)

## Fontes

- Segmentos do corpo como fração da altura: Drillis & Contini (1966); Winter, *Biomechanics and Motor Control of Human Movement*.
- Criança de 6 a 8 anos: cabeça com ~1/6 da altura, pernas proporcionalmente mais curtas (tabelas de crescimento e antropometria infantil).
- Andar: passo de ~0,41 da altura a ~1,2 m/s, centro do corpo subindo e descendo 3–6 cm, braço em oposição à perna (Perry, *Gait Analysis*).
