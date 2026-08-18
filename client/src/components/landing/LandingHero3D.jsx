import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

// 3D Content Artifact: Floating Book
const BookMesh = ({ position, rotation }) => {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.2;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.8} floatIntensity={1.2}>
      <group position={position} rotation={rotation} ref={meshRef}>
        {/* Book Cover */}
        <RoundedBox args={[1.5, 2.1, 0.35]} radius={0.06} smoothness={4}>
          <meshStandardMaterial
            color="#ff5722"
            roughness={0.25}
            metalness={0.4}
            emissive="#ff5722"
            emissiveIntensity={0.15}
          />
        </RoundedBox>
        {/* Book Pages */}
        <RoundedBox args={[1.35, 1.95, 0.28]} radius={0.02} smoothness={2} position={[0.08, 0, 0]}>
          <meshStandardMaterial color="#fefefe" roughness={0.6} />
        </RoundedBox>
        {/* Spine Accent */}
        <mesh position={[-0.72, 0, 0]}>
          <boxGeometry args={[0.08, 2.08, 0.36]} />
          <meshStandardMaterial color="#d84315" roughness={0.3} metalness={0.5} />
        </mesh>
      </group>
    </Float>
  );
};

// 3D Content Artifact: Floating Course Prism
const CoursePrismMesh = ({ position, rotation }) => {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y -= delta * 0.3;
      meshRef.current.rotation.z += delta * 0.15;
    }
  });

  return (
    <Float speed={2.5} rotationIntensity={1} floatIntensity={1.5}>
      <group position={position} rotation={rotation} ref={meshRef}>
        <mesh>
          <octahedronGeometry args={[0.9, 0]} />
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
          <torusGeometry args={[1.3, 0.04, 16, 64]} />
          <meshStandardMaterial color="#ffedd5" emissive="#f59e0b" emissiveIntensity={0.5} roughness={0.1} />
        </mesh>
      </group>
    </Float>
  );
};

// 3D Content Artifact: Tools & Snippets Cube
const ToolCubeMesh = ({ position, rotation }) => {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.25;
      meshRef.current.rotation.y += delta * 0.25;
    }
  });

  return (
    <Float speed={1.8} rotationIntensity={0.6} floatIntensity={1}>
      <group position={position} rotation={rotation} ref={meshRef}>
        <RoundedBox args={[1.1, 1.1, 1.1]} radius={0.12} smoothness={4}>
          <meshStandardMaterial
            color="#10b981"
            roughness={0.3}
            metalness={0.3}
            emissive="#059669"
            emissiveIntensity={0.2}
          />
        </RoundedBox>
        {/* Wireframe outer shell */}
        <mesh>
          <boxGeometry args={[1.3, 1.3, 1.3]} />
          <meshBasicMaterial color="#6ee7b7" wireframe transparent opacity={0.35} />
        </mesh>
      </group>
    </Float>
  );
};

// 3D Content Artifact: Floating Custom Section Folder / Capsule
const FolderPillMesh = ({ position, rotation }) => {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <Float speed={2.2} rotationIntensity={0.7} floatIntensity={1.3}>
      <group position={position} rotation={rotation} ref={meshRef}>
        <RoundedBox args={[1.6, 1.1, 0.4]} radius={0.1} smoothness={4}>
          <meshStandardMaterial
            color="#f43f5e"
            roughness={0.3}
            metalness={0.4}
            emissive="#e11d48"
            emissiveIntensity={0.2}
          />
        </RoundedBox>
      </group>
    </Float>
  );
};

// Scene Root with dynamic cursor parallax
const Scene = () => {
  const groupRef = useRef();

  useFrame((state) => {
    if (groupRef.current) {
      const targetX = (state.pointer.x * 0.4);
      const targetY = (state.pointer.y * 0.3);
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, 0.05);
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, 0.05);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Ambient and Warm Directional Lights */}
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 8, 5]} intensity={1.5} color="#fff7ed" />
      <pointLight position={[-4, -3, 2]} intensity={1.2} color="#ff5722" />
      <pointLight position={[4, 3, 2]} intensity={1} color="#f59e0b" />

      {/* Floating 3D Objects */}
      <BookMesh position={[-2.4, 0.8, 0]} rotation={[0.2, 0.4, -0.15]} />
      <CoursePrismMesh position={[2.6, 0.9, -0.5]} rotation={[-0.3, -0.2, 0.2]} />
      <ToolCubeMesh position={[-2.2, -1.3, -0.8]} rotation={[0.4, -0.3, 0.1]} />
      <FolderPillMesh position={[2.3, -1.2, 0.2]} rotation={[-0.2, 0.3, -0.1]} />
    </group>
  );
};

const LandingHero3D = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 6.5], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
      >
        <Scene />
      </Canvas>
    </div>
  );
};

export default LandingHero3D;
