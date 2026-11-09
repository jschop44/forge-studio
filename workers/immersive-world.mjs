/** Small procedural environments exported without remote assets or renderer dependencies. */
export function buildWorldScene(theme,targets){
 const objects=[];
 const add=(kind,center,size,color,target='')=>objects.push({kind,center,size,color,target});
 const wood=[.45,.25,.13],stone=[.69,.67,.59],leaf=[.19,.4,.27],cream=[.9,.83,.69];
 add('box',[0,-.18,0],[12,.3,9],theme==='baseball'?[.16,.35,.2]:theme==='wellness'?[.33,.43,.33]:[.32,.34,.33]);
 if(theme==='coffee'||theme==='dining'){
  add('box',[0,.8,-2.5],[7,1.6,1],wood);add('box',[0,1.65,-2.5],[7.3,.12,1.3],stone);
  for(const x of [-2.4,-.8,.8,2.4]){add('column',[x,1.94,-2.4],[.23,.45,.23],cream);add('column',[x,2.175,-2.4],[.18,.018,.18],[.13,.06,.03]);}
  for(const x of [-4,4]){add('column',[x,.6,1.5],[.85,.12,.85],wood);add('column',[x,.22,1.5],[.12,.7,.12],stone);}
 }else if(theme==='baseball'){
  add('box',[0,.015,-.5],[4,.04,4],[.65,.44,.26]);
  for(const [x,z] of [[0,1.4],[-1.8,-.4],[1.8,-.4],[0,-2.2]])add('box',[x,.06,z],[.28,.08,.28],cream);
  for(const x of [-5,5]){add('box',[x,.65,-2],[1,1.3,5],stone);add('box',[x,1.5,-3],[1,.3,3],[.27,.35,.43]);}
  add('sphere',[0,.55,-.5],[.45,.45,.45],cream);
 }else if(theme==='property'){
  for(const [x,z,h] of [[-3,-2,2.4],[0,-3,3.2],[3,-2,2]]){
   add('box',[x,h/2,z],[1.8,h,1.8],cream);add('box',[x,h+.15,z],[2,.3,2],[.24,.32,.39]);
   add('box',[x,h*.5,z+.92],[.7,.8,.03],[.24,.46,.56]);
  }
 }else if(theme==='wellness'){
  add('column',[0,.15,-1],[1.8,.3,1.8],[.28,.45,.49]);
  for(const x of [-3,3]){add('box',[x,.3,-1],[1.7,.6,.65],wood);add('sphere',[x,1.3,-3],[.9,1.1,.9],leaf);}
 }else if(theme==='technology'){
  for(const x of [-3,0,3]){add('box',[x,1.1,-2],[1.4,2.2,1],[.18,.25,.35]);add('box',[x,1.35,-1.48],[1,.8,.04],[.2,.7,.82]);}
 }else{
  for(const x of [-3,0,3]){add('box',[x,1.1,-2],[1.7,2.2,.25],cream);add('box',[x,1.2,-1.85],[1.1,1.2,.04],[.3,.46,.54]);}
 }
 if(theme!=='baseball')for(const x of [-5,5]){add('column',[x,.35,-3.5],[.5,.7,.5],stone);add('sphere',[x,1.25,-3.5],[.7,1,.7],leaf);}
 for(const [i,target] of targets.entries()){
  const x=(i-(targets.length-1)/2)*Math.min(2.5,8/Math.max(1,targets.length-1));
  const z=2+Math.abs(x)*.09;
  add('column',[x,.16,z],[.63,.32,.63],stone);
  add(theme==='baseball'?'sphere':'box',[x,.95,z],theme==='baseball'?[.43,.43,.43]:[.9,1.2,.55],target.active?[.9,.68,.35]:[.36,.67,.7],target.slug);
 }
 return objects;
}

function worldRuntime(config,objects){
 const root=document.getElementById('forge-immersive-world'),canvas=root?.querySelector('canvas'),status=root?.querySelector('[role=status]');
 if(!root||!canvas)return;
 const fallback=()=>{root.hidden=true;document.body.classList.remove('forge-world-exploring','forge-world-reading')};
 let gl;try{gl=canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'low-power'})}catch{fallback();return}
 if(!gl){fallback();return}
 const faces=[];
 function triangle(a,b,c,color,target){const u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]);const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const length=Math.hypot(...n)||1;faces.push({points:[a,b,c],normal:n.map(v=>v/length),color,target})}
 for(const o of objects){
  if(o.kind==='box'){
   const points=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(p=>p.map((v,i)=>o.center[i]+v*o.size[i]/2));
   for(const [a,b,c,d] of [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]]){triangle(points[a],points[b],points[c],o.color,o.target);triangle(points[a],points[c],points[d],o.color,o.target)}
  }else{
   const segments=20,rings=o.kind==='sphere'?10:1;
   const point=(u,j)=>{const v=j/rings*Math.PI;return o.kind==='sphere'?[o.center[0]+o.size[0]*Math.sin(v)*Math.cos(u),o.center[1]+o.size[1]*Math.cos(v),o.center[2]+o.size[2]*Math.sin(v)*Math.sin(u)]:[o.center[0]+o.size[0]*Math.cos(u),o.center[1]+(j-.5)*o.size[1],o.center[2]+o.size[2]*Math.sin(u)]};
   for(let i=0;i<segments;i++)for(let j=0;j<rings;j++){const a=i/segments*Math.PI*2,b=(i+1)/segments*Math.PI*2;triangle(point(a,j),point(b,j),point(b,j+1),o.color,o.target);triangle(point(a,j),point(b,j+1),point(a,j+1),o.color,o.target);if(o.kind==='column'){triangle([o.center[0],o.center[1]+o.size[1]/2,o.center[2]],point(a,1),point(b,1),o.color,o.target)}}
  }
 }
 const shaders=[];let program,buffer;
 const cleanup=()=>{if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);for(const shader of shaders)gl.deleteShader(shader)};
 try{
  const sources=[['VERTEX_SHADER','attribute vec3 p;attribute vec3 n;attribute vec3 c;varying vec3 color;uniform float aspect;void main(){float depth=12.-p.z;gl_Position=vec4(p.x*2.2/aspect,(p.y-1.)*2.2,1.00669*depth-.200669,depth);float light=.4+.6*abs(dot(normalize(n),normalize(vec3(-.5,1.,1.))));color=c*light;}'],['FRAGMENT_SHADER','precision mediump float;varying vec3 color;void main(){gl_FragColor=vec4(color,1.);}']];
  program=gl.createProgram();if(!program)throw Error('No renderer');
  for(const [type,source] of sources){const shader=gl.createShader(gl[type]);if(!shader)throw Error('No shader');shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('No shader');gl.attachShader(program,shader)}
  gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('No program');gl.useProgram(program);
  buffer=gl.createBuffer();if(!buffer)throw Error('No buffer');gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  for(const [name,offset] of [['p',0],['n',12],['c',24]]){const loc=gl.getAttribLocation(program,name);if(loc<0)throw Error('No attribute');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,36,offset)}
 }catch{cleanup();fallback();return}
 const aspectLocation=gl.getUniformLocation(program,'aspect');gl.enable(gl.DEPTH_TEST);
 const key='forge-immersive-camera:'+location.pathname.replace(/[^/]*$/,'')+':'+config.businessName;
 let yaw=0,pitch=.35,zoom=1,frame=0,live=true,drag=null,projected=[],hover='',reading=false;
 try{const saved=JSON.parse(sessionStorage.getItem(key)||'null');if(Array.isArray(saved)&&saved.length===3&&saved.every(Number.isFinite)){yaw=Math.max(-.65,Math.min(.65,saved[0]));pitch=Math.max(.05,Math.min(.8,saved[1]));zoom=Math.max(.7,Math.min(1.3,saved[2]))}}catch{}
 const save=()=>{try{sessionStorage.setItem(key,JSON.stringify([yaw,pitch,zoom]))}catch{}};
 function rotate(p,normal=false){const y=p[1]-(normal?0:1),x=p[0]*Math.cos(yaw)+p[2]*Math.sin(yaw),z=-p[0]*Math.sin(yaw)+p[2]*Math.cos(yaw);return [x*(normal?1:zoom),(y*Math.cos(pitch)-z*Math.sin(pitch))*(normal?1:zoom)+(normal?0:1),(y*Math.sin(pitch)+z*Math.cos(pitch))*(normal?1:zoom)]}
 function draw(){
  frame=0;if(!live||document.hidden||reading)return;
  const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
  const density=Math.min(devicePixelRatio||1,1.5,Math.sqrt(1800000/(rect.width*rect.height)));
  const width=Math.max(1,Math.round(rect.width*density)),height=Math.max(1,Math.round(rect.height*density));
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}
  const aspect=width/height,fit=Math.min(1,aspect*.95);gl.viewport(0,0,width,height);gl.clearColor(.06,.09,.12,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniform1f(aspectLocation,aspect);
  const data=[];projected=[];
  for(const face of faces){const points=face.points.map(p=>rotate(p).map((v,i)=>i===1?1+(v-1)*fit:v*fit)),normal=rotate(face.normal,true),color=face.target&&face.target===hover?face.color.map(v=>Math.min(1,v+.18)):face.color;
   for(const p of points)data.push(...p,...normal,...color);
   projected.push({target:face.target,points:points.map(p=>[(p[0]*2.2/aspect/(12-p[2])*.5+.5)*rect.width,(.5-(p[1]-1)*2.2/(12-p[2])*.5)*rect.height,12-p[2]])});
  }
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,data.length/9);
 }
 const schedule=()=>{if(!frame&&live&&!reading&&!document.hidden)frame=requestAnimationFrame(draw)};
 function pick(x,y){let selected='',nearest=Infinity;for(const face of projected){const [a,b,c]=face.points,den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<.001)continue;const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/den,v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/den,w=1-u-v;if(u<0||v<0||w<0)continue;const depth=1/(u/a[2]+v/b[2]+w/c[2]);if(depth<nearest){nearest=depth;selected=face.target}}return config.targets.find(t=>t.slug===selected)}
 const targetAt=e=>{const rect=canvas.getBoundingClientRect();return pick(e.clientX-rect.left,e.clientY-rect.top)};
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:0};canvas.setPointerCapture(e.pointerId)});
 canvas.addEventListener('pointermove',e=>{if(drag&&drag.id===e.pointerId){drag.moved=Math.max(drag.moved,Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY));yaw=Math.max(-.65,Math.min(.65,yaw+(e.clientX-drag.x)*.004));pitch=Math.max(.05,Math.min(.8,pitch+(e.clientY-drag.y)*.004));drag.x=e.clientX;drag.y=e.clientY;schedule()}else{const target=targetAt(e),part=target?.slug||'';canvas.style.cursor=target?'pointer':'grab';if(part!==hover){hover=part;schedule()}status.textContent=target?'Open '+target.title:'Drag to explore. Select a lit landmark to open a page.'}});
 canvas.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const moved=drag.moved;drag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);save();if(moved<=6){const target=targetAt(e);if(target){save();root.querySelector('[data-world-page="'+target.slug+'"]').click()}}});
 canvas.addEventListener('pointercancel',()=>{drag=null;save()});canvas.addEventListener('lostpointercapture',()=>{drag=null});
 canvas.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey)return;if(e.key==='ArrowLeft')yaw=Math.max(-.65,yaw-.1);else if(e.key==='ArrowRight')yaw=Math.min(.65,yaw+.1);else if(e.key==='ArrowUp')pitch=Math.min(.8,pitch+.08);else if(e.key==='ArrowDown')pitch=Math.max(.05,pitch-.08);else return;e.preventDefault();save();schedule()});
 root.querySelector('[data-world-reset]').addEventListener('click',()=>{yaw=0;pitch=.35;zoom=1;hover='';save();schedule()});
 for(const button of root.querySelectorAll('[data-world-zoom]'))button.addEventListener('click',()=>{zoom=Math.max(.7,Math.min(1.3,zoom+Number(button.dataset.worldZoom)));save();schedule()});
 const toggle=root.querySelector('[data-world-read]');
 toggle.addEventListener('click',()=>{reading=!reading;document.body.classList.toggle('forge-world-reading',reading);document.body.classList.toggle('forge-world-exploring',!reading);toggle.textContent=reading?'Explore 3D world':'Read '+config.pageTitle+' page';toggle.setAttribute('aria-expanded',String(reading));canvas.tabIndex=reading?-1:0;canvas.setAttribute('aria-hidden',String(reading));if(reading){const heading=document.querySelector('main h1');if(heading){heading.tabIndex=-1;heading.focus()}}else{window.scrollTo(0,0);canvas.focus();schedule()}});
 const resize=new ResizeObserver(schedule);resize.observe(canvas);document.addEventListener('visibilitychange',schedule);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();live=false;cancelAnimationFrame(frame);resize.disconnect();fallback()});
 addEventListener('pagehide',()=>{save();if(frame)cancelAnimationFrame(frame);frame=0});
 addEventListener('pageshow',schedule);
 root.hidden=false;document.body.classList.add('forge-world-exploring');schedule();
}

export function immersiveWorldMarkup(config){
 if(!config||!['coffee','dining','baseball','property','wellness','technology','gallery'].includes(config.theme)||typeof config.businessName!=='string'||config.businessName.length>100||typeof config.pageTitle!=='string'||config.pageTitle.length>160||!Array.isArray(config.targets)||config.targets.length<1||config.targets.length>12||config.targets.some(t=>!t||typeof t.slug!=='string'||!/^([a-z0-9-]{1,48})$/.test(t.slug)||typeof t.title!=='string'||t.title.length>160)||new Set(config.targets.map(t=>t.slug)).size!==config.targets.length)throw Error('Invalid immersive world');
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const serialize=value=>JSON.stringify(value).replace(/</g,'\\u003c');
 return '<!--forge-world-start--><style id="forge-immersive-world-style">#forge-immersive-world[hidden]{display:none!important}#forge-immersive-world{position:fixed;inset:0;z-index:3;background:#10171e}#forge-immersive-world canvas{display:block;width:100%;height:100%;touch-action:none;cursor:grab}#forge-immersive-world .world-tools{position:absolute;bottom:18px;left:18px;right:18px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;padding:14px;border:1px solid #fff3;border-radius:18px;background:#0a111cf2;color:#fff;max-height:34vh;overflow:auto}#forge-immersive-world .world-tools a,#forge-immersive-world button{font:600 14px system-ui,sans-serif;letter-spacing:normal;padding:11px 16px;border:1px solid #bdcbd4;border-radius:24px;background:#152330;color:#fff;cursor:pointer;text-decoration:none}#forge-immersive-world [aria-current="page"]{background:#d9b97a!important;color:#151c21!important}#forge-immersive-world p{font:14px/1.5 system-ui,sans-serif;color:#d5e2eb;margin:0;max-width:none}#forge-immersive-world .world-status{flex-basis:100%}#forge-immersive-world :focus-visible{outline:3px solid #f2ce88;outline-offset:3px}@media screen{body.forge-world-exploring>main,body.forge-world-exploring>footer{display:none!important}body.forge-world-exploring>nav{position:relative;z-index:4;background:#10171eea}body.forge-world-reading #forge-immersive-world{background:transparent;pointer-events:none}body.forge-world-reading #forge-immersive-world canvas{visibility:hidden}body.forge-world-reading #forge-immersive-world .world-tools{pointer-events:auto}body.forge-world-reading>main{padding-bottom:280px}}@media(max-width:600px){#forge-immersive-world .world-tools{left:8px;right:8px;bottom:8px;padding:10px;gap:6px}#forge-immersive-world .world-tools a,#forge-immersive-world button{padding:9px 12px;font-size:12px}}@media print{#forge-immersive-world{display:none!important}}</style><section id="forge-immersive-world" data-world-theme="'+escape(config.theme)+'" aria-label="'+escape(config.businessName)+' immersive environment" hidden><canvas tabindex="0" role="img" aria-label="Interactive '+escape(config.theme)+' environment. Drag or use arrow keys to look around. Use page links below for keyboard navigation."></canvas><div class="world-tools" role="group" aria-label="Immersive website navigation"><p class="world-status" role="status" aria-live="polite">Drag to explore. Select a lit landmark to open a page.</p>'+config.targets.map(t=>'<a data-world-page="'+t.slug+'" href="'+t.slug+'.html"'+(t.active?' aria-current="page"':'')+'>'+escape(t.title)+'</a>').join('')+'<button type="button" data-world-read aria-expanded="false">Read '+escape(config.pageTitle)+' page</button><button type="button" data-world-reset>Reset world view</button><button type="button" data-world-zoom="0.1" aria-label="Zoom into world">+</button><button type="button" data-world-zoom="-0.1" aria-label="Zoom out of world">−</button></div></section><script id="forge-immersive-world-controller">('+worldRuntime.toString()+')('+serialize(config)+','+serialize(buildWorldScene(config.theme,config.targets))+');</script><!--forge-world-end-->';
}
