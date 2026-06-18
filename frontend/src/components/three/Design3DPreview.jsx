import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Center } from '@react-three/drei';
import * as THREE from 'three';
import { hexOf } from '../../lib/yarnColors';
import { CANVAS } from '../../lib/assembly';

// Live 3D model of a Build-mode design: each part becomes a real mesh, so the
// maker sees (and rotates) the actual object they're crocheting — the sculpt
// profile literally lathes into a 3D form. Lazy-loaded so three.js stays out
// of the initial bundle.

const PX = CANVAS.px;
const yarnMat = (color) => (
  <meshStandardMaterial color={color} roughness={0.85} metalness={0.02} />
);

// Map a part's 2D canvas position to centred 3D space (cm units).
function pos3(part) {
  return [(part.x - CANVAS.w / 2) / PX, -(part.y - CANVAS.h / 2) / PX, 0];
}

function Eyes({ d }) {
  const r = d * 0.06;
  return (
    <group position={[0, d * 0.08, d * 0.42]}>
      <mesh position={[-d * 0.18, 0, 0]}><sphereGeometry args={[r, 12, 12]} /><meshStandardMaterial color="#1A1726" /></mesh>
      <mesh position={[d * 0.18, 0, 0]}><sphereGeometry args={[r, 12, 12]} /><meshStandardMaterial color="#1A1726" /></mesh>
    </group>
  );
}

function PartMesh({ part }) {
  const d = part.dims || {};
  const color = hexOf(part.color);
  const p = pos3(part);

  const lathe = useMemo(() => {
    if (part.shape !== 'revolve') return null;
    const dd = part.dims || {};
    const prof = [...(dd.profile || [])].sort((a, b) => a.t - b.t);
    if (prof.length < 2) return null;
    const H = dd.heightCm || 8;
    const pts = prof.map((q) => new THREE.Vector2(Math.max(0.05, q.r), (q.t - 0.5) * H));
    pts[0] = new THREE.Vector2(0.02, (prof[0].t - 0.5) * H);
    pts[pts.length - 1] = new THREE.Vector2(0.02, (prof[prof.length - 1].t - 0.5) * H);
    return new THREE.LatheGeometry(pts, 48);
  }, [part.shape, part.dims]);

  let geo;
  switch (part.shape) {
    case 'sphere':
      geo = <sphereGeometry args={[(d.diameterCm || 6) / 2, 32, 32]} />; break;
    case 'ellipsoid':
      return (
        <mesh position={p} scale={[(d.diameterCm || 6) / 2, (d.heightCm || 8) / 2, (d.diameterCm || 6) / 2]} castShadow>
          <sphereGeometry args={[1, 32, 32]} />{yarnMat(color)}
          {part.face && <Eyes d={Math.max(d.diameterCm || 6, d.heightCm || 8)} />}
        </mesh>
      );
    case 'tube':
      geo = <cylinderGeometry args={[(d.diameterCm || 3) / 2, (d.diameterCm || 3) / 2, d.heightCm || 6, 24]} />; break;
    case 'cone':
      geo = <coneGeometry args={[(d.baseDiameterCm || 4) / 2, d.heightCm || 5, 24]} />; break;
    case 'hemisphere':
      geo = <sphereGeometry args={[(d.diameterCm || 6) / 2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />; break;
    case 'flatPanel':
      geo = <boxGeometry args={[d.widthCm || 4, d.heightCm || 5, 0.8]} />; break;
    case 'revolve':
      return lathe ? (
        <mesh position={p} geometry={lathe} castShadow>{yarnMat(color)}</mesh>
      ) : null;
    default:
      geo = <sphereGeometry args={[2, 16, 16]} />;
  }

  return (
    <mesh position={p} castShadow>
      {geo}{yarnMat(color)}
      {part.face && <Eyes d={d.diameterCm || 6} />}
    </mesh>
  );
}

export default function Design3DPreview({ parts }) {
  return (
    <Canvas shadows camera={{ position: [0, 4, 34], fov: 42 }} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 18, 12]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-12, -6, -8]} intensity={30} color="#8B7CF6" />
      <Center>
        <group>
          {parts.map((part) => <PartMesh key={part.id} part={part} />)}
        </group>
      </Center>
      <ContactShadows position={[0, -11, 0]} opacity={0.35} scale={50} blur={2.4} far={20} color="#1A1030" />
      <OrbitControls enablePan={false} enableZoom enableDamping dampingFactor={0.08} minDistance={14} maxDistance={60} />
    </Canvas>
  );
}
