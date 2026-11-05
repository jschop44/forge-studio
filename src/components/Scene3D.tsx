'use client';
import {Canvas,useFrame} from '@react-three/fiber';
import {Float,OrbitControls,Sparkles,Environment} from '@react-three/drei';
import {useRef} from 'react';
import type {Group,Mesh} from 'three';
function KineticGallery({accent}:{accent:string}){
 const group=useRef<Group>(null),hero=useRef<Mesh>(null);
 useFrame(({clock,pointer},delta)=>{
  if(group.current){group.current.rotation.y+=(pointer.x*.35-group.current.rotation.y)*Math.min(1,delta*1.5);group.current.rotation.x+=(-pointer.y*.14-group.current.rotation.x)*Math.min(1,delta*1.5)}
  if(hero.current){hero.current.rotation.y+=delta*.2;hero.current.rotation.z=Math.sin(clock.elapsedTime*.28)*.1}
 });
 return <group ref={group}>
 <Float speed={1.1} rotationIntensity={.12} floatIntensity={.35}><mesh ref={hero} position={[0,0,.2]} castShadow><torusKnotGeometry args={[.95,.29,180,24,2,3]}/><meshPhysicalMaterial color={accent} metalness={.78} roughness={.14} clearcoat={1} clearcoatRoughness={.08}/></mesh></Float>
 <Float speed={1.6} floatIntensity={.6}><mesh position={[-2.1,.8,-1.1]} rotation={[.4,.2,.3]}><icosahedronGeometry args={[.65,3]}/><meshPhysicalMaterial color="#e5d7ff" metalness={.55} roughness={.16} clearcoat={1}/></mesh></Float>
 <Float speed={.8} floatIntensity={.5}><mesh position={[2,-.85,-1]} rotation={[.5,.3,.2]}><torusGeometry args={[.73,.14,24,90]}/><meshPhysicalMaterial color="#f8c8aa" metalness={.8} roughness={.18}/></mesh></Float>
 <mesh position={[0,-1.8,-2.5]} rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[12,12]}/><shadowMaterial transparent opacity={.3}/></mesh>
 </group>
}
export default function Scene3D({accent}:{accent:string}){return <div className="scene-3d" aria-label="Interactive 3D gallery with three animated sculptures; drag to explore"><Canvas camera={{position:[0,0,6.6],fov:45}} dpr={[1,1.6]} gl={{antialias:true,alpha:true}} shadows><ambientLight intensity={.8}/><directionalLight position={[4,6,6]} intensity={3.5} castShadow/><pointLight position={[-4,-2,4]} color={accent} intensity={35}/><pointLight position={[3,1,-4]} color="#9b7bff" intensity={40}/><Sparkles count={55} scale={[8,5,4]} size={1.6} speed={.18} color={accent}/><KineticGallery accent={accent}/><OrbitControls enablePan={false} minDistance={4.5} maxDistance={9} enableDamping dampingFactor={.06}/></Canvas></div>}
