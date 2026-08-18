import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

// 3D Telegram Paper Plane
const Telegram3DMesh = ({ position, rotation }) => {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.35;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 1.5) * 0.15;
      meshRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 1.2) * 0.1;
    }
  });

  const planeGeo = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      // Left main wing
      0, 0, 1.3,     -1.1, 0.25, -0.8,   0, -0.28, -0.6,
      // Right main wing
      0, 0, 1.3,      0, -0.28, -0.6,     1.1, 0.25, -0.8,
      // Left top fold
      0, 0, 1.3,     -1.1, 0.25, -0.8,   -0.18, 0.35, -0.7,
      // Right top fold
      0, 0, 1.3,      0.18, 0.35, -0.7,   1.1, 0.25, -0.8,
      // Center spine
      0, 0, 1.3,     -0.18, 0.35, -0.7,   0.18, 0.35, -0.7,
      // Left tail
      0, -0.28, -0.6, -1.1, 0.25, -0.8,   -0.18, 0.35, -0.7,
      // Right tail
      0, -0.28, -0.6,  0.18, 0.35, -0.7,   1.1, 0.25, -0.8,
    ]);
    geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geom.computeVertexNormals();
    return geom;
  }, []);

  return (
    <Float speed={2.5} rotationIntensity={0.9} floatIntensity={1.4}>
      <group position={position} rotation={rotation} ref={meshRef}>
        <mesh geometry={planeGeo}>
          <meshStandardMaterial
            color="#ff5722"
            roughness={0.15}
            metalness={0.4}
            emissive="#f4511e"
            emissiveIntensity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Glow orb trailing the plane */}
        <mesh position={[0, -0.1, -0.8]}>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshBasicMaterial color="#ffcc80" transparent opacity={0.7} />
        </mesh>
      </group>
    </Float>
  );
};

// 3D Discord Game Controller / Bot
const Discord3DMesh = ({ position, rotation }) => {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y -= delta * 0.25;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 1.3) * 0.12;
      meshRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 1.0) * 0.08;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.8} floatIntensity={1.2}>
      <group position={position} rotation={rotation} ref={meshRef}>
        {/* Main Controller Body */}
        <RoundedBox args={[1.7, 1.1, 0.48]} radius={0.22} smoothness={4}>
          <meshStandardMaterial
            color="#ff5722"
            roughness={0.2}
            metalness={0.4}
            emissive="#d84315"
            emissiveIntensity={0.2}
          />
        </RoundedBox>

        {/* Left Grip Wing */}
        <mesh position={[-0.75, -0.4, 0]} rotation={[0, 0, Math.PI / 4]}>
          <cylinderGeometry args={[0.22, 0.28, 0.65, 16]} />
          <meshStandardMaterial color="#e64a19" roughness={0.3} metalness={0.3} />
        </mesh>

        {/* Right Grip Wing */}
        <mesh position={[0.75, -0.4, 0]} rotation={[0, 0, -Math.PI / 4]}>
          <cylinderGeometry args={[0.22, 0.28, 0.65, 16]} />
          <meshStandardMaterial color="#e64a19" roughness={0.3} metalness={0.3} />
        </mesh>

        {/* Left D-pad (White Cross) */}
        <mesh position={[-0.45, 0.05, 0.26]}>
          <boxGeometry args={[0.32, 0.1, 0.08]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} />
        </mesh>
        <mesh position={[-0.45, 0.05, 0.26]}>
          <boxGeometry args={[0.1, 0.32, 0.08]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} />
        </mesh>

        {/* Right Face Buttons */}
        <mesh position={[0.45, 0.16, 0.26]}>
          <cylinderGeometry args={[0.065, 0.065, 0.08, 12]} rotation={[Math.PI / 2, 0, 0]} />
          <meshStandardMaterial color="#ffcc80" roughness={0.2} emissive="#ff9800" emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[0.45, -0.06, 0.26]}>
          <cylinderGeometry args={[0.065, 0.065, 0.08, 12]} rotation={[Math.PI / 2, 0, 0]} />
          <meshStandardMaterial color="#ffcc80" roughness={0.2} emissive="#ff9800" emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[0.34, 0.05, 0.26]}>
          <cylinderGeometry args={[0.065, 0.065, 0.08, 12]} rotation={[Math.PI / 2, 0, 0]} />
          <meshStandardMaterial color="#ffcc80" roughness={0.2} emissive="#ff9800" emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[0.56, 0.05, 0.26]}>
          <cylinderGeometry args={[0.065, 0.065, 0.08, 12]} rotation={[Math.PI / 2, 0, 0]} />
          <meshStandardMaterial color="#ffcc80" roughness={0.2} emissive="#ff9800" emissiveIntensity={0.4} />
        </mesh>

        {/* Center Screen Visor */}
        <RoundedBox args={[0.42, 0.22, 0.06]} radius={0.06} position={[0, 0.12, 0.26]}>
          <meshStandardMaterial color="#09090b" roughness={0.2} />
        </RoundedBox>
        {/* Discord Glowing Eyes */}
        <mesh position={[-0.09, 0.12, 0.3]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshBasicMaterial color="#ff9800" />
        </mesh>
        <mesh position={[0.09, 0.12, 0.3]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshBasicMaterial color="#ff9800" />
        </mesh>
      </group>
    </Float>
  );
};

// 3D Hardcover Book Mesh
const BookMesh = ({ position, rotation }) => {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.2;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.6) * 0.1;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.7} floatIntensity={1.1}>
      <group position={position} rotation={rotation} ref={meshRef}>
        {/* Book Cover */}
        <RoundedBox args={[1.4, 1.9, 0.32]} radius={0.05} smoothness={4}>
          <meshStandardMaterial
            color="#ff5722"
            roughness={0.2}
            metalness={0.4}
            emissive="#ff5722"
            emissiveIntensity={0.18}
          />
        </RoundedBox>
        {/* Book Pages */}
        <RoundedBox args={[1.28, 1.78, 0.25]} radius={0.02} smoothness={2} position={[0.07, 0, 0]}>
          <meshStandardMaterial color="#fcfcfc" roughness={0.5} />
        </RoundedBox>
        {/* Spine Accent */}
        <mesh position={[-0.67, 0, 0]}>
          <boxGeometry args={[0.08, 1.88, 0.33]} />
          <meshStandardMaterial color="#d84315" roughness={0.3} metalness={0.5} />
        </mesh>
      </group>
    </Float>
  );
};

// 3D Course Media Prism with Orbit Ring
const CoursePrismMesh = ({ position, rotation }) => {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y -= delta * 0.28;
      meshRef.current.rotation.z += delta * 0.12;
    }
  });

  return (
    <Float speed={2.3} rotationIntensity={0.9} floatIntensity={1.3}>
      <group position={position} rotation={rotation} ref={meshRef}>
        <mesh>
          <octahedronGeometry args={[0.85, 0]} />
          <meshStandardMaterial
            color="#f59e0b"
            roughness={0.2}
            metalness={0.6}
            emissive="#d97706"
            emissiveIntensity={0.25}
          />
        </mesh>
        {/* Orbit Ring */}
        <mesh rotation={[Math.PI / 3, 0, 0]}>
          <torusGeometry args={[1.2, 0.035, 16, 64]} />
          <meshStandardMaterial color="#ffedd5" emissive="#f59e0b" emissiveIntensity={0.5} roughness={0.1} />
        </mesh>
      </group>
    </Float>
  );
};

// Scene Root with dynamic cursor parallax
const Scene = () => {
  const groupRef = useRef();

  useFrame((state) => {
    if (groupRef.current) {
      const targetX = (state.pointer.x * 0.35);
      const targetY = (state.pointer.y * 0.25);
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, 0.05);
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, 0.05);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Ambient and Warm Directional Lights */}
      <ambientLight intensity={0.85} />
      <directionalLight position={[5, 8, 5]} intensity={1.6} color="#fff7ed" />
      <pointLight position={[-4, 2, 2]} intensity={1.3} color="#ff5722" />
      <pointLight position={[4, 2, 2]} intensity={1.1} color="#f59e0b" />

      {/* Floating 3D Objects positioned in upper/mid hero perimeter */}
      <BookMesh position={[-3.1, 1.1, -0.2]} rotation={[0.2, 0.4, -0.15]} />
      <Telegram3DMesh position={[3.2, 1.2, -0.3]} rotation={[-0.2, -0.3, 0.3]} />
      <CoursePrismMesh position={[-2.8, -0.8, -0.4]} rotation={[0.4, -0.3, 0.1]} />
      <Discord3DMesh position={[3.0, -0.9, -0.2]} rotation={[-0.15, 0.35, -0.1]} />
    </group>
  );
};

const LandingHero3D = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden h-[780px]">
      <Canvas
        camera={{ position: [0, 0, 6.2], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
      >
        <Scene />
      </Canvas>
    </div>
  );
};

export default LandingHero3D;
