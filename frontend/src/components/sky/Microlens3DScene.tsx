import { useEffect, useMemo, useRef, useState, type MutableRefObject, type PointerEvent as ReactPointerEvent } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useLangStore } from '../../i18n';

// ── microlensing geometry (Paczynski point-lens) ──
const U0 = 0.32; // impact parameter (Einstein radii) — closest source–lens approach
const TRAJ = 2.4; // half-length of lens trajectory (Einstein radii)
const PERIOD = 10; // animation seconds
const SCENE = 1.9; // scene units per Einstein radius

const ANOM_T = 0.585; // anomaly phase — just after the smooth peak
const ANOM_W = 0.01; // anomaly width — brief (hours, in real events)
const ANOM_A = 1.5; // anomaly amplitude

function magnification(phase: number) {
  const s = (phase - 0.5) * 2 * TRAJ; // position along trajectory, in Einstein radii
  const u = Math.sqrt(U0 * U0 + s * s); // source–lens separation
  const base = (u * u + 2) / (u * Math.sqrt(u * u + 4));
  // brief planetary perturbation (anomaly) riding on the smooth point-lens curve
  const anomaly = ANOM_A * Math.exp(-((phase - ANOM_T) ** 2) / (2 * ANOM_W * ANOM_W));
  return base + anomaly;
}

let A_MAX = 1;
for (let i = 0; i <= 400; i += 1) {
  const a = magnification(i / 400);
  if (a > A_MAX) A_MAX = a;
}

// Background source star — distant, brightens as the lens aligns.
function SourceStar({ phase }: { phase: number }) {
  const coreRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    const norm = (magnification(phase) - 1) / (A_MAX - 1); // 0..1
    if (coreRef.current) {
      (coreRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.3 + norm * 5.0;
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + norm * 1.7);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.12 + norm * 0.5;
    }
    if (ringRef.current) {
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, norm - 0.25) * 1.0;
      ringRef.current.scale.setScalar(0.9 + norm * 0.35);
    }
  });
  return (
    <group position={[0, 0, -1.6]}>
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.46, 48, 48]} />
        <meshStandardMaterial
          color="#fff7e0"
          emissive={new THREE.Color('#ffe6a8')}
          emissiveIntensity={1.3}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshBasicMaterial
          color="#ffd98a"
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Einstein ring — flares near closest approach */}
      <mesh ref={ringRef} position={[0, 0, 0.1]}>
        <torusGeometry args={[0.78, 0.05, 16, 80]} />
        <meshBasicMaterial
          color="#ffe08a"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

// Foreground lensing mass — dark, crosses in front of the source.
function Lens({ phase }: { phase: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    const s = (phase - 0.5) * 2 * TRAJ;
    if (ref.current) ref.current.position.set(s * SCENE, U0 * SCENE * 0.55, -0.4);
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.2, 32, 32]} />
      <meshStandardMaterial
        color="#070910"
        roughness={1}
        metalness={0}
        emissive={new THREE.Color('#141826')}
        emissiveIntensity={0.4}
      />
    </mesh>
  );
}

// A planet bound to the lens — its companion produces the brief anomaly, and it
// flares as the source crosses the planetary perturbation.
function Planet({ phase }: { phase: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    const s = (phase - 0.5) * 2 * TRAJ;
    const px = s * SCENE + 0.6;
    const py = U0 * SCENE * 0.55 + 0.52;
    if (ref.current) ref.current.position.set(px, py, -0.38);
    const flare = Math.exp(-((phase - ANOM_T) ** 2) / (2 * (ANOM_W * 1.5) ** 2));
    if (glowRef.current) {
      glowRef.current.position.set(px, py, -0.33);
      glowRef.current.scale.setScalar(0.5 + flare * 1.6);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = flare * 0.8;
    }
  });
  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[0.075, 24, 24]} />
        <meshStandardMaterial color="#1b2030" emissive={new THREE.Color('#2b3650')} emissiveIntensity={0.6} />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.2, 20, 20]} />
        <meshBasicMaterial
          color="#9ed0ff"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

// Applies the drag rotation (driven by DOM pointer handlers on the stage div,
// see the main component) to the scene group, smoothly. Reading a shared ref in
// useFrame keeps the pointer handling outside the WebGL tree so it stays reliable.
function SceneGroup({
  rotRef,
  children,
}: {
  rotRef: MutableRefObject<{ rx: number; ry: number }>;
  children: React.ReactNode;
}) {
  const ref = useRef<THREE.Group>(null!);
  useFrame(() => {
    if (!ref.current) return;
    ref.current.rotation.x += (rotRef.current.rx - ref.current.rotation.x) * 0.2;
    ref.current.rotation.y += (rotRef.current.ry - ref.current.rotation.y) * 0.2;
  });
  return <group ref={ref}>{children}</group>;
}

function useMicroCurve(samples = 240) {
  return useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    let amax = 0;
    for (let i = 0; i <= samples; i++) {
      const phase = i / samples;
      const A = magnification(phase);
      amax = Math.max(amax, A);
      pts.push({ x: phase, y: A });
    }
    return { pts, amax };
  }, [samples]);
}

function LightCurveOverlay({ phase }: { phase: number }) {
  const { pts, amax } = useMicroCurve();
  const w = 100;
  const h = 28;
  const top = h * 0.16;
  const bot = h * 0.84;
  const yFor = (a: number) => bot - ((a - 1) / (amax - 1)) * (bot - top);
  const path = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${(p.x * w).toFixed(2)},${yFor(p.y).toFixed(2)}`)
    .join(' ');
  const cursorX = phase * w;
  const nearPeak = Math.abs(phase - 0.5) < 0.06;
  return (
    <div className="transit3d-curve-wrap">
      <div className="transit3d-curve-labels">
        <span className="transit3d-curve-label-base">
          <span className="transit3d-curve-line transit3d-curve-line--base" /> 기준 밝기
        </span>
        <span className={`transit3d-curve-label-dip${nearPeak ? ' is-active' : ''}`}>
          <span className="transit3d-curve-line transit3d-curve-line--dip" /> 최대 증광 ×{amax.toFixed(1)}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="transit3d-curve-svg" aria-hidden="true">
        <line x1="0" y1={bot} x2={w} y2={bot} stroke="#475569" strokeWidth="0.18" strokeDasharray="1.2 1.2" />
        <path d={path} fill="none" stroke="#e8722a" strokeWidth="0.7" strokeLinejoin="round" />
        <circle cx={ANOM_T * w} cy={yFor(magnification(ANOM_T))} r="1" fill="#9ed0ff" stroke="#dbeafe" strokeWidth="0.3" />
        <line x1={cursorX} y1="0" x2={cursorX} y2={h} stroke="#fbbf24" strokeWidth="0.35" opacity="0.7" />
      </svg>
    </div>
  );
}

export default function Microlens3DScene() {
  const lang = useLangStore((s) => s.lang);
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setPhase((p) => (p + dt / PERIOD) % 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const seconds = phase * PERIOD;

  // Drag-to-rotate: pointer handlers live on the stage <div> (always present,
  // independent of the WebGL tree). They mutate rotRef, which SceneGroup applies.
  const rotRef = useRef({ rx: 0, ry: 0 });
  const dragRef = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null);
  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = { x: e.clientX, y: e.clientY, rx: rotRef.current.rx, ry: rotRef.current.ry };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  };
  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    rotRef.current = {
      ry: dragRef.current.ry + (e.clientX - dragRef.current.x) * 0.006,
      rx: Math.max(-1.2, Math.min(1.2, dragRef.current.rx + (e.clientY - dragRef.current.y) * 0.006)),
    };
  };
  const handlePointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div className="transit3d-wrap">
      <div
        className="transit3d-stage"
        style={{ cursor: 'grab', touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <Canvas
          orthographic
          camera={{ position: [0, 0, 12], zoom: 70, near: 0.1, far: 100 }}
          dpr={[1, 1.75]}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <color attach="background" args={['#02030a']} />
          <Stars radius={80} depth={50} count={2400} factor={1.8} saturation={0} fade speed={0.2} />
          <ambientLight intensity={0.25} />
          <pointLight position={[6, 4, 6]} intensity={2} color="#cbd5f5" />
          <SceneGroup rotRef={rotRef}>
            <SourceStar phase={phase} />
            <Lens phase={phase} />
            <Planet phase={phase} />
          </SceneGroup>
          <EffectComposer enabled multisampling={0}>
            <Bloom intensity={1.5} luminanceThreshold={0.5} />
          </EffectComposer>
        </Canvas>
        <div className="transit3d-overlay" aria-hidden="true">
          <span className="transit3d-tag transit3d-tag-star">
            ★ {lang === 'ko' ? '배경별 (광원)' : 'Source star'}
          </span>
          <span className="transit3d-tag transit3d-tag-planet">
            ● {lang === 'ko' ? '렌즈 천체 (앞을 지남)' : 'Lensing mass'}
          </span>
          <span className="transit3d-tag transit3d-tag-anomaly">
            ◦ {lang === 'ko' ? '행성 (이상신호)' : 'Planet (anomaly)'}
          </span>
        </div>
        <span className="transit3d-disclaimer" aria-label={lang === 'ko' ? '개념 시연 영상' : 'Concept demonstration'}>
          {lang === 'ko' ? '개념 시연 · 실제 관측 영상 아님' : 'Concept demo · Not an observation'}
        </span>
        <span className="transit3d-hint" aria-hidden="true">
          {lang === 'ko' ? '🖱 드래그로 회전' : '🖱 drag to rotate'}
        </span>
      </div>
      <div
        className="transit3d-controls"
        role="group"
        aria-label={lang === 'ko' ? '시뮬레이션 재생 제어' : 'Simulation playback controls'}
      >
        <button
          type="button"
          className="transit3d-play-btn"
          aria-label={playing ? (lang === 'ko' ? '일시정지' : 'Pause') : lang === 'ko' ? '재생' : 'Play'}
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={phase}
          onChange={(e) => {
            setPlaying(false);
            setPhase(parseFloat(e.target.value));
          }}
          className="transit3d-scrubber"
          aria-label={lang === 'ko' ? '렌즈 통과 위상 조절' : 'Lens-crossing phase scrubber'}
        />
        <span className="transit3d-time" aria-live="polite">
          <span className="transit3d-time-current">{seconds.toFixed(1)}</span>
          <span className="transit3d-time-sep">/</span>
          <span className="transit3d-time-total">{PERIOD.toFixed(1)}s</span>
        </span>
      </div>
      <div className="transit3d-curve">
        <LightCurveOverlay phase={phase} />
        <p className="transit3d-caption">
          {lang === 'ko'
            ? '렌즈 천체가 배경별 앞을 지나면 빛이 휘어 모여 배경별이 잠깐 밝아집니다(미시중력렌즈). 렌즈에 행성이 있으면 매끄러운 곡선 위에 짧은 이상신호(아노말리, 파란 점)가 겹칩니다.'
            : 'As a foreground mass crosses in front of the source it brightens (microlensing). If the lens has a planet, a brief anomaly (blue dot) spikes on top of the smooth curve.'}{' '}
          {lang === 'ko' ? '증광률' : 'Magnification'} A = (u²+2) / (u√(u²+4))
          <br />
          <span className="transit3d-caption-note">
            {lang === 'ko'
              ? 'KMTNet은 이 행성 아노말리로 외계행성을 찾습니다 — 세 대륙(CTIO·SAAO·SSO) 관측소가 시간 공백 없이 이어 얻은 다지점 광도곡선으로 분석합니다.'
              : 'KMTNet finds exoplanets from this planetary anomaly, using gap-free multi-site light curves from its three observatories (CTIO·SAAO·SSO).'}
          </span>
        </p>
      </div>
    </div>
  );
}
