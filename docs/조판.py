# -*- coding: utf-8 -*-
"""투고본 한글·PDF 를 한 번에 뽑는다 (2026-09-11).

    python -X utf8 docs/조판.py

여덟 단계를 순서대로 돌린다. 손으로 돌리면 한 단계씩 빠진다 — 머리말 단계를 네 판
내리 빠뜨렸고(`Main/FAILURES.md` F-323), 쪽 나누기를 스타일 앞에서 정해 쪽이
비었다(F-328). 순서 자체가 규칙이므로 여기 한 곳에만 적는다.

    1. typeset_hwp.py      원고 → 한글용 HTML + 문단/표/그림 규칙
    2. make_hwp.py         HTML → hwp · 용지·머리말·그림·표·문단 간격
    3. hwpx_styles.py      스타일 이름의 점 떼기 + 간격용 빈 문단 걷어내기
    4. make_hwp.py --쪽나눔 부록 앞·갈린 표 앞 쪽 나누기 (3 뒤에 와야 한다)
    5. hwpx_headers.py     1쪽·홀수·짝수 머리말 세 종류
    6. set_character_breaks.py 한글 줄 나눔을 글자 단위로 최종 고정
    7. check_hwp_template_contract.py 글자·문단·스타일의 템플릿 일치 확인
    8. save_pdf.py         한글이 뽑은 PDF

끝나면 check_typeset.py 로 점검한다.
"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = r"C:\Users\bmffr\Desktop\Me\ERP2026_Cosmos"
MAIN = os.path.join(BASE, "EASWA_논문_v23_투고본.hwp")
import glob
ALT = os.path.join(BASE, "EASWA_논문_v23_투고본_새판*.hwp")   # 열려 있을 때 비켜 간 판


def newest():
    """한글에 열려 있어 「_새판」으로 비켜 간 판이 더 새것이면 그것을 쓴다."""
    # glob 은 **부를 때** 한다 — 앞 단계가 새로 만든 판을 봐야 한다
    cands = [p for p in [MAIN] + sorted(glob.glob(ALT)) if os.path.exists(p)]
    if not cands:
        sys.exit("투고본 한글 파일이 없다 — 2단계가 실패했다")
    return max(cands, key=os.path.getmtime)


def run(name, *args):
    print("\n── %s %s" % (name, " ".join(args)))
    r = subprocess.run([sys.executable, "-X", "utf8", os.path.join(HERE, name)] + list(args))
    if r.returncode:
        sys.exit("%s 가 %d 로 끝났다" % (name, r.returncode))


def main():
    run("typeset_hwp.py")
    run("make_hwp.py")
    hwp = newest()
    run("hwpx_styles.py", hwp)
    run("make_hwp.py", "--쪽나눔", hwp)
    run("hwpx_headers.py", hwp)
    # HWPX 왕복은 breakNonLatinWord를 버릴 수 있다. 같은 학회 게재본과 사용자
    # 확정에 맞춘 글자 단위 줄 나눔을 모든 HWPX 작업 뒤에 다시 고정한다.
    run("set_character_breaks.py", "--in-place", hwp)
    run("check_hwp_template_contract.py", hwp)
    # 검사한 바로 그 HWP에서 PDF를 만든다. 수정 시각이 더 늦은 옛 `_새판`이
    # 폴더에 남아 있어도 다른 파일을 집지 않는다.
    run("save_pdf.py", hwp)
    print("\n── check_typeset.py")
    subprocess.run([sys.executable, "-X", "utf8", os.path.join(HERE, "check_typeset.py")])


if __name__ == "__main__":
    main()
