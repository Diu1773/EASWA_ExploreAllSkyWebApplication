"""EASWA 전체 학습 경로 동시 30명 부하 실측 (2026-09-05).

load_test_transit.py 는 측광+적합만 쟀다. 이건 학생이 실제로 밟는 경로 전체를 돌린다.

  1) GET  /                     첫 화면(정적 번들)
  2) GET  /api/targets          대상 목록
  3) GET  .../preview           컷아웃 프리뷰 (base64 PNG 포함, 레이트리밋 대상)
  4) POST /api/transit/photometry-stream
  5) POST /api/transit/fit-stream
  6) POST 구글시트 sink         기록 저장 (Apps Script, 스크립트 lock 20초)

시트 오염 방지 — 세 겹으로 표시해 기존 집계 필터가 전부 걸러낸다:
  anon_id     = "DELETE-ME-..."      (필터: anon_id 에 DELETE-ME 포함 시 제외)
  app_version = "LOADTEST"           (필터: app_version in {dev,local-dev,LOADTEST,probe} 제외)
  target_id   = "__loadtest_wasp_6_b" (필터: target_id 가 __ 로 시작 시 제외)
"""
import asyncio, json, sys, time, uuid
import httpx

BASE = "https://easwa-webapp.onrender.com/api"
ROOT = "https://easwa-webapp.onrender.com/"
SINK = ("https://script.google.com/macros/s/"
        "AKfycbyAVuJpZZ7fwhCn7SLnJtUv_kHi8wQM6WfUJTr4LYtJ1Q7HHZ73iFTSmEG0RR69QuIh/exec")
TARGET, OBS = "wasp_6_b", "wasp_6_b_sector_0002"
PERIOD = 3.3610026
STELLAR = dict(stellar_temperature=5438.0, stellar_logg=4.565, stellar_metallicity=-0.15)

N = int(sys.argv[1]) if len(sys.argv) > 1 else 30
STAGGER = float(sys.argv[2]) if len(sys.argv) > 2 else 0.0   # 0 = 동기화 버스트(최악)


def window(points, period):
    ts = [p["hjd"] for p in points if p.get("hjd") is not None]
    lo, hi = min(ts), max(ts)
    span = hi - lo
    center = min(points, key=lambda p: p["magnitude"])["hjd"]
    half = min(max(period * 0.12, 0.08), 0.6, span / 3)
    return max(lo, center - half), min(hi, center + half), center


async def ndjson(client, url, payload, timeout):
    final, queued = None, False
    async with client.stream("POST", url, json=payload, timeout=timeout) as r:
        if r.status_code != 200:
            await r.aread()
            return None, False, r.status_code
        async for line in r.aiter_lines():
            line = line.strip()
            if not line:
                continue
            try:
                ev = json.loads(line)
            except json.JSONDecodeError:
                continue
            if ev.get("type") == "queued" or "번째" in str(ev.get("message", "")):
                queued = True
            if ev.get("type") == "result":
                final = ev.get("data")
    return final, queued, 200


def sink_payload(anon, notes_text):
    return {
        "anon_id": anon,
        "target_id": "__loadtest_wasp_6_b",
        "status": "draft",
        "rp_rs": 0.14534, "rp_rs_err": 0.0021,
        "depth_pct": 0.14534 ** 2 * 100,
        "period_days": PERIOD, "chi2_red": 0.93,
        "steps_note_json": json.dumps({
            "reference_comparison": notes_text,
            "next_step": "비교성을 더 밝은 별로 바꿔서 다시 해보겠다.",
        }, ensure_ascii=False),
        "selfcheck_json": json.dumps([
            {"step": "step2_metadata", "id": "tr_meta_sc1", "answer": "O", "correct": True},
            {"step": "step5_compare", "id": "tr_cmp_sc2", "answer": 0, "correct": True},
        ]),
        "selfcheck_answered": 5, "selfcheck_total": 5, "selfcheck_correct": 4,
        "lab_guide_json": json.dumps({
            "select_q3": "화면에 표시된 위치와 밝기가 비슷한 별로 골랐다.",
            "run_q3": "구경이 너무 크면 옆 별빛이 섞여서 오차가 커진다.",
        }, ensure_ascii=False),
        "lab_guide_answered": 2,
        "app_version": "LOADTEST",
        "user_agent": "LoadTest/2026-09-05 (concurrency probe)",
        "logged_in": False,
        "site_rating": 0, "site_feedback": "",
    }


async def one_user(i, rec_out):
    anon = f"DELETE-ME-{uuid.uuid4()}"
    r = {"user": i, "anon": anon, "index_s": None, "targets_s": None, "preview_s": None,
         "phot_s": None, "fit_s": None, "sink_s": None, "sink_status": None,
         "queued": False, "err": None, "rp_rs": None}
    t_all = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=None, follow_redirects=True) as c:
            t = time.perf_counter()
            resp = await c.get(ROOT, timeout=180)
            r["index_s"] = round(time.perf_counter() - t, 1)
            if resp.status_code != 200:
                r["err"] = f"index HTTP {resp.status_code}"; return

            t = time.perf_counter()
            resp = await c.get(f"{BASE}/targets", timeout=180)
            r["targets_s"] = round(time.perf_counter() - t, 1)
            if resp.status_code != 200:
                r["err"] = f"targets HTTP {resp.status_code}"; return

            t = time.perf_counter()
            resp = await c.get(
                f"{BASE}/transit/targets/{TARGET}/observations/{OBS}/preview",
                params={"size_px": 50}, timeout=300)
            r["preview_s"] = round(time.perf_counter() - t, 1)
            if resp.status_code != 200:
                r["err"] = f"preview HTTP {resp.status_code}"; return
            pv = resp.json()
            comps = [s["pixel"] for s in (pv.get("tic_stars") or []) if s.get("recommended")][:8]

            t = time.perf_counter()
            phot, q1, st = await ndjson(c, f"{BASE}/transit/photometry-stream", {
                "target_id": TARGET, "observation_id": OBS, "cutout_size_px": 50,
                "target_position": pv["target_position"], "comparison_positions": comps,
                "aperture_radius": 2.5, "inner_annulus": 4.0, "outer_annulus": 6.0,
            }, 900)
            r["phot_s"] = round(time.perf_counter() - t, 1); r["queued"] |= q1
            if phot is None:
                r["err"] = f"photometry HTTP {st}"; return
            lc = (phot.get("light_curve") or {}).get("points") or []
            if not lc:
                r["err"] = "empty light curve"; return

            s0, s1, c0 = window(lc, PERIOD)
            t = time.perf_counter()
            fit, q2, st = await ndjson(c, f"{BASE}/transit/fit-stream", {
                "target_id": TARGET, "period": PERIOD, "t0": c0,
                "fit_mode": "bjd_window", "bjd_start": s0, "bjd_end": s1,
                "fit_limb_darkening": False, "fit_window_phase": 0.12,
                "baseline_order": 0, "sigma_clip_sigma": 0.0, "sigma_clip_iterations": 0,
                "filter_name": "TESS", "refine_mcmc": None, "points": lc, **STELLAR,
            }, 900)
            r["fit_s"] = round(time.perf_counter() - t, 1); r["queued"] |= q2
            if fit is None:
                r["err"] = f"fit HTTP {st}"; return
            r["rp_rs"] = (fit.get("fitted_params") or {}).get("rp_rs")

            # 6) 시트 기록 — 학생이 기록을 쓰는 순간. 여기가 lock 경합 지점.
            t = time.perf_counter()
            sr = await c.post(SINK, json=sink_payload(
                anon, f"user{i}: 비교성이 적어서 오차가 커진 것 같다. 별빛 오염도 있었다."),
                timeout=300)
            r["sink_s"] = round(time.perf_counter() - t, 1)
            r["sink_status"] = sr.status_code
            try:
                body = sr.json()
                if not body.get("ok", True):
                    r["err"] = f"sink not ok: {str(body)[:120]}"
            except Exception:
                if sr.status_code != 200:
                    r["err"] = f"sink HTTP {sr.status_code}"
    except Exception as e:
        r["err"] = f"{type(e).__name__}: {str(e)[:140]}"
    finally:
        r["total_s"] = round(time.perf_counter() - t_all, 1)
        rec_out.append(r)


def stat(rows, key):
    v = sorted(x[key] for x in rows if x.get(key) is not None)
    if not v:
        return "—"
    return f"중앙 {v[len(v)//2]}초  최대 {v[-1]}초"


async def main():
    print(f"전체 학습 경로 동시 {N}명 (시차 {STAGGER}초)\n{'='*64}", flush=True)
    async with httpx.AsyncClient(timeout=None) as c:
        t = time.perf_counter()
        h = await c.get(f"{BASE}/health", timeout=180)
        print(f"[health before] {h.status_code}  {round(time.perf_counter()-t,1)}초\n", flush=True)

    rows = []
    t0 = time.perf_counter()

    async def launch(i):
        await asyncio.sleep(i * STAGGER)
        await one_user(i, rows)

    await asyncio.gather(*(launch(i) for i in range(N)))
    wall = round(time.perf_counter() - t0, 1)

    ok = [r for r in rows if r["err"] is None]
    bad = [r for r in rows if r["err"] is not None]

    print(f"\n{'='*64}\n  성공 {len(ok)}/{N}    벽시계 전체 {wall}초\n{'='*64}")
    for label, key in [("첫 화면", "index_s"), ("대상 목록", "targets_s"),
                       ("컷아웃 프리뷰", "preview_s"), ("측광", "phot_s"),
                       ("적합", "fit_s"), ("★ 시트 기록", "sink_s")]:
        print(f"  {label:<14} {stat(rows, key)}")
    print(f"  개인 총소요      최대 {max((r.get('total_s') or 0) for r in rows)}초")
    print(f"  queued 관측      {sum(1 for r in rows if r['queued'])}/{N}")

    codes = {}
    for r in rows:
        if r["sink_status"]:
            codes[r["sink_status"]] = codes.get(r["sink_status"], 0) + 1
    print(f"  시트 응답코드    {codes or '없음'}")
    sunk = [r for r in rows if r["sink_s"] is not None]
    print(f"  시트 도달        {len(sunk)}/{N}")

    rps = [r["rp_rs"] for r in ok if r["rp_rs"]]
    if rps:
        rps.sort()
        print(f"  Rp/R*            중앙 {rps[len(rps)//2]:.5f}  (기대 ~0.1453)")
    if bad:
        print(f"\n  ! 실패 {len(bad)}건")
        for r in bad[:15]:
            print(f"     user{r['user']:>2} {r['err']}")
            print(f"          index={r['index_s']} targets={r['targets_s']} preview={r['preview_s']} "
                  f"phot={r['phot_s']} fit={r['fit_s']} sink={r['sink_s']}")

    await asyncio.sleep(60)
    async with httpx.AsyncClient(timeout=None) as c:
        h = await c.get(f"{BASE}/health", timeout=180)
        print(f"\n[health after+60s] {h.status_code}")

    print("\n[정리] 시트에 들어간 테스트 행 anon_id 접두 = DELETE-ME- , "
          f"target_id = __loadtest_wasp_6_b , app_version = LOADTEST  ({N}행)")


if __name__ == "__main__":
    asyncio.run(main())
