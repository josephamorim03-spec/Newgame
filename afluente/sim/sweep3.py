import sys, statistics as st, time
from multiprocessing import Pool
import afluente3 as A

STYLES = {
    "aleatorio": None,
    "guloso": "greedy",
    "plan-colheita": dict(w_dry=0.0, w_foz=1.0),
    "plan-florada": dict(w_dry=5.0, w_foz=1.0),
    "plan-foz": dict(w_dry=1.2, w_foz=6.0),
}

def bot_for(name):
    s = STYLES[name]
    if s is None: return A.bot_random
    if s == "greedy": return A.bot_greedy
    return A.make_planner(**s)

def one(args):
    rules, name, seed = args
    g = A.run(seed, rules, bot_for(name))
    fturn = next((e["turn"] for e in g.log if e["F"]), None)
    return dict(total=g.total(), F=g.q["F"], fturn=fturn, flor=len(g.flor),
                big=sum(1 for e in g.log if e["N"] >= 3), disc=sum(1 for e in g.log if e["kind"] == "X"),
                irr=g.q["irr"] / max(1, len(g.terr)))

def report(rules, label, n=60, styles=None):
    print(f"\n=== {label} (n={n}) ===", flush=True)
    out = {}
    with Pool(4) as p:
        for name in styles or STYLES:
            rs = p.map(one, [(rules, name, s) for s in range(n)])
            m = lambda k: st.mean(r[k] for r in rs)
            ft = [r["fturn"] for r in rs if r["fturn"]]
            out[name] = [r["total"] for r in rs]
            print(f"{name:14s} total {m('total'):6.1f} ±{st.pstdev(r['total'] for r in rs):5.1f} | foz {m('F')*100:3.0f}% "
                  f"(turno med {st.median(ft) if ft else '-'}) | despertares>=3 {m('big'):.2f}/partida | floridos {m('flor'):.1f} "
                  f"| irrigado fim {m('irr')*100:3.0f}% | descartes {m('disc'):.2f}", flush=True)
    return out

if __name__ == "__main__":
    t = time.time()
    report(A.Rules3(pulse_mult=0), "v0.3 só colheitas")
    report(A.Rules3(pulse_mult=0, flor_min=3), "v0.3 + Florada (N>=3 dobra produção)")
    print(f"{time.time()-t:.0f}s")
