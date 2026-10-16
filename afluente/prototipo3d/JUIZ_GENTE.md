# O juiz de gente

Relatório de `sim/juiz_gente.js` (o motor fica em `prototipo3d/js/juizgente.js`). Nota média: **95**.

Cada tipo de morador é montado, medido parado, posto nas poses do jogo e (o andar) seguido por 4 s. Na saia, mede-se também a folga do pano até o corpo (saiaFolga, em mm: os 10% mais afastados entre a cintura e o quadril).

| Tipo | Nota | Forma | Integração | Pose | Movimento | Triângulos |
|---|---|---|---|---|---|---|
| homem | **93** | 100 | 100 | 72 | 100 | 20704 |
| homem de chapéu | **91** | 94 | 100 | 72 | 100 | 20620 |
| mulher de saia | **97** | 94 | 100 | 96 | 100 | 19976 |
| mulher de vestido e lenço | **96** | 97 | 86 | 100 | 100 | 20540 |
| mulher forte de saia comprida | **98** | 96 | 100 | 96 | 100 | 19432 |
| mulher magra de vestido | **98** | 97 | 100 | 96 | 100 | 18156 |
| idoso | **88** | 86 | 100 | 66 | 100 | 19848 |
| menino | **99** | 96 | 100 | 100 | 100 | 18188 |
| menina | **98** | 96 | 100 | 96 | 100 | 18108 |

## homem (93)

Medidas (frações da altura; mm nas emendas): altura 1.695 · cabeca 0.139 · ombros 0.27 · quadril 0.214 · braco 0.179 · antebraco 0.155 · coxa 0.244 · canela 0.247 · pe 0.155 · hOmbro 0.807 · hCotovelo 0.629 · hPunho 0.487 · hQuadril 0.528 · hJoelho 0.284 · triangulos 20704 · quina_tronco 1 · quina_coxa 1.6 · quina_braço 1.1 · tampaOmbro 0 · mão solta do punho 4.3 · pé solto da perna 1.5 · cabeça solta do pescoço 0.6 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente 5.8

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 6.2 · passoAltura 0.429 · bracoContraPerna -0.508

Poses: braço erguido (lata na cabeça) (vinco 47, dentro 0 mm) · braços à frente (vinco 32, dentro 0 mm) · braços abertos (vinco 21, dentro 0 mm) · agachado juntando (vinco 32, dentro 0 mm) · ajoelhado lavando (vinco 69, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 49, dentro 0 mm) · enxuga a testa (vinco 40, dentro 0 mm) · mão na cintura (vinco 24, dentro 0 mm)

- **pose** (−6): ajoelhado lavando: 69 cm² de pele esticando/encolhendo demais (perna 59, braço 10 cm²)
- **pose** (−5): enxada no alto: 49 cm² de pele esticando/encolhendo demais (braço 37, tronco 12 cm²)
- **pose** (−5): braço erguido (lata na cabeça): 47 cm² de pele esticando/encolhendo demais (braço 35, tronco 12 cm²)
- **pose** (−4): enxuga a testa: 40 cm² de pele esticando/encolhendo demais (braço 34, tronco 6 cm²)
- **pose** (−4): braços à frente: 32 cm² de pele esticando/encolhendo demais (braço 32 cm²)
- **pose** (−4): agachado juntando: 32 cm² de pele esticando/encolhendo demais (braço 32 cm²)
- **forma** (−0): silhueta facetada: até 1.6 mm de quina no coxa com 18 lados (mais segmentos)

## homem de chapéu (91)

Medidas (frações da altura; mm nas emendas): altura 1.694 · cabeca 0.14 · ombros 0.272 · quadril 0.216 · braco 0.179 · antebraco 0.155 · mao 0.104 · coxa 0.247 · canela 0.25 · pe 0.155 · hOmbro 0.809 · hCotovelo 0.631 · hPunho 0.49 · hQuadril 0.534 · hJoelho 0.287 · triangulos 20620 · quina_tronco 0.9 · quina_coxa 1.6 · quina_braço 1 · tampaOmbro 0 · mão solta do punho 4.7 · pé solto da perna 1 · cabeça solta do pescoço 0 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente 4.9

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 6.2 · passoAltura 0.429 · bracoContraPerna -0.508

Poses: braço erguido (lata na cabeça) (vinco 45, dentro 0 mm) · braços à frente (vinco 33, dentro 0 mm) · braços abertos (vinco 21, dentro 0 mm) · agachado juntando (vinco 33, dentro 0 mm) · ajoelhado lavando (vinco 70, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 48, dentro 0 mm) · enxuga a testa (vinco 44, dentro 0 mm) · mão na cintura (vinco 25, dentro 0 mm)

- **pose** (−6): ajoelhado lavando: 70 cm² de pele esticando/encolhendo demais (perna 60, braço 10 cm²)
- **pose** (−5): enxada no alto: 48 cm² de pele esticando/encolhendo demais (braço 34, tronco 15 cm²)
- **pose** (−5): braço erguido (lata na cabeça): 45 cm² de pele esticando/encolhendo demais (braço 33, tronco 12 cm²)
- **pose** (−5): enxuga a testa: 44 cm² de pele esticando/encolhendo demais (braço 38, tronco 6 cm²)
- **pose** (−4): braços à frente: 33 cm² de pele esticando/encolhendo demais (braço 33 cm²)
- **pose** (−4): agachado juntando: 33 cm² de pele esticando/encolhendo demais (braço 33 cm²)
- **forma** (−3): largura do quadril 0.216 da altura (o corpo de verdade: 0.163–0.215) — longo/largo
- **forma** (−3): cabeça (alto ao queixo) 0.14 da altura (o corpo de verdade: 0.12–0.14) — longo/largo

## mulher de saia (97)

Medidas (frações da altura; mm nas emendas): altura 1.693 · cabeca 0.141 · ombros 0.247 · quadril 0.224 · braco 0.173 · antebraco 0.145 · mao 0.097 · coxa 0.241 · canela 0.244 · pe 0.147 · hOmbro 0.804 · hCotovelo 0.631 · hPunho 0.501 · hQuadril 0.521 · hJoelho 0.281 · triangulos 19976 · quina_tronco 0.9 · quina_coxa 1.5 · quina_braço 1 · tampaOmbro 0 · mão solta do punho 4.5 · pé solto da perna 0.7 · cabeça solta do pescoço 1.3 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente 5.1 · saiaFolga 45.9

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 6.2 · passoAltura 0.429 · bracoContraPerna -0.508

Poses: braço erguido (lata na cabeça) (vinco 20, dentro 0 mm) · braços à frente (vinco 18, dentro 0 mm) · braços abertos (vinco 16, dentro 0 mm) · agachado juntando (vinco 18, dentro 0 mm) · ajoelhado lavando (vinco 9, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 19, dentro 0 mm) · enxuga a testa (vinco 27, dentro 0 mm) · mão na cintura (vinco 22, dentro 0 mm)

- **pose** (−4): enxuga a testa: 27 cm² de pele esticando/encolhendo demais (braço 27 cm²)
- **forma** (−3): cabeça (alto ao queixo) 0.141 da altura (o corpo de verdade: 0.12–0.14) — longo/largo
- **forma** (−3): altura do punho 0.501 da altura (o corpo de verdade: 0.46–0.5) — longo/largo

## mulher de vestido e lenço (96)

Medidas (frações da altura; mm nas emendas): altura 1.695 · cabeca 0.139 · ombros 0.242 · quadril 0.216 · braco 0.173 · antebraco 0.145 · mao 0.096 · coxa 0.241 · canela 0.245 · pe 0.141 · hOmbro 0.804 · hCotovelo 0.631 · hPunho 0.502 · hQuadril 0.521 · hJoelho 0.281 · triangulos 20540 · quina_tronco 0.9 · quina_coxa 1.5 · quina_braço 1 · tampaOmbro 0 · mão solta do punho 4.5 · pé solto da perna 0.3 · cabeça solta do pescoço 0.6 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 14 · olhoAFrente 4.9 · saiaFolga 36.2

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 6.2 · passoAltura 0.429 · bracoContraPerna -0.508

Poses: braço erguido (lata na cabeça) (vinco 17, dentro 0 mm) · braços à frente (vinco 17, dentro 0 mm) · braços abertos (vinco 19, dentro 0 mm) · agachado juntando (vinco 17, dentro 0 mm) · ajoelhado lavando (vinco 11, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 18, dentro 0 mm) · enxuga a testa (vinco 23, dentro 0 mm) · mão na cintura (vinco 21, dentro 0 mm)

- **integração** (−14): lenço descendo sobre a testa até os olhos (14 pontos)
- **forma** (−3): altura do punho 0.502 da altura (o corpo de verdade: 0.46–0.5) — longo/largo

## mulher forte de saia comprida (98)

Medidas (frações da altura; mm nas emendas): altura 1.696 · cabeca 0.138 · ombros 0.249 · quadril 0.223 · braco 0.173 · antebraco 0.145 · mao 0.098 · coxa 0.243 · canela 0.247 · pe 0.146 · hOmbro 0.805 · hCotovelo 0.633 · hPunho 0.505 · hQuadril 0.526 · hJoelho 0.283 · triangulos 19432 · quina_tronco 0.8 · quina_coxa 1.4 · quina_braço 0.9 · tampaOmbro 0 · mão solta do punho 4.5 · pé solto da perna 0.7 · cabeça solta do pescoço 0.6 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente 4.3 · saiaFolga 43.5

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 6.2 · passoAltura 0.429 · bracoContraPerna -0.508

Poses: braço erguido (lata na cabeça) (vinco 18, dentro 0 mm) · braços à frente (vinco 18, dentro 0 mm) · braços abertos (vinco 16, dentro 0 mm) · agachado juntando (vinco 18, dentro 0 mm) · ajoelhado lavando (vinco 9, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 21, dentro 0 mm) · enxuga a testa (vinco 26, dentro 0 mm) · mão na cintura (vinco 21, dentro 0 mm)

- **forma** (−4): altura do punho 0.505 da altura (o corpo de verdade: 0.46–0.5) — longo/largo
- **pose** (−4): enxuga a testa: 26 cm² de pele esticando/encolhendo demais (braço 26 cm²)

## mulher magra de vestido (98)

Medidas (frações da altura; mm nas emendas): altura 1.694 · cabeca 0.138 · ombros 0.244 · quadril 0.222 · braco 0.173 · antebraco 0.145 · mao 0.099 · coxa 0.239 · canela 0.243 · pe 0.147 · hOmbro 0.803 · hCotovelo 0.63 · hPunho 0.501 · hQuadril 0.519 · hJoelho 0.28 · triangulos 18156 · quina_tronco 0.9 · quina_coxa 1.5 · quina_braço 1 · tampaOmbro 0 · mão solta do punho 4.5 · pé solto da perna 0.7 · cabeça solta do pescoço 1.3 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente 4.9 · saiaFolga 37.3

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 6.2 · passoAltura 0.429 · bracoContraPerna -0.508

Poses: braço erguido (lata na cabeça) (vinco 20, dentro 0 mm) · braços à frente (vinco 18, dentro 0 mm) · braços abertos (vinco 16, dentro 0 mm) · agachado juntando (vinco 18, dentro 0 mm) · ajoelhado lavando (vinco 9, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 19, dentro 0 mm) · enxuga a testa (vinco 27, dentro 0 mm) · mão na cintura (vinco 22, dentro 0 mm)

- **pose** (−4): enxuga a testa: 27 cm² de pele esticando/encolhendo demais (braço 27 cm²)
- **forma** (−3): altura do punho 0.501 da altura (o corpo de verdade: 0.46–0.5) — longo/largo

## idoso (88)

Medidas (frações da altura; mm nas emendas): altura 1.673 · cabeca 0.141 · ombros 0.278 · quadril 0.227 · braco 0.181 · antebraco 0.157 · mao 0.11 · coxa 0.25 · canela 0.253 · pe 0.157 · hOmbro 0.813 · hCotovelo 0.635 · hPunho 0.487 · hQuadril 0.54 · hJoelho 0.29 · triangulos 19848 · quina_tronco 1 · quina_coxa 1.6 · quina_braço 1 · tampaOmbro 0 · mão solta do punho 4.8 · pé solto da perna 1.2 · cabeça solta do pescoço 0.5 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente 5

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 6.2 · passoAltura 0.429 · bracoContraPerna -0.508

Poses: braço erguido (lata na cabeça) (vinco 47, dentro 4.3 mm) · braços à frente (vinco 28, dentro 0 mm) · braços abertos (vinco 19, dentro 0 mm) · agachado juntando (vinco 50, dentro 0 mm) · ajoelhado lavando (vinco 75, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 52, dentro 0 mm) · enxuga a testa (vinco 42, dentro 4.3 mm) · mão na cintura (vinco 35, dentro 0 mm)

- **forma** (−7): largura do quadril 0.227 da altura (o corpo de verdade: 0.163–0.215) — longo/largo
- **pose** (−7): ajoelhado lavando: 75 cm² de pele esticando/encolhendo demais (perna 60, braço 14 cm²)
- **pose** (−5): enxada no alto: 52 cm² de pele esticando/encolhendo demais (braço 37, tronco 15 cm²)
- **pose** (−5): agachado juntando: 50 cm² de pele esticando/encolhendo demais (braço 28, tronco 14 cm²)
- **pose** (−5): braço erguido (lata na cabeça): 47 cm² de pele esticando/encolhendo demais (braço 35, tronco 12 cm²)
- **pose** (−5): enxuga a testa: 42 cm² de pele esticando/encolhendo demais (braço 33, tronco 9 cm²)
- **pose** (−4): mão na cintura: 35 cm² de pele esticando/encolhendo demais (braço 35 cm²)
- **forma** (−4): largura dos ombros 0.278 da altura (o corpo de verdade: 0.225–0.275) — longo/largo
- **forma** (−4): cabeça (alto ao queixo) 0.141 da altura (o corpo de verdade: 0.12–0.14) — longo/largo
- **pose** (−4): braços à frente: 28 cm² de pele esticando/encolhendo demais (braço 28 cm²)

## menino (99)

Medidas (frações da altura; mm nas emendas): altura 1.675 · cabeca 0.155 · ombros 0.242 · quadril 0.194 · braco 0.171 · antebraco 0.142 · mao 0.095 · coxa 0.232 · canela 0.243 · pe 0.141 · hOmbro 0.784 · hCotovelo 0.615 · hPunho 0.494 · hQuadril 0.512 · hJoelho 0.281 · triangulos 18188 · quina_tronco 0.6 · quina_coxa 1.1 · quina_braço 0.7 · tampaOmbro 0 · mão solta do punho 4.3 · pé solto da perna 5 · cabeça solta do pescoço 0.5 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente -1

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 6.2 · passoAltura 0.429 · bracoContraPerna -0.508

Poses: braço erguido (lata na cabeça) (vinco 15, dentro 0 mm) · braços à frente (vinco 17, dentro 0 mm) · braços abertos (vinco 0, dentro 0 mm) · agachado juntando (vinco 17, dentro 0 mm) · ajoelhado lavando (vinco 11, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 18, dentro 0 mm) · enxuga a testa (vinco 22, dentro 0 mm) · mão na cintura (vinco 19, dentro 0 mm)

- **forma** (−4): altura do punho 0.494 da altura (o corpo de verdade: 0.42–0.49) — longo/largo

## menina (98)

Medidas (frações da altura; mm nas emendas): altura 1.674 · cabeca 0.156 · ombros 0.248 · quadril 0.2 · braco 0.171 · antebraco 0.142 · mao 0.091 · coxa 0.231 · canela 0.243 · pe 0.141 · hOmbro 0.783 · hCotovelo 0.616 · hPunho 0.495 · hQuadril 0.512 · hJoelho 0.28 · triangulos 18108 · quina_tronco 0.6 · quina_coxa 1 · quina_braço 0.7 · tampaOmbro 0 · mão solta do punho 4.3 · pé solto da perna 5 · cabeça solta do pescoço 0.4 · cabeloNoRosto 0 · cabeloFuraChapeu 0 · lencoNosOlhos 0 · olhoAFrente -0.9

Andar: velocidade 1.25 · deslize 0.05 · sobeDesce 6.2 · passoAltura 0.429 · bracoContraPerna -0.508

Poses: braço erguido (lata na cabeça) (vinco 20, dentro 0 mm) · braços à frente (vinco 17, dentro 0 mm) · braços abertos (vinco 0, dentro 0 mm) · agachado juntando (vinco 17, dentro 0 mm) · ajoelhado lavando (vinco 11, dentro 0 mm) · sentado no chão (vinco 0, dentro 0 mm) · enxada no alto (vinco 19, dentro 0 mm) · enxuga a testa (vinco 26, dentro 0 mm) · mão na cintura (vinco 20, dentro 0 mm)

- **forma** (−4): altura do punho 0.495 da altura (o corpo de verdade: 0.42–0.49) — longo/largo
- **pose** (−4): enxuga a testa: 26 cm² de pele esticando/encolhendo demais (braço 23, tronco 3 cm²)

## Fontes

- Segmentos do corpo como fração da altura: Drillis & Contini (1966); Winter, *Biomechanics and Motor Control of Human Movement*.
- Criança de 6 a 8 anos: cabeça com ~1/6 da altura, pernas proporcionalmente mais curtas (tabelas de crescimento e antropometria infantil).
- Andar: passo de ~0,41 da altura a ~1,2 m/s, centro do corpo subindo e descendo 3–6 cm, braço em oposição à perna (Perry, *Gait Analysis*).
