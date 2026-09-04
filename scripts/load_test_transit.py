"""EASWA 프로덕션 동시 30명 부하 실측 (2026-09-05).

2026-07-16 측정(docs/LOAD_TEST_2026-07.md 8절)과 같은 조건·같은 페이로드로,
인원만 15 -> 30 으로 올린다. 월요일 천체관측 교양수업(20~30명) 대비.

페이로드 충실도 — 프론트 실제 기본값에서 확인:
  측광: 번들 컷아웃 wasp_6_b_sector_0002, 50px, 구경 2.5/4.0/6.0,
        TIC 추천 비교성 8개(preview.tic_stars 중 recommended)
  적합: fit_mode=bjd_window, 창=가장 깊은 점 +-min(period*0.12,0.6,span/3),
        baseline 0차, 시그마클립 0/0, limb darkening 고정, TESS,
        항성 5438/4.565/-0.15, refine_mcmc=None(서버기본 OFF)
  검증: 단독 실행 Rp/R* 가 0.1455 근처여야 요청이 앱과 동일하다는 뜻
        (7/16 문서: 0.14556, 7절: 0.14534, 문헌 ~0.146)
"""
import asyncio, json, sys, time
import httpx

BASE = "https://easwa-webapp.onrender.com/api"
TARGET = "wasp_6_b"
OBS = "wasp_6_b_sector_0002"
PERIOD = 3.3610026
STELLAR = dict(stellar_temperature=5438.0, stellar_logg=4.565, stellar_metallicity=-0.15)

N_USERS = int(sys.argv[1]) if len(sys.argv) > 1 else 30
STAGGER = float(sys.argv[2]) if len(sys.argv) > 2 else 3.0  # 문서와 동일: 3초 시차


async def get_setup(client):
    r = await client.get(
        f"{BASE}/transit/targets/{TARGET}/observations/{OBS}/preview",
        params={"size_px": 50}, timeout=180,
    )
    r.raise_for_status()
    d = r.json()
    tpos = d["target_position"]
    rec = [s["pixel"] for s in (d.get("tic_stars") or []) if s.get("recommended")][:8]
    return tpos, rec


def photometry_payload(tpos, comps):
    return {
        "target_id": TARGET, "observation_id": OBS, "cutout_size_px": 50,
        "target_position": tpos, "comparison_positions": comps,
        "aperture_radius": 2.5, "inner_annulus": 4.0, "outer_annulus": 6.0,
    }


def default_window(points, period):
    """frontend computeDefaultBjdWindow 와 동일."""
    times = [p["hjd"] for p in points if p.get("hjd") is not None]
    lo, hi = min(times), max(times)
    span = hi - lo
    deepest = min(points, key=lambda p: p["magnitude"])
    center = deepest["hjd"]
    half = min(max(period * 0.12 if period > 0 else span * 0.08, 0.08), 0.6, span / 3)
    return max(lo, center - half), min(hi, center + half), center


async def consume_ndjson(client, url, payload, timeout):
    """NDJSON 스트림을 끝까지 소비. (final_obj, queued_seen, http_status)"""
    final, queued = None, False
    async with client.stream("POST", url, json=payload, timeout=timeout) as resp:
        status = resp.status_code
        if status != 200:
            await resp.aread()
            return None, False, status
        async for line in resp.aiter_lines():
            line = line.strip()
            if not line:
                continue
            try:
                ev = json.loads(line)
            except json.JSONDecodeError:
                continue
            t = ev.get("type") or ev.get("event")
            if t == "queued" or "번째" in str(ev.get("message", "")):
                queued = True
            if t in ("result", "complete", "done") or "light_curve" in ev or "fitted_params" in ev:
                final = ev
    return final, queued, status


async def one_user(idx, tpos, comps, results):
    rec = {"user": idx, "phot_s": None, "fit_s": None, "queued": False,
           "err": None, "rp_rs": None, "points": None, "total_s": None}
    t_start = time.perf_counter()
    try:
        async with httpx.AsyncClient(http2=False, timeout=None) as client:
            t0 = time.perf_counter()
            phot, q1, st1 = await consume_ndjson(
                client, f"{BASE}/transit/photometry-stream",
                photometry_payload(tpos, comps), 600)
            rec["phot_s"] = round(time.perf_counter() - t0, 1)
            rec["queued"] |= q1
            if phot is None:
                rec["err"] = f"photometry HTTP {st1}"
                return
            body = phot.get("data", phot)
            lc = (body.get("light_curve") or {}).get("points") or []
            rec["points"] = len(lc)
            if not lc:
                rec["err"] = "empty light curve"
                return

            start, end, center = default_window(lc, PERIOD)
            fit_payload = {
                "target_id": TARGET, "period": PERIOD, "t0": center,
                "fit_mode": "bjd_window", "bjd_start": start, "bjd_end": end,
                "fit_limb_darkening": False, "fit_window_phase": 0.12,
                "baseline_order": 0, "sigma_clip_sigma": 0.0, "sigma_clip_iterations": 0,
                "filter_name": "TESS", "refine_mcmc": None,
                "points": lc, **STELLAR,
            }
            t1 = time.perf_counter()
            fit, q2, st2 = await consume_ndjson(
                client, f"{BASE}/transit/fit-stream", fit_payload, 900)
            rec["fit_s"] = round(time.perf_counter() - t1, 1)
            rec["queued"] |= q2
            if fit is None:
                rec["err"] = f"fit HTTP {st2}"
                return
            fbody = fit.get("data", fit)
            rec["rp_rs"] = (fbody.get("fitted_params") or {}).get("rp_rs")
    except Exception as e:
        rec["err"] = f"{type(e).__name__}: {e}"
    finally:
        rec["total_s"] = round(time.perf_counter() - t_start, 1)
        results.append(rec)


async def scenario(n, tpos, comps, label):
    print(f"\n{'='*62}\n{label}  (사용자 {n}명, 시차 {STAGGER}초)\n{'='*62}", flush=True)
    results = []
    t0 = time.perf_counter()

    async def launch(i):
        await asyncio.sleep(i * STAGGER)
        await one_user(i, tpos, comps, results)

    await asyncio.gather(*(launch(i) for i in range(n)))
    wall = round(time.perf_counter() - t0, 1)

    ok = [r for r in results if r["err"] is None]
    bad = [r for r in results if r["err"] is not None]
    fits = sorted(r["fit_s"] for r in ok if r["fit_s"] is not None)
    phots = sorted(r["phot_s"] for r in ok if r["phot_s"] is not None)
    med = lambda a: a[len(a)//2] if a else None

    print(f"\n  성공 {len(ok)}/{n}   벽시계 전체 {wall}초")
    print(f"  측광  중앙 {med(phots)}초  최대 {max(phots) if phots else None}초")
    print(f"  적합  중앙 {med(fits)}초  최대 {max(fits) if fits else None}초")
    print(f"  개인 총소요 최대 {max((r['total_s'] for r in results), default=None)}초")
    print(f"  queued 관측 {sum(1 for r in results if r['queued'])}/{n}")
    rps = [r["rp_rs"] for r in ok if r["rp_rs"]]
    if rps:
        rps.sort()
        print(f"  Rp/R* 중앙 {med(rps):.5f}  범위 {min(rps):.5f}~{max(rps):.5f}  (기대 ~0.1455)")
    if bad:
        print(f"  ! 실패 {len(bad)}건:")
        for r in bad[:12]:
            print(f"      user{r['user']:>2}  {r['err']}   (phot={r['phot_s']} fit={r['fit_s']})")
    return results, wall


async def health(client, tag):
    try:
        t = time.perf_counter()
        r = await client.get(f"{BASE}/health", timeout=120)
        print(f"  [health {tag}] {r.status_code}  {round(time.perf_counter()-t,1)}초", flush=True)
        return r.status_code
    except Exception as e:
        print(f"  [health {tag}] 실패 {e}", flush=True)
        return None


async def main():
    async with httpx.AsyncClient(timeout=None) as c:
        await health(c, "before")
        print("\n[setup] preview 로 목표 좌표·추천 비교성 8개 취득", flush=True)
        tpos, comps = await get_setup(c)
        print(f"  target {tpos}\n  comparisons {len(comps)}개", flush=True)

    # 1) 기준선 1명 — 페이로드가 앱과 동일한지 Rp/R* 로 검증
    base, _ = await scenario(1, tpos, comps, "기준선 1명 (페이로드 검증)")
    if base and base[0]["rp_rs"]:
        v = base[0]["rp_rs"]
        print(f"\n  >>> 페이로드 검증: Rp/R*={v:.5f} "
              f"{'OK (7/16 0.14556 과 일치)' if 0.14 < v < 0.152 else '!! 값이 다름 — 페이로드 재확인 필요'}")
    else:
        print("\n  !! 기준선 실패 — 부하 시나리오 중단")
        return

    await asyncio.sleep(60)
    async with httpx.AsyncClient(timeout=None) as c:
        await health(c, "mid")

    # 2) 본 시나리오
    await scenario(N_USERS, tpos, comps, f"★ 동시 {N_USERS}명 (미측정 구간)")

    await asyncio.sleep(60)
    async with httpx.AsyncClient(timeout=None) as c:
        await health(c, "after+60s")


if __name__ == "__main__":
    asyncio.run(main())
