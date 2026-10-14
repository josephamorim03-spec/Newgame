import sys, statistics as st
from multiprocessing import Pool
import afluente as A

BOTS = {"aleatorio": A.bot_random, "guloso": A.bot_greedy, "rio": A.make_bot_river()}


def source_blocked(g):
    v = g.v
    c = A.add(v["src"], v["sport"])
    return c in g.board and A.OPP(v["sport"]) not in g.board[c][1]


def one(args):
    rules, bname, seed = args
    g = A.run(seed, rules, BOTS[bname])
    q = g.q
    irr_terrain = q["irrigated"] / len(g.board)
    by_turn = [e["irrigated"] / e["placed"] for e in g.log]
    return dict(total=g.total(), board=q["board"], pulse=g.pulse_total, harvest=g.harvest_total,
                E=q["E"] * rules.w["E"], F=q["F"], C=q["C"], V=q["V"], R=q["R"], irr=irr_terrain,
                blocked=source_blocked(g), irr16=by_turn[15], irr24=by_turn[23] if len(by_turn) > 23 else None,
                obj=(q["F"] == 1) + (q["C"] >= 6) + (q["V"] >= 2), zero_turns=sum(1 for e in g.log if e["delta"] <= 0))


def report(rules, n=120, label=""):
    print(f"\n=== {label} (n={n} vales por bot) ===")
    with Pool(4) as p:
        for b in BOTS:
            rs = p.map(one, [(rules, b, s) for s in range(n)])
            m = lambda k: st.mean(r[k] for r in rs)
            tot = m("total")
            print(f"{b:11s} total {tot:6.1f} | E {m('E')/tot*100:4.0f}% | pulso {m('pulse')/tot*100:4.0f}% "
                  f"| colheita {m('harvest')/tot*100:4.0f}% | foz {m('F')*100:4.0f}% | C>=6 {sum(r['C']>=6 for r in rs)/n*100:4.0f}% "
                  f"| V>=2 {sum(r['V']>=2 for r in rs)/n*100:4.0f}% | rios ativos {m('R'):4.1f} | irrigado fim {m('irr')*100:4.0f}% "
                  f"| nascente bloqueada {sum(r['blocked'] for r in rs)/n*100:4.0f}% | turnos sem ganho {m('zero_turns'):4.1f}")
    return


if __name__ == "__main__":
    report(A.Rules(), label="v0.2 como especificado")
