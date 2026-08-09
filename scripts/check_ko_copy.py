# -*- coding: utf-8 -*-
"""한국어 문구 검사 — 번역투 신호와 «이미 한국어가 있는데 영문으로 쓴 자리»를 센다.

판정하지 않는다. 사람이 볼 목록을 만든다 — 문맥상 원어가 맞는 자리(코드 식별자
인용, 파일명, 논문 제목)가 실제로 있기 때문이다.

    python -X utf8 scripts/check_ko_copy.py            # 요약
    python -X utf8 scripts/check_ko_copy.py --list     # 해당 문구 전부
    python -X utf8 scripts/check_ko_copy.py --base 20  # 기준선 대비 증가만 실패로

근거·용어 결정은 docs/TERMS_KO.md, 문체 규칙은 docs/KOREAN_COPY_RULES.md.
"""
from __future__ import annotations
import argparse, collections, glob, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend', 'src')

# 한국어 대응이 이미 앱 안에 있는 것들 (docs/TERMS_KO.md §2·§3)
TERMS = {
    'aperture': '구경', 'transit': '식현상', 'fit': '적합', 'residual': '잔차',
    'outlier': '이상치', 'pixel': '픽셀', 'noise': '잡음', 'depth': '깊이',
    'blending': '혼합', 'contamination': '오염', 'cmd': '색등급도',
    'roi': '관심영역', 'dip': '밝기 감소',
}
# 번역 대상이 아닌 것 — 고유명사·미션·기호
KEEP = {
    'tess', 'nasa', 'kmtnet', 'gaia', 'mast', 'simbad', 'vizier', 'kasi', 'ctio', 'saao',
    'sso', 'exoplanet', 'archive', 'wasp', 'dr3', 'esa', 'stsci', 'jwst', 'hst', 'aura',
    'png', 'csv', 'json', 'google', 'batman', 'mcmc', 'dss', 'dia', 'paczynski', 'paczy',
    'ppm', 'px', 'dof', 'snr', 'rms', 'mad', 'bjd', 'btjd', 'sqrt',
}
# 번역투 신호 (docs/KOREAN_COPY_RULES.md §1)
STYLE = {
    '~할 수 있다': r'수 있습니다|수 있다|수 있으며',
    '~을/를 통해': r'을 통해|를 통해',
    '~에 대한/대해': r'에 대한|에 대해',
    '~것이다/하는 것': r'것이다|것입니다|하는 것을|하는 것이',
    '~로 인해/에 의해': r'로 인해|에 의해|으로 인해',
    '관계절 명사구(~수 있는 N)': r'줄 수 있는 |있는 [가-힣]{2,}(을|를|이|가) ',
    '한국어 문장 속 대시': r'[가-힣] — [가-힣]',
}


def collect() -> list[tuple[str, str]]:
    out = []
    files = glob.glob(os.path.join(ROOT, '**', '*.ts'), recursive=True) + \
            glob.glob(os.path.join(ROOT, '**', '*.tsx'), recursive=True)
    pats = (r"ko:\s*'([^']{4,})'", r'ko:\s*"([^"]{4,})"', r"lang === 'ko' \? '([^']{4,})'")
    for f in files:
        try:
            t = open(f, encoding='utf-8').read()
        except OSError:
            continue
        for p in pats:
            for m in re.finditer(p, t):
                s = m.group(1)
                if re.search(r'[가-힣]', s):
                    out.append((os.path.basename(f), s))
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--list', action='store_true', help='해당 문구를 전부 출력')
    ap.add_argument('--base', type=int, default=None,
                    help='영문 노출 기준선. 이 수를 넘으면 종료코드 1')
    args = ap.parse_args()

    ko = collect()
    if not ko:
        print(f'한국어 문구를 찾지 못했습니다 — 경로 확인: {ROOT}')
        return 2

    term_hits: dict[str, list[tuple[str, str]]] = collections.defaultdict(list)
    style_hits: dict[str, list[tuple[str, str]]] = collections.defaultdict(list)
    for f, s in ko:
        for w in re.findall(r'[A-Za-z][A-Za-z\-]{2,}', s):
            lw = w.lower()
            if lw in KEEP or lw not in TERMS:
                continue
            term_hits[lw].append((f, s))
        for name, p in STYLE.items():
            if re.search(p, s):
                style_hits[name].append((f, s))

    total_term = sum(len(v) for v in term_hits.values())
    total_style = sum(len(v) for v in style_hits.values())

    print(f'한국어 문구 {len(ko)}개 검사\n')
    print(f'■ 한국어 대응이 있는데 영문으로 쓴 자리: {total_term}건')
    for w, v in sorted(term_hits.items(), key=lambda x: -len(x[1])):
        print(f'   {w:<14} {len(v):>3}건  → {TERMS[w]}')
        if args.list:
            for f, s in v:
                print(f'        {f}: {s[:100]}')
    print(f'\n■ 번역투 신호: {total_style}건')
    for name, v in sorted(style_hits.items(), key=lambda x: -len(x[1])):
        print(f'   {name:<26} {len(v):>3}건')
        if args.list:
            for f, s in v:
                print(f'        {f}: {s[:100]}')

    print('\n판정은 사람이 합니다 — 원어가 맞는 자리(코드 식별자·파일명·논문 제목)가 있습니다.')
    print('용어 결정: docs/TERMS_KO.md · 문체 규칙: docs/KOREAN_COPY_RULES.md')

    if args.base is not None and total_term > args.base:
        print(f'\n실패: 영문 노출 {total_term}건 > 기준선 {args.base}건')
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
