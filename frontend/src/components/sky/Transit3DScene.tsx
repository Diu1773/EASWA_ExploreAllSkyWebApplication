import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useLangStore } from '../../i18n';

const STAR_R = 1.4;
const PLANET_R = 0.32;
const ORBIT_R = 3.4;
const PERIOD = 9;

// ─── Procedural Hot Jupiter texture (no asset, generated once) ────
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeHotJupiterTexture(): THREE.CanvasTexture {
  const W = 1024;
  const H = 512;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  // base latitudinal gradient — hot Jupiter palette (deep red poles, warm equator)
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0.0, '#2a0a08');
  g.addColorStop(0.18, '#7a2810');
  g.addColorStop(0.42, '#d96a24');
  g.addColorStop(0.52, '#f4a04a');
  g.addColorStop(0.62, '#d4521a');
  g.addColorStop(0.82, '#6b1c0c');
  g.addColorStop(1.0, '#220706');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const rng = mulberry32(7);

  // horizontal bands with slight wave distortion
  for (let i = 0; i < 55; i++) {
    const y = rng() * H;
    const h = 3 + rng() * 22;
    const warm = rng() > 0.45;
    const a = 0.12 + rng() * 0.28;
    ctx.fillStyle = warm
      ? `rgba(255, ${180 + Math.floor(rng() * 60)}, ${80 + Math.floor(rng() * 80)}, ${a})`
      : `rgba(${40 + Math.floor(rng() * 60)}, 18, 10, ${a})`;
    // wavy band via vertical slices
    const slices = 32;
    for (let s = 0; s < slices; s++) {
      const x = (s / slices) * W;
      const yo = y + Math.sin(s * 0.6 + i) * 1.5;
      ctx.fillRect(x, yo, W / slices + 1, h);
    }
  }

  // swirling storm spots (Great Red Spot–style)
  for (let i = 0; i < 14; i++) {
    const x = rng() * W;
    const y = H * (0.25 + rng() * 0.5);
    const rx = 18 + rng() * 70;
    const ry = 10 + rng() * 22;
    const rot = rng() * Math.PI;
    const warm = rng() > 0.4;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
    if (warm) {
      grad.addColorStop(0, 'rgba(255, 210, 140, 0.55)');
      grad.addColorStop(0.6, 'rgba(220, 110, 50, 0.25)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
      grad.addColorStop(0, 'rgba(150, 50, 20, 0.5)');
      grad.addColorStop(0.7, 'rgba(80, 20, 8, 0.25)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // soft turbulence overlay
  for (let i = 0; i < 1800; i++) {
    const x = rng() * W;
    const y = rng() * H;
    const r = rng() * 1.8;
    ctx.fillStyle = `rgba(255, 200, 140, ${rng() * 0.06})`;
    ctx.fillRect(x, y, r, r);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

// ─── Procedural sun surface via 3D value noise — no UV seams, no pole pinching ────
const sunVertex = /* glsl */ `
varying vec3 vLocalPos;
void main() {
  vLocalPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const sunFragment = /* glsl */ `
precision highp float;
varying vec3 vLocalPos;

// 3D hash + value noise (iq-style)
float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 x) {
  vec3 p = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(p + vec3(0.0,0.0,0.0)), hash(p + vec3(1.0,0.0,0.0)), f.x),
        mix(hash(p + vec3(0.0,1.0,0.0)), hash(p + vec3(1.0,1.0,0.0)), f.x), f.y),
    mix(mix(hash(p + vec3(0.0,0.0,1.0)), hash(p + vec3(1.0,0.0,1.0)), f.x),
        mix(hash(p + vec3(0.0,1.0,1.0)), hash(p + vec3(1.0,1.0,1.0)), f.x), f.y),
    f.z
  );
}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.07;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 n = normalize(vLocalPos);
  // base granulation scale + subtle larger variation
  float bigCell = fbm(n * 2.2);
  float granule = fbm(n * 9.0);
  float fine = noise(n * 22.0);
  float h = bigCell * 0.55 + granule * 0.35 + fine * 0.1;

  // palette: deep ember → mid orange → bright yellow-white
  vec3 cDark = vec3(0.42, 0.10, 0.02);
  vec3 cMid  = vec3(0.96, 0.58, 0.14);
  vec3 cHot  = vec3(1.0, 0.92, 0.55);

  vec3 col = mix(cDark, cMid, smoothstep(0.25, 0.55, h));
  col = mix(col, cHot, smoothstep(0.62, 0.85, h));

  gl_FragColor = vec4(col, 1.0);
}
`;

function StarMesh({ playing }: { playing: boolean }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((_, delta) => {
    if (!ref.current || !playing) return;
    ref.current.rotation.y += delta * 0.04;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[STAR_R, 128, 128]} />
      <shaderMaterial
        vertexShader={sunVertex}
        fragmentShader={sunFragment}
        toneMapped={false}
      />
    </mesh>
  );
}

function PlanetMesh({ phase, playing }: { phase: number; playing: boolean }) {
  const groupRef = useRef<THREE.Group>(null!);
  const planetRef = useRef<THREE.Mesh>(null!);
  const texture = useMemo(() => makeHotJupiterTexture(), []);

  useFrame((_, delta) => {
    if (!groupRef.current || !planetRef.current) return;
    // phase 0.5 → angle 0 → cos=+1 → planet in front of star (transit at middle)
    const angle = (phase - 0.5) * Math.PI * 2;
    const x = Math.sin(angle) * ORBIT_R;
    const z = Math.cos(angle) * ORBIT_R;
    groupRef.current.position.set(x, 0, z);
    if (playing) planetRef.current.rotation.y += delta * 0.18;
  });

  return (
    <group ref={groupRef}>
      {/* planet body — matte, no halo, no rim */}
      <mesh ref={planetRef}>
        <sphereGeometry args={[PLANET_R, 64, 64]} />
        <meshStandardMaterial
          map={texture}
          roughness={1}
          metalness={0}
          emissive={new THREE.Color('#0a0302')}
          emissiveIntensity={0.15}
        />
      </mesh>
    </group>
  );
}

function useLightCurve(samples = 240) {
  return useMemo(() => {
    const pts: { x: number; y: number }[] = [];
    const depth = (PLANET_R / STAR_R) ** 2;
    for (let i = 0; i <= samples; i++) {
      const phase = i / samples;
      // phase 0.5 → angle 0 → cos=+1 → in front (transit) — same convention as PlanetMesh
      const angle = (phase - 0.5) * Math.PI * 2;
      const px = Math.sin(angle) * ORBIT_R;
      const pz = Math.cos(angle) * ORBIT_R;
      let brightness = 1.0;
      if (pz > 0) {
        const d = Math.abs(px);
        const rInner = Math.max(0, STAR_R - PLANET_R);
        if (d < rInner) {
          brightness = 1.0 - depth;
        } else if (d < STAR_R + PLANET_R) {
          const t = (STAR_R + PLANET_R - d) / (2 * PLANET_R);
          brightness = 1.0 - depth * Math.max(0, Math.min(1, t));
        }
      }
      pts.push({ x: phase, y: brightness });
    }
    return { pts, depth };
  }, [samples]);
}

function LightCurveOverlay({ phase }: { phase: number }) {
  const { pts, depth } = useLightCurve();
  const w = 100;
  const h = 28;
  const top = h * 0.22;
  const bot = h * 0.82;
  const yFor = (b: number) => top + ((1 - b) / depth) * (bot - top);
  const path = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${(p.x * w).toFixed(2)},${yFor(p.y).toFixed(2)}`)
    .join(' ');
  const cursorX = phase * w;
  const inTransit = Math.abs(phase - 0.5) < 0.08;
  return (
    <div className="transit3d-curve-wrap">
      <div className="transit3d-curve-labels">
        <span className="transit3d-curve-label-base">
          <span className="transit3d-curve-line transit3d-curve-line--base" /> 기준 밝기
        </span>
        <span
          className={`transit3d-curve-label-dip${inTransit ? ' is-active' : ''}`}
        >
          <span className="transit3d-curve-line transit3d-curve-line--dip" /> transit 깊이 −{(depth * 100).toFixed(1)}% (세로축 과장)
        </span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="transit3d-curve-svg"
        aria-hidden="true"
      >
        <line
          x1="0" y1={top} x2={w} y2={top}
          stroke="#475569" strokeWidth="0.18" strokeDasharray="1.2 1.2"
        />
        <path d={path} fill="none" stroke="#e8722a" strokeWidth="0.7" strokeLinejoin="round" />
        <line
          x1={cursorX} y1="0" x2={cursorX} y2={h}
          stroke="#fbbf24" strokeWidth="0.35" opacity="0.7"
        />
      </svg>
    </div>
  );
}

export default function Transit3DScene() {
  const lang = useLangStore((s) => s.lang);
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(true);

  // Animation loop — only runs while playing
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

  return (
    <div className="transit3d-wrap">
      <div className="transit3d-stage">
        <Canvas
          orthographic
          camera={{ position: [0, 0, 12], zoom: 60, near: 0.1, far: 100 }}
          dpr={[1, 1.75]}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <color attach="background" args={['#02030a']} />
          <Stars radius={80} depth={50} count={2200} factor={1.8} saturation={0} fade speed={0.25} />
          <ambientLight intensity={0.03} />
          <pointLight position={[0, 0, 0]} intensity={8} color="#fde68a" distance={28} decay={1.5} />
          <StarMesh playing={playing} />
          <PlanetMesh phase={phase} playing={playing} />
          <EffectComposer enabled multisampling={0}>
            <Bloom intensity={1.6} luminanceThreshold={0.55} />
          </EffectComposer>
        </Canvas>
        <div className="transit3d-overlay" aria-hidden="true">
          <span className="transit3d-tag transit3d-tag-star">
            ★ {lang === 'ko' ? '별 (항성)' : 'Star'}
          </span>
          <span className="transit3d-tag transit3d-tag-planet">
            ● {lang === 'ko' ? '행성 (공전 궤도)' : 'Planet (orbit)'}
          </span>
        </div>
        <span
          className="transit3d-disclaimer"
          aria-label={lang === 'ko' ? '개념 시연 영상' : 'Concept demonstration'}
        >
          {lang === 'ko' ? '개념 시연 · 실제 관측 영상 아님' : 'Concept demo · Not an observation'}
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
          aria-label={playing
            ? lang === 'ko' ? '일시정지' : 'Pause'
            : lang === 'ko' ? '재생' : 'Play'}
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
          aria-label={lang === 'ko' ? '공전 위상 조절' : 'Orbital phase scrubber'}
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
          {lang === 'ko' ? '행성이 별 앞을 지나는 동안' : 'While the planet passes in front of the star'}(
          <span className="transit3d-mono">transit</span>)
          {lang === 'ko' ? ' 광도곡선에 미세한 딥이 나타납니다.' : ', a small dip appears in the light curve.'}
          {' '}{lang === 'ko' ? '깊이' : 'Depth'} ∝ (R<sub>p</sub> / R<sub>★</sub>)²
          <br />
          <span className="transit3d-caption-note">
            {lang === 'ko'
              ? '위 영상은 현상 이해를 위한 시연이며, 실제 분석은 MAST 기반 TESS 공개 관측자료로 수행합니다.'
              : 'This animation demonstrates the geometry. The analysis uses public TESS observations provided through MAST.'}
          </span>
        </p>
      </div>
    </div>
  );
}
