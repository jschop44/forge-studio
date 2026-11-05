'use client';
import {Canvas,useFrame} from '@react-three/fiber';
import {Float,OrbitControls} from '@react-three/drei';
import {useRef} from 'react';
import type {Mesh} from 'three';
function Sculpture({accent}:{accent:string}){const mesh=useRef<Mesh>(null);useFrame((_,delta)=>{if(mesh.current)mesh.current.rotation.y+=delta*.18});return <Float speed={1.4} rotationIntensity={.4} floatIntensity={.8}><mesh ref={mesh} rotation={[.2,.3,.1]}><torusKnotGeometry args={[1.05,.32,160,24,2,3]}/><meshPhysicalMaterial color={accent} metalness={.65} roughness={.18} clearcoat={1} clearcoatRoughness={.1}/></mesh></Float>}
export default function Scene3D({accent}:{accent:string}){return <div className="scene-3d" aria-label="Interactive rotating 3D sculpture"><Canvas camera={{position:[0,0,5.6],fov:42}} dpr={[1,1.5]} gl={{antialias:true,alpha:true}}><ambientLight intensity={1.5}/><directionalLight position={[4,6,6]} intensity={3}/><pointLight position={[-4,-2,4]} color={accent} intensity={55}/><Sculpture accent={accent}/><OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={.3}/></Canvas></div>}
