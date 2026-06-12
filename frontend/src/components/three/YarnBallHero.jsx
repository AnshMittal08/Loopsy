// The one 3D moment in the app: a densely wound yarn ball with two crochet
// hooks stuck through its center — the classic craft-basket still life —
// over a soft contact shadow. Drag to spin (with inertia), click/tap to give
// it a playful spin-and-squash. Lazy-loaded from Home so three.js never
// touches the initial bundle.
import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, ContactShadows } from '@react-three/drei';
import { useReducedMotion } from 'motion/react';
import * as THREE from 'three';

const CORE = '#4F35C2';
// Mostly close violet shades so the winding reads as one skein, with two
// accent plies tucked under the surface catching the light.
const STRANDS = [
  '#8B7CF6', '#7A66F0', '#9D8DFF', '#8474F4', '#A99CFF', '#7E6AF2',
  '#9182FA', '#8B7CF6', '#7A66F0', '#9D8DFF', '#8474F4', '#A99CFF',
];

/** A pole-to-pole spherical winding, tilted to a pseudo-random plane. */
function windingCurve(radius, turns, phase, seed) {
  const points = [];
  const quaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(Math.sin(seed * 12.9898) * Math.PI, seed * 7.233, Math.cos(seed * 4.1414) * Math.PI)
  );
  const SAMPLES = 260;
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const phi = t * Math.PI;
    const theta = phase + turns * 2 * Math.PI * t;
    points.push(
      new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      ).applyQuaternion(quaternion)
    );
  }
  return new THREE.CatmullRomCurve3(points);
}

/** The loose tail of yarn trailing off the ball. */
function tailCurve() {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.5, -0.85, 0.3),
    new THREE.Vector3(0.95, -1.15, 0.55),
    new THREE.Vector3(1.45, -1.0, 0.25),
    new THREE.Vector3(1.8, -1.25, -0.15),
    new THREE.Vector3(2.2, -1.1, 0.0),
  ]);
}

// Soft fabric sheen makes the strands read as spun fiber, not plastic.
function yarnMaterial(color) {
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={0.78}
      sheen={1}
      sheenColor="#E5DDFF"
      sheenRoughness={0.45}
    />
  );
}

/** Small J-curve for a hook's head, in the hook's local space. */
function hookHeadCurve() {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.72, 0),
    new THREE.Vector3(0, 1.94, 0),
    new THREE.Vector3(0.09, 2.04, 0),
    new THREE.Vector3(0.18, 1.97, 0),
    new THREE.Vector3(0.15, 1.83, 0),
  ]);
}

/** A crochet hook skewered through the ball's center, head out the top. */
function ThroughHook({ rotation, color }) {
  const head = useMemo(() => hookHeadCurve(), []);
  const material = <meshStandardMaterial color={color} roughness={0.5} metalness={0.08} />;
  return (
    <group rotation={rotation}>
      <mesh>
        <cylinderGeometry args={[0.085, 0.095, 3.2, 16]} />
        {material}
      </mesh>
      <mesh position={[0, 1.62, 0]}>
        <cylinderGeometry args={[0.055, 0.085, 0.3, 16]} />
        {material}
      </mesh>
      <mesh>
        <tubeGeometry args={[head, 32, 0.052, 8, false]} />
        {material}
      </mesh>
      <mesh position={[0, -1.6, 0]}>
        <sphereGeometry args={[0.11, 16, 16]} />
        {material}
      </mesh>
    </group>
  );
}

function YarnBall({ spinning }) {
  const group = useRef();
  const spinVel = useRef(0.22);
  const squash = useRef(1);

  const strands = useMemo(
    () =>
      STRANDS.map((color, i) => ({
        color,
        // Varied turn counts + radii so the winding looks hand-wound, not
        // procedural; later strands sit slightly proud of earlier ones.
        curve: windingCurve(0.985 + i * 0.0085, 6 + ((i * 5) % 7), i * 2.39996, i + 1),
        radius: 0.038 + ((i * 7) % 3) * 0.004,
      })),
    []
  );
  const tail = useMemo(() => tailCurve(), []);

  useFrame((_, delta) => {
    if (!group.current) return;
    if (spinning) {
      group.current.rotation.y += delta * spinVel.current;
      // Click impulses decay back to the idle drift speed.
      spinVel.current = THREE.MathUtils.lerp(spinVel.current, 0.22, delta * 1.2);
    }
    // Squash-and-stretch spring back to rest after a poke.
    squash.current = THREE.MathUtils.lerp(squash.current, 1, delta * 6);
    const s = squash.current;
    group.current.scale.set(2 - s, s, 2 - s);
  });

  const poke = (e) => {
    e.stopPropagation();
    spinVel.current += 3.2;
    squash.current = 0.86;
  };

  return (
    <group ref={group} onClick={poke}>
      <mesh>
        <sphereGeometry args={[0.98, 48, 48]} />
        {yarnMaterial(CORE)}
      </mesh>
      {strands.map((strand, i) => (
        <mesh key={i}>
          <tubeGeometry args={[strand.curve, 260, strand.radius, 8, false]} />
          {yarnMaterial(strand.color)}
        </mesh>
      ))}
      <mesh>
        <tubeGeometry args={[tail, 64, 0.04, 8, false]} />
        {yarnMaterial(STRANDS[0])}
      </mesh>
      {/* Crossed hooks through the ball's center — heads emerging up top */}
      <ThroughHook rotation={[0.12, 0.45, -0.34]} color="#D9A86C" />
      <ThroughHook rotation={[-0.1, -0.55, 0.24]} color="#F472B6" />
    </group>
  );
}

export default function YarnBallHero({ className = '' }) {
  const reducedMotion = useReducedMotion();
  const [grabbing, setGrabbing] = useState(false);

  return (
    <div
      className={`relative ${grabbing ? 'cursor-grabbing' : 'cursor-grab'} ${className}`}
      onPointerDown={() => setGrabbing(true)}
      onPointerUp={() => setGrabbing(false)}
      onPointerLeave={() => setGrabbing(false)}
      aria-label="Interactive 3D yarn ball with crochet hooks — drag to spin, click to poke"
      title="Drag to spin · click to poke"
    >
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-yarn-periwinkle/20 blur-3xl" />
      <Canvas
        camera={{ position: [0, 0.35, 4.55], fov: 42 }}
        dpr={[1, 1.75]}
        frameloop={reducedMotion ? 'demand' : 'always'}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[4, 5, 3]} intensity={1.7} />
        <pointLight position={[-4, -2, -3]} intensity={6} color="#F472B6" />
        <pointLight position={[3, -3, 4]} intensity={2} color="#4ECBA0" />
        <Float enabled={!reducedMotion} speed={1.6} rotationIntensity={0.15} floatIntensity={0.45}>
          <YarnBall spinning={!reducedMotion} />
        </Float>
        <ContactShadows position={[0, -1.7, 0]} opacity={0.4} scale={6} blur={2.4} far={2.4} color="#1A1030" />
        <OrbitControls enableZoom={false} enablePan={false} enableDamping dampingFactor={0.06} rotateSpeed={0.9} />
      </Canvas>
    </div>
  );
}
