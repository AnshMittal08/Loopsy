import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Bounds } from '@react-three/drei';
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

  // Extruded flat motifs (star, heart) — a THREE.Shape swept to yarn thickness.
  const extruded = useMemo(() => {
    if (part.shape !== 'star' && part.shape !== 'heart') return null;
    const dd = part.dims || {};
    const shape = new THREE.Shape();
    if (part.shape === 'star') {
      const R = (dd.sizeCm || 8) / 2, r = R * 0.45;
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const rad = i % 2 === 0 ? R : r;
        const px = rad * Math.cos(a), py = -rad * Math.sin(a);
        if (i === 0) shape.moveTo(px, py); else shape.lineTo(px, py);
      }
      shape.closePath();
    } else {
      const w = dd.widthCm || 7, h = w * 0.95;
      shape.moveTo(0, -h / 2);
      shape.bezierCurveTo(-w * 0.55, h * 0.05, -w * 0.5, h * 0.55, 0, h * 0.3);
      shape.bezierCurveTo(w * 0.5, h * 0.55, w * 0.55, h * 0.05, 0, -h / 2);
      shape.closePath();
    }
    return new THREE.ExtrudeGeometry(shape, { depth: 0.7, bevelEnabled: false });
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
    case 'taperedTube':
      geo = <cylinderGeometry args={[(d.topDiameterCm || 2) / 2, (d.bottomDiameterCm || 4) / 2, d.heightCm || 6, 24]} />; break;
    case 'flatCircle':
      geo = <cylinderGeometry args={[(d.diameterCm || 8) / 2, (d.diameterCm || 8) / 2, 0.6, 32]} />; break;
    case 'flatHexagon':
      geo = <cylinderGeometry args={[(d.diameterCm || 10) / 2, (d.diameterCm || 10) / 2, 0.6, 6]} />; break;
    case 'triangle':
      geo = <cylinderGeometry args={[(d.baseCm || 8) / 2, (d.baseCm || 8) / 2, 0.6, 3]} />; break;
    case 'star':
    case 'heart':
      return extruded ? (
        <mesh position={p} geometry={extruded} castShadow>{yarnMat(color)}</mesh>
      ) : null;
    case 'splitLimbBody': {
      const bw = (d.bodyDiameterCm || 8) / 2, bh = (d.bodyHeightCm || 7) / 2;
      const lr = (d.limbDiameterCm || 3) / 2, lh = d.limbHeightCm || 5;
      const off = Math.max(lr, bw - lr);
      return (
        <group position={p}>
          <mesh scale={[bw, bh, bw]} castShadow>
            <sphereGeometry args={[1, 32, 32]} />{yarnMat(color)}
            {part.face && <Eyes d={Math.max(d.bodyDiameterCm || 8, d.bodyHeightCm || 7)} />}
          </mesh>
          {[-off, off].map((ox) => (
            <mesh key={ox} position={[ox, -(bh + lh / 2 - lr), 0]} castShadow>
              <cylinderGeometry args={[lr, lr, lh, 20]} />{yarnMat(color)}
            </mesh>
          ))}
        </group>
      );
    }
    default:
      geo = <sphereGeometry args={[2, 16, 16]} />;
  }

  // Thin motifs are modelled as short cylinders along Y; stand them up to face
  // the camera so a coaster doesn't read as a lying coin.
  const upright = ['flatCircle', 'flatHexagon', 'triangle'].includes(part.shape)
    ? [Math.PI / 2, 0, 0]
    : [0, 0, 0];

  return (
    <mesh position={p} rotation={upright} castShadow>
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
      <Bounds fit clip observe margin={1.25}>
        <group>
          {parts.map((part) => <PartMesh key={part.id} part={part} />)}
        </group>
      </Bounds>
      <ContactShadows position={[0, -16, 0]} opacity={0.3} scale={60} blur={2.4} far={26} color="#1A1030" />
      <OrbitControls makeDefault enablePan={false} enableZoom enableDamping dampingFactor={0.08} />
    </Canvas>
  );
}
