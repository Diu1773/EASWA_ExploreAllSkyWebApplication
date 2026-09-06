import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useLangStore } from '../../i18n';
import { glossaryFor, type GlossaryScope } from '../../data/glossary';

/**
 * 상단 바의 「용어 해설」 — 화면에 나오는 용어·기호의 뜻을 어느 단계에서나 연다.
 *
 * 왜 필요한가 — 2026-07 현직 교사 검토에서 용어 설명이 가장 넓게 나온 요구였다.
 * 종전에는 식현상 Step 0 의 접힘 안에만 목록이 있어서, 정작 값이 튀어나오는
 * Step 4·5 에서 되돌아가야 했고 KMTNet·성단에는 목록 자체가 없었다.
 *
 * 왜 상단 바인가 — 처음에는 우하단에 고정했으나 탐구 화면 위에 늘 떠 있어
 * 거슬리고, 좁은 폭에서는 그래프 도구막대와 자리를 다퉜다. 언어 전환·로그인과
 * 같은 줄에 두면 «화면 전체에 걸린 도구»라는 성격도 분명해진다.
 *
 * 챗봇이 아니다. 미리 쓴 뜻풀이를 검색해 보여 줄 뿐이며 학습자의 판단을 대신하지
 * 않는다.
 */

/** 경로에서 지금 보고 있는 탐구모듈을 읽어 그 갈래를 앞세운다. */
function scopeFromPath(pathname: string): GlossaryScope | null {
  const path = pathname.toLowerCase();
  if (path.includes('transit')) return 'transit';
  if (path.includes('kmtnet')) return 'kmtnet';
  if (path.includes('cluster') || path.includes('cmd')) return 'cluster';
  return null;
}

export function GlossaryDock() {
  const lang = useLangStore((state) => state.lang);
  const ko = lang === 'ko';
  const { pathname } = useLocation();
  // 열린 상태를 「어느 경로에서 열었는가」로 들고 있다. 경로가 바뀌면 값이
  // 저절로 어긋나 닫힌 것이 되므로, 화면 이동마다 닫는 effect 가 필요 없다
  // (effect 안에서 상태를 바로 바꾸면 렌더가 한 번 더 돈다).
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const setOpen = (next: boolean) => setOpenAt(next ? pathname : null);
  const [query, setQuery] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const scope = useMemo(() => scopeFromPath(pathname), [pathname]);
  const entries = useMemo(() => glossaryFor(scope), [scope]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((entry) => {
      const hay = [entry.term, ...(entry.aliases ?? []), entry.def[lang] ?? entry.def.ko]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [entries, query, lang]);

  // Escape 로 닫고 포커스를 버튼으로 돌려준다. 키보드만 쓰는 사람이 패널을 닫은
  // 뒤 탭 순서의 처음으로 튕기지 않게 하려는 것.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div className="glossary-dock">
      <button
        type="button"
        ref={buttonRef}
        className="glossary-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        title={ko ? '화면에 나오는 용어와 기호의 뜻' : 'Terms and symbols used on screen'}
      >
        {ko ? '용어 해설' : 'Terms'}
      </button>
      {open && (
        <div
          className="glossary-panel"
          ref={panelRef}
          role="dialog"
          aria-label={ko ? '용어 해설' : 'Glossary'}
        >
          <div className="glossary-panel-head">
            <strong>{ko ? '용어 해설' : 'Glossary'}</strong>
            <button
              type="button"
              className="glossary-close"
              onClick={() => {
                setOpen(false);
                buttonRef.current?.focus();
              }}
              aria-label={ko ? '닫기' : 'Close'}
            >
              ✕
            </button>
          </div>
          <input
            className="glossary-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={ko ? '용어나 기호로 찾기' : 'Search a term or symbol'}
            aria-label={ko ? '용어 검색' : 'Search glossary'}
          />
          <div className="glossary-list">
            {shown.length === 0 ? (
              <p className="glossary-empty">
                {ko
                  ? '찾는 용어가 없습니다. 화면에 쓰인 표기 그대로 넣어 보세요.'
                  : 'No match. Try the spelling exactly as it appears on screen.'}
              </p>
            ) : (
              shown.map((entry) => (
                <div className="glossary-item" key={`${entry.scope}:${entry.term}`}>
                  <dt>{entry.term}</dt>
                  <dd>{entry.def[lang] ?? entry.def.ko}</dd>
                </div>
              ))
            )}
          </div>
          <p className="glossary-foot">
            {ko
              ? '뜻만 적혀 있습니다. 결과의 원인과 결론은 화면의 값을 보고 직접 판단하세요.'
              : 'Definitions only — read the values on screen to judge causes and conclusions yourself.'}
          </p>
        </div>
      )}
    </div>
  );
}
