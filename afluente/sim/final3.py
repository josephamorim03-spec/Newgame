"""Configuração recomendada da v0.3 e seu relatório. Uso: python3 final3.py"""
import time
import afluente3 as A
from sweep3 import report

FINAL = A.Rules3(pulse_mult=0, foz_mult=1.0, foz_plus=1, turns=20, harvest_turns=(5, 10, 15, 20),
                 cards={"C": 6, "B": 5, "V": 3, "L2": 2, "L3": 3, "L4": 1})

if __name__ == "__main__":
    t = time.time()
    report(FINAL, "v0.3 final: 20 turnos, 4 Cheias, foz +1/terreno", n=80)
    print(f"{time.time()-t:.0f}s")
