import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, RoundedBox, Torus, TorusKnot, Sphere } from '@react-three/drei';
import * as THREE from 'three';

// Map category → Three.js shape + color
function usePatternShape(category, progressPercent, accentColor) {
  return useMemo(() => {
    const color = accentColor || '#a78bfa';
    const emissiveIntensity = 0.05 + (progressPercent / 100) * 0.4;

    const sharedMaterial = {
      color,
      roughness: 0.55,
      metalness: 0.1,
      emissive: color,
      emissiveIntensity,
    };

    const cat = (category || '').toLowerCase();

    if (cat.includes('amigurumi')) {
      return { type: 'amigurumi', material: sharedMaterial };
    }
    if (cat.includes('wearable') || cat.includes('scarf') || cat.includes('hat')) {
      return { type: 'torusknot', material: sharedMaterial };
    }
    if (cat.includes('accessory') || cat.includes('bag')) {
      return { type: 'box', material: sharedMaterial };
    }
    if (cat.includes('blanket')) {
      return { type: 'blanket', material: sharedMaterial };
    }
    if (cat.includes('home')) {
      return { type: 'home', material: sharedMaterial };
    }
    return { type: 'torus', material: sharedMaterial };
  }, [category, progressPercent, accentColor]);
}

function AmigurumiShape({ material }) {
  const ref = useRef();
  useFrame((s) => {
    if (ref.current) {
      ref.current.rotation.y = s.clock.elapsedTime * 0.4;
      ref.current.rotation.x = Math.sin(s.clock.elapsedTime * 0.3) * 0.15;
    }
  });
  return (
    <group ref={ref}>
      <Sphere args={[0.9, 32, 32]}>
        <meshStandardMaterial {...material} />
      </Sphere>
      {/* Ears */}
      {[[-0.55, 1.0, 0], [0.55, 1.0, 0]].map((pos, i) => (
        <Sphere key={i} args={[0.28, 16, 16]} position={pos}>
          <meshStandardMaterial {...material} />
        </Sphere>
      ))}
    </group>
  );
}

function TorusKnotShape({ material }) {
  const ref = useRef();
  useFrame((s) => {
    if (ref.current) {
      ref.current.rotation.x = s.clock.elapsedTime * 0.35;
      ref.current.rotation.y = s.clock.elapsedTime * 0.25;
    }
  });
  return (
    <TorusKnot ref={ref} args={[0.7, 0.25, 128, 16, 2, 3]}>
      <meshStandardMaterial {...material} />
    </TorusKnot>
  );
}

function BoxShape({ material }) {
  const ref = useRef();
  useFrame((s) => {
    if (ref.current) {
      ref.current.rotation.y = s.clock.elapsedTime * 0.4;
      ref.current.rotation.x = Math.sin(s.clock.elapsedTime * 0.3) * 0.2;
    }
  });
  return (
    <RoundedBox ref={ref} args={[1.4, 1.6, 0.5]} radius={0.1} smoothness={4}>
      <meshStandardMaterial {...material} wireframe={false} />
    </RoundedBox>
  );
}

function BlanketShape({ material }) {
  const ref = useRef();
  useFrame((s) => {
    if (ref.current) {
      ref.current.rotation.x = -0.5 + Math.sin(s.clock.elapsedTime * 0.4) * 0.15;
      ref.current.rotation.y = s.clock.elapsedTime * 0.3;
    }
  });
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(2, 2, 20, 20);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      pos.setZ(i, Math.sin(x * 3) * 0.1 + Math.cos(y * 3) * 0.1);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <group ref={ref}>
      <mesh geometry={geo}>
        <meshStandardMaterial {...material} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geo}>
        <meshStandardMaterial {...material} wireframe opacity={0.2} transparent side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function HomeShape({ material }) {
  const ref = useRef();
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.4;
  });
  return (
    <group ref={ref}>
      <Torus args={[0.8, 0.3, 16, 40]}>
        <meshStandardMaterial {...material} />
      </Torus>
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 1, 16]} />
        <meshStandardMaterial {...material} />
      </mesh>
    </group>
  );
}

function DefaultShape({ material }) {
  const ref = useRef();
  useFrame((s) => {
    if (ref.current) {
      ref.current.rotation.x = s.clock.elapsedTime * 0.3;
      ref.current.rotation.y = s.clock.elapsedTime * 0.45;
    }
  });
  return (
    <Torus ref={ref} args={[0.85, 0.35, 16, 48]}>
      <meshStandardMaterial {...material} />
    </Torus>
  );
}

function PatternShape({ category, progressPercent, accentColor }) {
  const { type, material } = usePatternShape(category, progressPercent, accentColor);

  if (type === 'amigurumi') return <AmigurumiShape material={material} />;
  if (type === 'torusknot') return <TorusKnotShape material={material} />;
  if (type === 'box') return <BoxShape material={material} />;
  if (type === 'blanket') return <BlanketShape material={material} />;
  if (type === 'home') return <HomeShape material={material} />;
  return <DefaultShape material={material} />;
}

function Scene({ category, progressPercent, accentColor }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[3, 4, 3]} intensity={1.5} color="#fff8f0" />
      <pointLight position={[-3, -2, 2]} intensity={0.6} color="#d4c8ff" />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={(3 * Math.PI) / 4}
      />
      <PatternShape category={category} progressPercent={progressPercent} accentColor={accentColor} />
    </>
  );
}

export default function PatternOrb({ category, progressPercent = 0, accentColor }) {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 200 }}>
      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Scene category={category} progressPercent={progressPercent} accentColor={accentColor} />
      </Canvas>
    </div>
  );
}
