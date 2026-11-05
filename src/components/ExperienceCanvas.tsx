'use client';
import {Canvas,useFrame} from '@react-three/fiber';
import {Float,OrbitControls,Sparkles,useGLTF,Image} from '@react-three/drei';
import {Suspense,useRef} from 'react';
import type {Mesh} from 'three';
import type {Experience} from '../lib/experiences';
function ProductModel({url}:{url:string}){const model=useGLTF(url);return <primitive object={model.scene.clone()} scale={1.4}/>}
function Sculpture({scene}:{scene:Experience['scene']}){const mesh=useRef<Mesh>(null);
 useFrame(({clock})=>{if(!mesh.current)return;mesh.current.rotation.y=clock.elapsedTime*scene.rotationSpeed*0.25;mesh.current.rotation.x=Math.sin(clock.elapsedTime*0.2)*0.14;if(scene.scrollMotion&&typeof window!=='undefined')mesh.current.rotation.z=window.scrollY*0.0006});
 return <Float speed={1.2} rotationIntensity={0.12} floatIntensity={0.3}><mesh ref={mesh} castShadow>
 {scene.object==='sphere'?<sphereGeometry args={[1.5,64,64]}/>:scene.object==='box'?<boxGeometry args={[2.2,2.2,2.2]}/>:scene.object==='torus'?<torusGeometry args={[1.2,0.38,32,100]}/>:<torusKnotGeometry args={[1.05,0.33,180,24]}/>}
 <meshPhysicalMaterial color={scene.accent} metalness={scene.metalness} roughness={scene.roughness} clearcoat={0.8} clearcoatRoughness={0.15}/></mesh></Float>}
export default function ExperienceCanvas({scene}:{scene:Experience['scene']}){return <Canvas camera={{position:[0,0,5.5],fov:44}} dpr={[1,1.75]} gl={{antialias:true,alpha:true}} shadows>
 <ambientLight intensity={0.55}/><directionalLight position={[4,5,5]} intensity={3.3} color="#ffe7d6"/><pointLight position={[-4,-2,3]} intensity={45} color={scene.accent}/><pointLight position={[2,-3,-4]} intensity={30} color="#6688ff"/>
 {scene.particles&&<Sparkles count={75} scale={[7,5,4]} size={2} speed={0.25} color={scene.accent}/>}
 <Suspense fallback={null}>{scene.modelUrl?<ProductModel url={scene.modelUrl}/>:scene.object==='product-image'&&scene.imageUrl?<Image url={scene.imageUrl} scale={[3,3]} transparent/>:<Sculpture scene={scene}/>}</Suspense><OrbitControls enableZoom={false} enablePan={false} autoRotate={false}/></Canvas>}
