// The one 3D moment in the app: a densely wound yarn ball with a fabric
// sheen, slowly turning over a soft contact shadow. Drag to spin (with
// inertia), click/tap to give it a playful spin-and-squash. Lazy-loaded from
// Home so three.js never touches the initial bundle.
import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, ContactShadows } from '@react-three/drei';
import { useReducedMotion } from 'motion/react';
import * as THREE from 'three';

const CORE = '#4F35C2';
// Mostly close violet shades so the winding reads as one skein, with two
// accent plies catching the light.
const STRANDS = [
  '#8B7CF6', '#7A66F0', '#F472B6', '#9D8DFF', '#8474F4', '#4ECBA0',
  '#9182FA', '#8B7CF6', '#7A66F0', '#9D8DFF', '#A99CFF', '#7E6AF2',
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

/** The working yarn: out of the ball, a relaxed sag, then up onto the hook. */
function workingYarnCurve() {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.1, -0.5, 0.42),
    new THREE.Vector3(0.5, -1.1, 0.5),
    new THREE.Vector3(0.95, -0.9, 0.35),
    new THREE.Vector3(1.18, 0.0, 0.25),
    new THREE.Vector3(1.26, 0.3, 0.16),
    new THREE.Vector3(1.12, 0.42, 0.1),
  ]);
}

/** Small J-curve for the hook's head, in the hook's local space. */
function hookHeadCurve() {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.92, 0),
    new THREE.Vector3(0, 1.06, 0),
    new THREE.Vector3(0.05, 1.13, 0),
    new THREE.Vector3(0.11, 1.09, 0),
    new THREE.Vector3(0.09, 1.0, 0),
  ]);
}

/** A bamboo crochet hook, mid-project: chain loops sit on the shaft. */
function CrochetHook() {
  const head = useMemo(() => hookHeadCurve(), []);
  const wood = <meshStandardMaterial color="#D9A86C" roughness={0.55} metalness={0.05} />;
  const LOOP_SHADES = ['#8B7CF6', '#9D8DFF', '#F472B6'];

  return (
    <group position={[1.72, -0.62, 0.2]} rotation={[0, 0, 0.5]}>
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.045, 0.055, 1.8, 16]} />
        {wood}
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <cylinderGeometry args={[0.032, 0.045, 0.22, 16]} />
        {wood}
      </mesh>
      <mesh>
        <tubeGeometry args={[head, 32, 0.03, 8, false]} />
        {wood}
      </mesh>
      {/* Working chain stitches threaded on the shaft */}
      {LOOP_SHADES.map((color, i) => (
        <mesh key={i} position={[0, 0.66 - i * 0.16, 0]} rotation={[Math.PI / 2, 0, i * 0.5]}>
          <torusGeometry args={[0.075, 0.03, 8, 24]} />
          {yarnMaterial(color)}
        </mesh>
      ))}
    </group>
  );
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
    </group>
  );
}

/** Yarn feeding from the ball onto the hook — stays put while the ball spins,
 *  exactly like a real ball paying out thread. */
function WorkingYarn() {
  const curve = useMemo(() => workingYarnCurve(), []);
  return (
    <mesh>
      <tubeGeometry args={[curve, 80, 0.038, 8, false]} />
      {yarnMaterial(STRANDS[0])}
    </mesh>
  );
}

export default function YarnBallHero({ className = '' }) {
  const reducedMotion = useReducedMotion();
  const [grabbing, setGrabbing] = useState(false);

  return (
    <div
      className={`${grabbing ? 'cursor-grabbing' : 'cursor-grab'} ${className}`}
      onPointerDown={() => setGrabbing(true)}
      onPointerUp={() => setGrabbing(false)}
      onPointerLeave={() => setGrabbing(false)}
      aria-label="Interactive 3D yarn ball — drag to spin, click to poke"
      title="Drag to spin · click to poke"
    >
      <Canvas
        camera={{ position: [0.4, 0.35, 4.7], fov: 42 }}
        dpr={[1, 1.75]}
        frameloop={reducedMotion ? 'demand' : 'always'}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[4, 5, 3]} intensity={1.7} />
        <pointLight position={[-4, -2, -3]} intensity={6} color="#F472B6" />
        <pointLight position={[3, -3, 4]} intensity={2} color="#4ECBA0" />
        <Float enabled={!reducedMotion} speed={1.6} rotationIntensity={0.15} floatIntensity={0.45}>
          <group position={[-0.55, 0.1, 0]} scale={0.92}>
            <YarnBall spinning={!reducedMotion} />
          </group>
          <WorkingYarn />
          <CrochetHook />
        </Float>
        <ContactShadows position={[0, -1.65, 0]} opacity={0.35} scale={6} blur={2.6} far={2.4} color="#1A1030" />
        <OrbitControls enableZoom={false} enablePan={false} enableDamping dampingFactor={0.06} rotateSpeed={0.9} />
      </Canvas>
    </div>
  );
}
