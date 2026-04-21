import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Torus, Float } from '@react-three/drei';
import * as THREE from 'three';

// Floating yarn ball with slow bobbing
function YarnBall({ position, color, scale = 1, speed, phase }) {
  const ref = useRef();

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.x = state.clock.elapsedTime * speed * 0.5;
    ref.current.rotation.y = state.clock.elapsedTime * speed;
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5 + phase) * 0.3;
  });

  return (
    <group ref={ref} position={position} scale={scale}>
      <Sphere args={[0.6, 32, 32]}>
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.0} />
      </Sphere>
      {/* Yarn wrapping lines */}
      <Torus args={[0.6, 0.06, 8, 32]} rotation={[0, 0, Math.PI / 4]}>
        <meshStandardMaterial color={color} roughness={0.6} />
      </Torus>
      <Torus args={[0.6, 0.06, 8, 32]} rotation={[Math.PI / 2, 0, Math.PI / 4]}>
        <meshStandardMaterial color={color} roughness={0.6} />
      </Torus>
    </group>
  );
}

// Crochet hook shape
function CrochetHook({ position, color }) {
  const ref = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.z = state.clock.elapsedTime * 0.3;
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.4) * 0.2;
  });

  return (
    <group ref={ref} position={position}>
      {/* Handle */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 1.8, 16]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Neck */}
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.04, 0.07, 0.4, 16]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Hook tip */}
      <mesh position={[0.1, 1.3, 0]} rotation={[0, 0, -0.8]}>
        <torusGeometry args={[0.12, 0.04, 8, 16, Math.PI * 1.2]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.5} />
      </mesh>
    </group>
  );
}

// Pre-computed sparkle positions (module-level, outside React)
const SPARKLE_POSITIONS = (() => {
  const pts = [];
  for (let i = 0; i < 60; i++) {
    pts.push(
      (Math.random() - 0.5) * 14,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 6
    );
  }
  return new Float32Array(pts);
})();

function Sparkles() {
  const points = SPARKLE_POSITIONS;

  const ref = useRef();
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.04;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#c7b7ff" transparent opacity={0.7} sizeAttenuation />
    </points>
  );
}

const YARN_BALLS = [
  { position: [-5, 1, -2], color: '#e8b4d8', scale: 1.1, speed: 0.55, phase: 0.0 },
  { position: [4.5, -0.5, -1.5], color: '#b4d4e8', scale: 0.9, speed: 0.42, phase: 1.2 },
  { position: [-3, -2, -3], color: '#ffd4a8', scale: 0.8, speed: 0.68, phase: 2.4 },
  { position: [2, 2.5, -2.5], color: '#c8f0d8', scale: 1.0, speed: 0.50, phase: 3.7 },
  { position: [6, 1.5, -3], color: '#f0c8e8', scale: 0.7, speed: 0.35, phase: 5.1 },
  { position: [-6, -1.5, -2], color: '#d4c8ff', scale: 0.85, speed: 0.61, phase: 0.9 },
];

const HOOKS = [
  { position: [0, -0.5, -2], color: '#d4a870' },
  { position: [-2, 1.5, -3], color: '#b0a890' },
];

function Scene() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 3]} intensity={1.2} color="#fff8f0" />
      <pointLight position={[-5, -3, 2]} intensity={0.5} color="#e8d4ff" />
      <fog attach="fog" args={['#fffdf7', 8, 20]} />
      <Sparkles />
      {YARN_BALLS.map((ball, i) => (
        <Float key={i} speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
          <YarnBall {...ball} />
        </Float>
      ))}
      {HOOKS.map((hook, i) => (
        <CrochetHook key={i} {...hook} />
      ))}
    </>
  );
}

export default function HeroScene() {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
