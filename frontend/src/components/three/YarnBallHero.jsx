// The one 3D moment in the app: a yarn ball wound from real tube strands,
// slowly turning, draggable to spin. Lazy-loaded from Home so three.js never
// touches the initial bundle. Everything else stays SVG/CSS per the Atelier
// design language.
import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float } from '@react-three/drei';
import { useReducedMotion } from 'motion/react';
import * as THREE from 'three';

const CORE = '#E05A3A';
const STRANDS = ['#FF6B5B', '#FF7E66', '#F2604C', '#FF8A70', '#F5A623', '#7B8CDE'];

/** A pole-to-pole spherical winding, tilted to a random great-circle plane. */
function windingCurve(radius, turns, phase, seed) {
  const points = [];
  const quaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(Math.sin(seed * 12.9898) * Math.PI, seed * 7.233, Math.cos(seed * 4.1414) * Math.PI)
  );
  const SAMPLES = 200;
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
    new THREE.Vector3(0.55, -0.8, 0.25),
    new THREE.Vector3(1.05, -1.05, 0.55),
    new THREE.Vector3(1.5, -0.95, 0.2),
    new THREE.Vector3(1.85, -1.2, -0.25),
    new THREE.Vector3(2.3, -1.05, -0.05),
  ]);
}

function YarnBall({ spinning }) {
  const group = useRef();
  const strands = useMemo(
    () =>
      STRANDS.map((color, i) => ({
        color,
        curve: windingCurve(1 + i * 0.014, 4 + (i % 3), i * 2.39996, i + 1),
      })),
    []
  );
  const tail = useMemo(() => tailCurve(), []);

  useFrame((_, delta) => {
    if (spinning && group.current) group.current.rotation.y += delta * 0.25;
  });

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[0.99, 48, 48]} />
        <meshStandardMaterial color={CORE} roughness={0.95} />
      </mesh>
      {strands.map((strand, i) => (
        <mesh key={i}>
          <tubeGeometry args={[strand.curve, 220, 0.048, 8, false]} />
          <meshStandardMaterial color={strand.color} roughness={0.8} />
        </mesh>
      ))}
      <mesh>
        <tubeGeometry args={[tail, 64, 0.045, 8, false]} />
        <meshStandardMaterial color={STRANDS[0]} roughness={0.8} />
      </mesh>
    </group>
  );
}

export default function YarnBallHero({ className = '' }) {
  const reducedMotion = useReducedMotion();

  return (
    <div className={`cursor-grab active:cursor-grabbing ${className}`} aria-label="Interactive 3D yarn ball — drag to spin">
      <Canvas
        camera={{ position: [0, 0.4, 4.4], fov: 42 }}
        dpr={[1, 1.75]}
        frameloop={reducedMotion ? 'demand' : 'always'}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[4, 5, 3]} intensity={1.6} />
        <pointLight position={[-4, -2, -3]} intensity={6} color="#7B8CDE" />
        <pointLight position={[3, -3, 4]} intensity={4} color="#F5A623" />
        <Float enabled={!reducedMotion} speed={1.6} rotationIntensity={0.25} floatIntensity={0.7}>
          <YarnBall spinning={!reducedMotion} />
        </Float>
        <OrbitControls enableZoom={false} enablePan={false} dampingFactor={0.08} />
      </Canvas>
    </div>
  );
}
