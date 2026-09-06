import { useEffect, useMemo, useRef, useState } from 'react';
import { useLangStore } from '../../i18n';
import { glossaryFor, type GlossaryScope } from '../../data/glossary';

/**
 * 화면 우하단에 붙어 있는 용어함.
 *
 * 왜 여기에 두는가 — 2026-07 현직 교사 검토에서 용어 설명이 가장 넓게 나온 요구였다.
 * 종전에는 식현상 Step 0 의 접힘 안에만 목록이 있어서, 정작 값이 튀어나오는 Step 4·5
 * 에서 되돌아가야 했고 KMTNet·성단에는 목록 자체가 없었다. 단계를 벗어나지 않고
 * 열어 보게 하려면 흐름 밖에 상주하는 자리가 필요하다.
 *
 * 챗봇이 아니다. 미리 쓴 뜻풀이를 검색해 보여 줄 뿐이며 학습자의 판단을 대신하지
 * 않는다. 스스로 열 때만 나타나므로 진행을 가로막지도 않는다.
 */
export function GlossaryDock({ scope = null }: { scope?: GlossaryScope | null }) {
  const lang = useLangStore((state) => state.lang);
  const ko = lang === 'ko';
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const entries = useMemo(() => glossaryFor(scope), [scope]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      const hay = [e.term, ...(e.aliases ?? []), e.def[lang] ?? e.def.ko].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [entries, query, lang]);

  // Escape 로 닫고, 닫을 때 포커스를 버튼으로 돌려준다. 키보드만 쓰는 사람이
  // 패널을 닫은 뒤 탭 순서의 처음으로 튕기지 않게 하려는 것.
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

  // 바깥을 누르면 닫는다. 탐구 화면 위에 떠 있으므로 진행을 막지 않아야 한다.
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
      {open && (
        <div className="glossary-panel" ref={panelRef} role="dialog" aria-label={ko ? '용어함' : 'Glossary'}>
          <div className="glossary-panel-head">
            <strong>{ko ? '용어 풀이' : 'Glossary'}</strong>
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
      <button
        type="button"
        ref={buttonRef}
        className="glossary-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title={ko ? '화면에 나오는 용어와 기호의 뜻' : 'Terms and symbols used on screen'}
      >
        {ko ? '용어' : 'Terms'}
      </button>
    </div>
  );
}
