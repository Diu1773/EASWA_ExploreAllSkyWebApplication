import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useLangStore } from '../../i18n';

// ── microlensing geometry (Paczynski point-lens) ──
const TRAJ = 2.4; // half-length of lens trajectory (Einstein radii)
const PERIOD = 10; // animation seconds
const SCENE = 1.9; // scene units per Einstein radius
const U0_MIN = 0.04;
const U0_MAX = 1.2;
// Vertical offset of the lens path per unit u0, in scene units. Small enough that
// the lens visibly crosses in front of (over) the source for typical u0.
const U0_VIS = 0.5;

const ANOM_T = 0.585; // anomaly phase — just after the smooth peak
const ANOM_W = 0.01; // anomaly width — brief (hours, in real events)
const ANOM_A = 1.5; // anomaly amplitude

// ── procedural surface textures (canvas, generated once) ──
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRockyTexture(base: string, light: string): THREE.CanvasTexture {
  const W = 256;
  const H = 128;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  const rng = mulberry32(7);
  for (let i = 0; i < 320; i += 1) {
    const x = rng() * W;
    const y = rng() * H;
    const r = rng() * 5 + 1;
    ctx.fillStyle = rng() > 0.5 ? `rgba(0,0,0,${rng() * 0.4})` : `${light}`;
    ctx.globalAlpha = rng() * 0.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Magnification at a given trajectory phase for impact parameter u0.
function magnification(phase: number, u0: number) {
  const s = (phase - 0.5) * 2 * TRAJ; // position along trajectory, in Einstein radii
  const u = Math.sqrt(u0 * u0 + s * s); // source–lens separation
  const base = (u * u + 2) / (u * Math.sqrt(u * u + 4));
  const anomaly = ANOM_A * Math.exp(-((phase - ANOM_T) ** 2) / (2 * ANOM_W * ANOM_W));
  return base + anomaly;
}

// Smooth Paczyński peak at closest approach (u = u0). This is the true
// microlensing maximum and reflects u0 directly — it deliberately EXCLUDES the
// brief planetary anomaly (otherwise the headline value is dominated by the
// anomaly bump at large u0, e.g. u0=0.9 reading ×2.9 instead of ×1.4).
function maxMagnification(u0: number) {
  return (u0 * u0 + 2) / (u0 * Math.sqrt(u0 * u0 + 4));
}

// Procedural star surface — reused from the transit 3D sun: a real lit surface
// via 3D value-noise that glows through Bloom (no glow-halo spheres, which washed
// out the background stars). uBright gently lifts brightness toward the peak.
const SUN_VERTEX = /* glsl */ `
varying vec3 vLocalPos;
void main() {
  vLocalPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const SUN_FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vLocalPos;
uniform float uBright;
float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 x){
  vec3 p = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(
    mix(mix(hash(p+vec3(0.0,0.0,0.0)),hash(p+vec3(1.0,0.0,0.0)),f.x), mix(hash(p+vec3(0.0,1.0,0.0)),hash(p+vec3(1.0,1.0,0.0)),f.x), f.y),
    mix(mix(hash(p+vec3(0.0,0.0,1.0)),hash(p+vec3(1.0,0.0,1.0)),f.x), mix(hash(p+vec3(0.0,1.0,1.0)),hash(p+vec3(1.0,1.0,1.0)),f.x), f.y),
    f.z);
}
float fbm(vec3 p){ float v=0.0; float a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.07; a*=0.5; } return v; }
void main(){
  vec3 n = normalize(vLocalPos);
  float h = fbm(n*2.2)*0.55 + fbm(n*9.0)*0.35 + noise(n*22.0)*0.1;
  vec3 cDark = vec3(0.45,0.13,0.03);
  vec3 cMid  = vec3(0.97,0.60,0.16);
  vec3 cHot  = vec3(1.0,0.93,0.60);
  vec3 col = mix(cDark, cMid, smoothstep(0.25,0.55,h));
  col = mix(col, cHot, smoothstep(0.62,0.85,h));
  gl_FragColor = vec4(col * uBright, 1.0);
}
`;

// Background source star — a real procedural surface that gently brightens as the
// lens aligns. The Einstein ring only flares right at closest approach.
function SourceStar({ phase, u0, amax }: { phase: number; u0: number; amax: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null!);
  const meshRef = useRef<THREE.Mesh>(null!);
  const uniforms = useMemo(() => ({ uBright: { value: 1 } }), []);
  useFrame((_, dt) => {
    // Clamp to [0,1] so the brief planetary anomaly can't over-brighten the source.
    const norm = Math.min(1, Math.max(0, (magnification(phase, u0) - 1) / (amax - 1)));
    // Eye-safe response: a gentle brightness lift + a small size swell at the peak.
    // No artificial Einstein ring — Bloom alone gives the soft corona.
    if (matRef.current) matRef.current.uniforms.uBright.value = 1.0 + norm * 0.5;
    if (meshRef.current) {
      meshRef.current.rotation.y += dt * 0.03;
      meshRef.current.scale.setScalar(1.0 + norm * 0.18);
    }
  });
  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <sphereGeometry args={[0.55, 96, 96]} />
      <shaderMaterial ref={matRef} vertexShader={SUN_VERTEX} fragmentShader={SUN_FRAGMENT} uniforms={uniforms} toneMapped={false} />
    </mesh>
  );
}

// Foreground lensing mass — dark, crosses in front of the source. Its vertical
// offset is the impact parameter u0 (closest approach to the line of sight).
function Lens({ phase, u0 }: { phase: number; u0: number }) {
  const ref = useRef<THREE.Group>(null!);
  const lensTex = useMemo(() => makeRockyTexture('#0c0e18', 'rgba(90,100,135,1)'), []);
  useFrame(() => {
    const s = (phase - 0.5) * 2 * TRAJ;
    // In front of the source (z > source z=0) so the dark lens visibly crosses
    // over the brightening source. Vertical offset = impact parameter (u0).
    if (ref.current) ref.current.position.set(s * SCENE, u0 * U0_VIS, 1.2);
  });
  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[0.22, 40, 40]} />
        <meshStandardMaterial map={lensTex} color="#2a3350" roughness={1} metalness={0} emissive={new THREE.Color('#0c1020')} emissiveIntensity={0.35} />
      </mesh>
      {/* faint gravitational rim */}
      <mesh>
        <sphereGeometry args={[0.3, 24, 24]} />
        <meshBasicMaterial color="#3b4a73" transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

// A planet bound to the lens — produces the brief anomaly and flares as the
// source crosses the planetary perturbation.
function Planet({ phase, u0 }: { phase: number; u0: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    const s = (phase - 0.5) * 2 * TRAJ;
    const px = s * SCENE + 0.5;
    const py = u0 * U0_VIS + 0.38;
    if (ref.current) ref.current.position.set(px, py, 1.22);
    const flare = Math.exp(-((phase - ANOM_T) ** 2) / (2 * (ANOM_W * 1.5) ** 2));
    if (glowRef.current) {
      glowRef.current.position.set(px, py, 1.26);
      glowRef.current.scale.setScalar(0.5 + flare * 1.6);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = flare * 0.85;
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
        <meshBasicMaterial color="#9ed0ff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

// Drag orbits the viewpoint 360° around the event. Pointer handlers on the stage
// div mutate rotRef (rx = pitch, ry = yaw); this group applies both smoothly, so
// the whole scene — including the far star backdrop inside it — turns with the view.
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
    ref.current.rotation.y += (rotRef.current.ry - ref.current.rotation.y) * 0.18;
    ref.current.rotation.x += (rotRef.current.rx - ref.current.rotation.x) * 0.18;
  });
  return <group ref={ref}>{children}</group>;
}

// Mouse-wheel zoom: dollies the perspective camera toward/away from the event.
function CameraRig({ zoomRef }: { zoomRef: MutableRefObject<number> }) {
  const { camera } = useThree();
  useFrame(() => {
    camera.position.z += (zoomRef.current - camera.position.z) * 0.15;
  });
  return null;
}

// Dense, uniform star backdrop on a large spherical shell. sizeAttenuation:false
// keeps every star a crisp constant-size point at any zoom, so the background
// never goes empty/black when you dolly out (drei <Stars fade> faded most away).
// Lives inside the rotating group, so it sweeps with the viewpoint.
function Starfield() {
  const geom = useMemo(() => {
    const rng = mulberry32(7);
    const N = 4200;
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i += 1) {
      const ct = rng() * 2 - 1; // cos(theta), uniform over the sphere
      const st = Math.sqrt(1 - ct * ct);
      const ph = rng() * Math.PI * 2;
      const r = 55 + rng() * 35; // shell radius 55..90 (well behind the event)
      arr[i * 3] = r * st * Math.cos(ph);
      arr[i * 3 + 1] = r * ct;
      arr[i * 3 + 2] = r * st * Math.sin(ph);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  return (
    <points geometry={geom}>
      <pointsMaterial
        size={1.6}
        sizeAttenuation={false}
        color="#dfe6f7"
        transparent
        opacity={0.9}
        depthWrite={false}
      />
    </points>
  );
}

function useMicroCurve(u0: number, samples = 240) {
  return useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    let amax = 0;
    for (let i = 0; i <= samples; i += 1) {
      const phase = i / samples;
      const A = magnification(phase, u0);
      amax = Math.max(amax, A); // overall max incl. anomaly — used only for y-scaling
      pts.push({ x: phase, y: A });
    }
    // Smooth Paczyński peak (no anomaly) — the headline "최대 증광" reflecting u0.
    const peak = (u0 * u0 + 2) / (u0 * Math.sqrt(u0 * u0 + 4));
    return { pts, amax, peak };
  }, [u0, samples]);
}

function LightCurveOverlay({ phase, u0 }: { phase: number; u0: number }) {
  const { pts, amax, peak } = useMicroCurve(u0);
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
          <span className="transit3d-curve-line transit3d-curve-line--dip" /> 최대 증광 ×{peak.toFixed(1)}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="transit3d-curve-svg" aria-hidden="true">
        <line x1="0" y1={bot} x2={w} y2={bot} stroke="#475569" strokeWidth="0.18" strokeDasharray="1.2 1.2" />
        <path d={path} fill="none" stroke="#e8722a" strokeWidth="0.7" strokeLinejoin="round" />
        <circle cx={ANOM_T * w} cy={yFor(magnification(ANOM_T, u0))} r="1" fill="#9ed0ff" stroke="#dbeafe" strokeWidth="0.3" />
        <line x1={cursorX} y1="0" x2={cursorX} y2={h} stroke="#fbbf24" strokeWidth="0.35" opacity="0.7" />
      </svg>
    </div>
  );
}

export default function Microlens3DScene() {
  const lang = useLangStore((s) => s.lang);
  const ko = lang === 'ko';
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [u0, setU0] = useState(0.32);
  const amax = useMemo(() => maxMagnification(u0), [u0]);

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

  // Drag: horizontal → camera rotation (rotRef.ry), vertical → impact parameter u0.
  const rotRef = useRef({ rx: 0, ry: 0 });
  const dragRef = useRef<{ x: number; y: number; rx: number; ry: number } | null>(null);
  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = { x: e.clientX, y: e.clientY, rx: rotRef.current.rx, ry: rotRef.current.ry };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  };
  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    // Full 360° orbit: horizontal drag = yaw (unlimited), vertical drag = pitch.
    rotRef.current.ry = dragRef.current.ry + (e.clientX - dragRef.current.x) * 0.006;
    rotRef.current.rx = Math.max(-1.45, Math.min(1.45, dragRef.current.rx + (e.clientY - dragRef.current.y) * 0.006));
  };
  const handlePointerUp = () => {
    dragRef.current = null;
  };
  const stageRef = useRef<HTMLDivElement>(null!);
  const zoomRef = useRef(12);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomRef.current = Math.max(6, Math.min(26, zoomRef.current + e.deltaY * 0.012));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  const handleReset = () => {
    rotRef.current.rx = 0;
    rotRef.current.ry = 0;
    zoomRef.current = 12;
    setU0(0.32);
    setPhase(0);
  };

  return (
    <div className="transit3d-wrap">
      <div
        ref={stageRef}
        className="transit3d-stage"
        style={{ cursor: 'grab', touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <Canvas
          camera={{ position: [0, 0, 12], fov: 45, near: 0.1, far: 200 }}
          dpr={[1, 1.75]}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <color attach="background" args={['#02030a']} />
          <CameraRig zoomRef={zoomRef} />
          <ambientLight intensity={0.3} />
          <pointLight position={[6, 4, 6]} intensity={2} color="#cbd5f5" />
          <SceneGroup rotRef={rotRef}>
            {/* Dense star backdrop, well behind the event; turns with the viewpoint. */}
            <Starfield />
            <SourceStar phase={phase} u0={u0} amax={amax} />
            <Lens phase={phase} u0={u0} />
            <Planet phase={phase} u0={u0} />
          </SceneGroup>
          <EffectComposer enabled multisampling={0}>
            <Bloom intensity={1.0} luminanceThreshold={0.55} mipmapBlur />
          </EffectComposer>
        </Canvas>
        <div className="transit3d-overlay" aria-hidden="true">
          <span className="transit3d-tag transit3d-tag-star">★ {ko ? '배경별 (광원)' : 'Source star'}</span>
          <span className="transit3d-tag transit3d-tag-planet">● {ko ? '렌즈 천체 (앞을 지남)' : 'Lensing mass'}</span>
          <span className="transit3d-tag transit3d-tag-anomaly">◦ {ko ? '행성 (이상신호)' : 'Planet (anomaly)'}</span>
        </div>
        <span className="transit3d-disclaimer" aria-label={ko ? '개념 시연 영상' : 'Concept demonstration'}>
          {ko ? '개념 시연 · 실제 관측 영상 아님' : 'Concept demo · Not an observation'}
        </span>
        <span className="transit3d-hint" aria-hidden="true">
          {ko ? '🖱 드래그: 360° 회전 · 휠: 줌 · u₀ 슬라이더: 정렬' : '🖱 drag: orbit 360° · wheel: zoom · u₀ slider: alignment'}
        </span>
      </div>
      <div
        className="transit3d-controls"
        role="group"
        aria-label={ko ? '시뮬레이션 제어' : 'Simulation controls'}
      >
        <button
          type="button"
          className="transit3d-play-btn"
          aria-label={playing ? (ko ? '일시정지' : 'Pause') : ko ? '재생' : 'Play'}
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <button
          type="button"
          className="transit3d-play-btn"
          aria-label={ko ? '화면 초기화' : 'Reset view'}
          title={ko ? '화면 초기화' : 'Reset view'}
          onClick={handleReset}
        >
          ↺
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
          aria-label={ko ? '렌즈 통과 위상' : 'Lens-crossing phase'}
        />
        <span className="transit3d-time" aria-live="polite">
          <span className="transit3d-time-current">{seconds.toFixed(1)}</span>
          <span className="transit3d-time-sep">/</span>
          <span className="transit3d-time-total">{PERIOD.toFixed(1)}s</span>
        </span>
      </div>
      <div className="transit3d-param" role="group" aria-label={ko ? '충격변수 조절' : 'Impact parameter'}>
        <span className="transit3d-param-label">u₀</span>
        <input
          type="range"
          min={U0_MIN}
          max={U0_MAX}
          step={0.01}
          value={u0}
          onChange={(e) => setU0(parseFloat(e.target.value))}
          className="transit3d-scrubber"
          aria-label={ko ? '충격변수 u0' : 'Impact parameter u0'}
        />
        <span className="transit3d-param-readout">
          u₀={u0.toFixed(2)} · {ko ? '최대증광' : 'peak'} ×{amax.toFixed(1)}
        </span>
      </div>
      <div className="transit3d-curve">
        <LightCurveOverlay phase={phase} u0={u0} />
        <p className="transit3d-caption">
          {ko
            ? '렌즈 천체가 배경별 앞을 지나면 빛이 휘어 모여 배경별이 잠깐 밝아집니다(미시중력렌즈). 정렬이 가까울수록(u₀ 작을수록) 더 밝아집니다. 렌즈에 행성이 있으면 매끄러운 곡선 위에 짧은 이상신호(파란 점)가 겹칩니다.'
            : 'As a foreground mass crosses in front of the source it brightens (microlensing); the closer the alignment (smaller u₀), the higher the peak. If the lens has a planet, a brief anomaly (blue dot) spikes on the smooth curve.'}{' '}
          {ko ? '증광률' : 'Magnification'} A = (u²+2) / (u√(u²+4))
          <br />
          <span className="transit3d-caption-note">
            {ko
              ? 'u₀ 슬라이더를 움직이면 정렬이 바뀌어 광도곡선이 실시간으로 변하고, 드래그로 시야를 360° 돌려볼 수 있습니다. KMTNet은 행성 아노말리로 외계행성을 찾습니다.'
              : 'Move the u₀ slider to change the alignment and watch the light curve respond live; drag to orbit the view 360°. KMTNet finds exoplanets from the planetary anomaly.'}
          </span>
        </p>
      </div>
    </div>
  );
}
