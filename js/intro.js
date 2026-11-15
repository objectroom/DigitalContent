/* 01 인트로 WebGL 도입부 (도입부 초안 이식) */
(()=>{
'use strict';
const $=s=>document.querySelector(s);
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const range=(p,a,b)=>clamp((p-a)/(b-a));
const eOut=t=>1-Math.pow(1-t,3), eIn=t=>t*t*t, eIO=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const sst=t=>t*t*(3-2*t);                       // smoothstep
const sst5=t=>t*t*t*(t*(t*6-15)+10);            // smootherstep (속도·가속도 모두 0에서 시작/종료)
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
let VW=innerWidth, VH=innerHeight;

/* 원본 WORLD_ART[0] — 그대로 사용 */
const WORLD_ART=["<img class=\"world-art\" id=\"worldArt0\" src=\"./assets/images/team-hero.webp\" alt=\"파스텔빛 대학 축제 입구\" decoding=\"async\">"];
const IMG_ASPECT=1400/876;

/* ======================= 조절값 ======================= */
const TUNE={turn:110,bank:10,fog:1,damp:.08};
const FLIGHT_END=.86;          // 스크롤 진행도 p 가 이 값일 때 카메라가 도착한다. 이후는 도착 카피 구간
const D0=420, DR=60;           // 출발 거리(m)와 거리 감쇠비
const EL0=26*Math.PI/180;      // 출발 고도각
const PITCH_SKY=.30;           // 출발 시 올려다보는 각 (rad)
const LAYERS=[300,150,100,68,42];   // 구름층 높이(m) — 셰이더와 동일

/* 사진을 찍은 카메라(추정): 눈높이 1.45m, 지평선이 사진 높이의 64% 지점에 오도록 7.9° 올려다봄.
   사진의 각 픽셀을 이 카메라에서 깊이만큼 밀어내 3D 공간에 세운다 → 도착 지점에서는 원본 사진과 정확히 같은 화면이 된다. */
const TANP=.5, HC=1.45, PH=Math.atan((560-438)/438*TANP);
const O=[0,HC,0], F0=[0,Math.sin(PH),-Math.cos(PH)], R0=[1,0,0], U0=[0,Math.cos(PH),Math.sin(PH)];
const TGT=[O[0]+F0[0]*30,O[1]+F0[1]*30,O[2]+F0[2]*30];
const DEPTH_SRC="./assets/images/team-hero-depth.png";   // 원본 사진에서 만든 깊이맵(R)과 흰 테두리 마스크(G), 320×200
const ZMIN=Math.log(3.2), ZMAX=Math.log(1000);

/* ======================= INTRO DOM ======================= */
const title='College Festival ';
const h1=$('#heroTitle');
let ci=0;
h1.innerHTML=[...title].map(c=>c===' '?' ':`<span class="ch" style="animation-delay:${(.15+ci++*.035).toFixed(3)}s">${c}</span>`).join('')+
  `<span class="ch grad-text" style="animation-delay:${(.15+ci*.035+.08).toFixed(3)}s">2031</span>`;
h1.querySelectorAll('.ch').forEach(s=>s.setAttribute('aria-hidden','true'));
$('#portalScene').innerHTML=WORLD_ART[0];

const intro={el:$('#intro'),p:0,t:0};
const stage=$('#intro .stage'),portal=$('#portal'),pScene=$('#portalScene'),pLabel=$('#portalLabel'),
  iTitle=$('#introTitle'),veil=$('#veil'),hint=$('#scrollHint');
const orbs=[...stage.querySelectorAll('.orb')];
let hintLive=false;
hint.addEventListener('animationend',()=>{hint.classList.remove('fade-up');hintLive=true});
const copyEls=[...$('#introCopy > div').children];

/* ======================= 카메라 경로 ======================= */
let tanV=.5, tanH=.5, tanVf=.5, widen=1.12, VA=1;
function fitCam(){
  VA=VW/VH;
  tanVf=TANP*Math.min(1,IMG_ASPECT/VA);          // 도착 시 사진이 화면에 정확히 cover 로 맞는 시야
  widen=VA<1?1.5:1.12;                           // 비행 중에는 조금 넓게 보고, 다가가며 좁힌다
}
// 위치만 (링·입자 배치에도 사용). 도착점 O 를 중심으로 한 구면 좌표: 거리·방위·고도가 함께 줄어든다.
function pathPos(u,out){
  const s=sst5(range(u,.08,1));
  const d=D0*(Math.pow(DR,1-s)-1)/(DR-1);                       // 로그형 감쇠 → 끌려가듯 가속, 끝에서 감속
  const th=TUNE.turn*.36*Math.PI/180*(1-sst(range(u,0,.7)));
  const el=EL0*(1-sst(range(u,0,.8)));
  const ce=Math.cos(el);
  out[0]=O[0]+d*ce*Math.sin(th); out[1]=O[1]+d*Math.sin(el); out[2]=O[2]+d*ce*Math.cos(th);
  return d;
}
const cam={ro:[0,0,1],f:[0,0,-1],r:[1,0,0],up:[0,1,0],d:1,yawOff:0,roll:0};
function camAt(u,time){
  const d=pathPos(u,cam.ro); cam.d=d;
  tanV=tanVf*lerp(widen,1,sst5(range(u,.45,.92))); tanH=tanV*VA;
  let x=TGT[0]-cam.ro[0],y=TGT[1]-cam.ro[1],z=TGT[2]-cam.ro[2];const L=Math.hypot(x,y,z)||1;x/=L;y/=L;z/=L;
  const yawL=Math.atan2(x,-z), pitchL=Math.asin(y);              // 축제 공간을 바라보는 각 (도착 시 사진 카메라와 일치)
  const tw=range(u,.12,.66), w=sst5(tw);
  const settle=1-sst5(range(u,.7,1));
  const yawOff=TUNE.turn*Math.PI/180*(1-w);
  const yaw=yawL+yawOff+(reduce?0:.012*Math.sin(time*.23)*settle);
  const pitch=lerp(PITCH_SKY,pitchL,sst5(range(u,.05,.56)))+(reduce?0:.008*Math.sin(time*.31+1)*settle);
  const roll=TUNE.bank*Math.PI/180*16*tw*tw*(1-tw)*(1-tw)+(reduce?0:.006*Math.sin(time*.19+2)*settle);   // 선회 속도에 비례하는 뱅킹
  const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
  const f=[sy*cp,sp,-cy*cp], r0=[cy,0,sy];
  const u0=[r0[1]*f[2]-r0[2]*f[1], r0[2]*f[0]-r0[0]*f[2], r0[0]*f[1]-r0[1]*f[0]];
  const cr=Math.cos(roll),sr=Math.sin(roll);
  cam.f=f;
  cam.r=[r0[0]*cr+u0[0]*sr,r0[1]*cr+u0[1]*sr,r0[2]*cr+u0[2]*sr];
  cam.up=[-r0[0]*sr+u0[0]*cr,-r0[1]*sr+u0[1]*cr,-r0[2]*sr+u0[2]*cr];
  cam.yawOff=yawOff; cam.roll=roll;
}
// 월드 → 화면(px). 반환 [x,y,깊이]
function proj(px,py,pz,o){
  const x=px-cam.ro[0],y=py-cam.ro[1],z=pz-cam.ro[2];
  const zc=x*cam.f[0]+y*cam.f[1]+z*cam.f[2];
  const xc=x*cam.r[0]+y*cam.r[1]+z*cam.r[2], yc=x*cam.up[0]+y*cam.up[1]+z*cam.up[2];
  o[2]=zc; const k=zc>1e-4?1/zc:1e4;
  o[0]=(xc*k/tanH*.5+.5)*VW; o[1]=(.5-yc*k/tanV*.5)*VH; return o;
}

/* ======================= WebGL 씬 (#heroBg) =======================
   ① 하늘 + 지면(사진의 하늘색·보도블록색에 맞춤)  ② 깊이를 가진 사진 공간  ③ 구름층 */
const heroBg=$('#heroBg');
let GL=null, glScale=1;
(function initGL(){
  if(reduce||!heroBg)return;
  const g=heroBg.getContext('webgl',{antialias:false,alpha:false,depth:true,preserveDrawingBuffer:false,powerPreference:'high-performance'});
  if(!g)return;
  const HEAD=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;uniform float uTime;
uniform vec3 uRo,uF,uR,uU;uniform vec2 uTan;
const vec3 HAZE=vec3(.89,.80,.86);
const vec3 GLOWD=vec3(0.,.08,-.997);
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
 return mix(mix(h(i),h(i+vec2(1.,0.)),u.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<3;i++){v+=a*n(p);p=m*p;a*=.5;}return v/.875;}
vec3 ray(){vec2 ndc=gl_FragCoord.xy/uRes*2.-1.;return normalize(uF+ndc.x*uTan.x*uR+ndc.y*uTan.y*uU);}
`;
  const VS_FULL=`attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`;
  const FS_BG=HEAD+`
uniform float uAur,uGK,uGA;
vec3 skyc(float e){
 vec3 c=mix(HAZE,vec3(.915,.81,.84),smoothstep(0.,.17,e));
 c=mix(c,vec3(.93,.855,.895),smoothstep(.17,.29,e));
 c=mix(c,vec3(.89,.835,.88),smoothstep(.29,.39,e));
 c=mix(c,vec3(.886,.857,.951),smoothstep(.39,.47,e));
 c=mix(c,vec3(.874,.868,.976),smoothstep(.47,.56,e));
 return mix(c,vec3(.80,.85,.975),smoothstep(.56,1.,e));
}
void main(){
 vec3 rd=ray();vec3 col;
 float g=max(dot(rd,normalize(GLOWD)),0.);
 if(rd.y<-1e-4){
  float t=-uRo.y/rd.y;vec2 p=uRo.xz+t*rd.xz;
  vec3 gc=mix(vec3(.775,.725,.80),vec3(.67,.63,.735),smoothstep(.40,.64,fbm(p*.45+3.1))*exp(-t*.025));
  vec2 gq=abs(fract(p/vec2(1.2,.6))-.5);
  gc*=1.-.07*smoothstep(.46,.5,max(gq.x,gq.y))*exp(-t*.07);
  float f=1.-exp(-t*uGK);
  col=mix(gc,HAZE,f*mix(.9,1.,smoothstep(120.,400.,t)));
  vec2 sp=p-vec2(0.,-25.);
  col+=vec3(.10,.05,.02)*exp(-dot(sp,sp)/7000.)*f;
 }else{
  col=skyc(rd.y);
  if(uAur>.01){
   vec2 sp=rd.xz/(abs(rd.y)+.55)*1.15;float t=uTime*.045;
   vec2 q=vec2(fbm(sp+vec2(0.,t)),fbm(sp+vec2(5.2,1.3)-t));
   float f=fbm(sp*1.2+2.4*q);
   vec3 au=mix(vec3(.612,.784,.886),vec3(.722,.714,.898),smoothstep(.25,.65,f));
   au=mix(au,vec3(.910,.690,.867),smoothstep(.40,.80,q.x)*.9);
   au=mix(au,vec3(.973,.792,.655),smoothstep(.55,.90,q.y)*.75);
   col=mix(col,mix(au,vec3(1.),.64),uAur*smoothstep(-.02,.3,rd.y));
  }
 }
 col+=vec3(1.,.80,.62)*pow(g,8.)*.14+vec3(.95,.72,.86)*pow(g,2.5)*.06;
 gl_FragColor=vec4(col,1.);
}`;
  const VS_MESH=`
attribute vec2 aUV;attribute vec4 aZM;uniform float uFarPass;
uniform vec3 uRo,uF,uR,uU,uO,uF0,uR0,uU0;uniform vec2 uTan,uTanP;
varying vec2 vUV;varying float vM,vDist,vD;
void main(){
 vec2 q=aUV*2.-1.;vD=uFarPass>.5?aZM.z*step(aZM.w,150.):aZM.z;
 vec3 w=uO+(uF0+q.x*uTanP.x*uR0+q.y*uTanP.y*uU0)*mix(aZM.x,aZM.w,uFarPass);
 vec3 rel=w-uRo;float zc=dot(rel,uF);
 vUV=aUV;vM=aZM.y;vDist=length(rel);
 gl_Position=vec4(dot(rel,uR)/uTan.x,dot(rel,uU)/uTan.y,1.0004*zc-.6001,zc);
}`;
  const FS_MESH=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uTex;uniform float uMK,uArrive,uFeather,uFrame,uSpeed,uSheet,uFarPass,uSkyIn;
varying vec2 vUV;varying float vM,vDist,vD;
const vec3 HAZE=vec3(.89,.80,.86);
void main(){
 vec2 e=min(vUV,1.-vUV);
 float k=clamp(min(e.x*1.6,e.y)/max(uFeather,1e-4),0.,1.);
 float a=k*k*(3.-2.*k)*mix(smoothstep(.35,.9,vM),1.,uFrame);
 float fog=(1.-exp(-min(vDist,130.)*uMK))*(1.-uArrive);
 float skyish=smoothstep(150.,500.,vDist);
 a*=mix(1.-smoothstep(.55,.85,fog),uSkyIn,skyish);
 // 깊이가 끊기는 경계면: 비행 중에는 숨기고(뒤쪽 면이 그 자리를 채운다), 도착 직전에 닫는다
 a*=uFarPass>.5?smoothstep(0.,.15,vD):mix(1.-smoothstep(0.,.15,vD),1.,uSheet);
 if(a<.004)discard;
 vec3 tx=texture2D(uTex,vUV,fog*3.+uSpeed*(1.-uArrive)*1.2).rgb;
 tx=mix(tx,vec3(dot(tx,vec3(.3,.59,.11))),fog*.45);
 vec3 col=mix(tx,HAZE,fog*.9*(1.-skyish));
 gl_FragColor=vec4(col*a,a);
}`;
  const FS_CL=HEAD+`
uniform float uOver,uMist,uArrive,uClear;uniform vec2 uPc;
void layer(float hh,float sc,float cov,vec3 rd,inout vec4 front){
 float dy=hh-uRo.y;float tc=dy/rd.y;
 if(tc<=0.||tc>4000.)return;
 vec2 xz=uRo.xz+tc*rd.xz;
 float f=fbm(xz*sc+vec2(hh*.37,hh*.13)+uTime*vec2(.014,.006));
 float a=smoothstep(cov,cov+.17,f);
 a*=exp(-tc*(.0008+sc*.012));
 a*=smoothstep(0.,1.,abs(dy)/(.07*hh+2.));
 a*=smoothstep(0.,.07,abs(rd.y))*.88;
 if(a<.004)return;
 vec3 c=mix(vec3(.80,.775,.93),vec3(1.,.985,.99),smoothstep(cov+.02,cov+.36,f));
 c+=vec3(.07,.02,.0)*pow(max(dot(rd,normalize(GLOWD)),0.),3.);
 c=mix(c,HAZE+.06,1.-exp(-tc*.0012));
 front=front*(1.-a)+vec4(c*a,a);
}
void main(){
 vec3 rd=ray();vec4 front=vec4(0.);
 if(rd.y>0.){
  if(uOver>.004){
   layer(300.,.004,.52,rd,front);layer(150.,.008,.47,rd,front);layer(100.,.012,.47,rd,front);layer(68.,.018,.48,rd,front);layer(42.,.028,.47,rd,front);
   front*=uOver;
  }
 }else{
  layer(42.,.028,.47,rd,front);layer(68.,.018,.48,rd,front);layer(100.,.012,.47,rd,front);layer(150.,.008,.47,rd,front);layer(300.,.004,.52,rd,front);
  vec2 ndc=gl_FragCoord.xy/uRes*2.-1.;
  float r=length((ndc-uPc)*vec2(uRes.x/uRes.y,1.));
  front*=mix(1.,mix(.12,1.,smoothstep(.1,.75,r)),uClear);
 }
 vec4 m=vec4(vec3(.985,.972,.988),1.)*uMist*(.72+.28*n(gl_FragCoord.xy/uRes*4.6+uTime*.3));
 front=front*(1.-m.a)+m;
 front.rgb+=(h(gl_FragCoord.xy+fract(uTime*7.))-.5)*.02*(1.-uArrive)*front.a;
 gl_FragColor=front;
}`;
  const sh=(type,src)=>{const s=g.createShader(type);g.shaderSource(s,src);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS)){console.warn(g.getShaderInfoLog(s));return null}return s};
  const mk=(vs,fs,attrs,unis)=>{const v=sh(g.VERTEX_SHADER,vs),f=sh(g.FRAGMENT_SHADER,fs);if(!v||!f)return null;
    const pr=g.createProgram();g.attachShader(pr,v);g.attachShader(pr,f);attrs.forEach((a,i)=>g.bindAttribLocation(pr,i,a));g.linkProgram(pr);
    if(!g.getProgramParameter(pr,g.LINK_STATUS)){console.warn(g.getProgramInfoLog(pr));return null}
    const U={};unis.forEach(k=>U[k]=g.getUniformLocation(pr,k));return {pr,U}};
  const CAMU=['uRes','uTime','uRo','uF','uR','uU','uTan'];
  const A=mk(VS_FULL,FS_BG,['a'],[...CAMU,'uAur','uGK','uGA']);
  const M=mk(VS_MESH,FS_MESH,['aUV','aZM'],['uRo','uF','uR','uU','uTan','uO','uF0','uR0','uU0','uTanP','uTex','uMK','uArrive','uFeather','uFrame','uSpeed','uSheet','uFarPass','uSkyIn']);
  const C=mk(VS_FULL,FS_CL,['a'],[...CAMU,'uOver','uMist','uArrive','uClear','uPc']);
  if(!A||!M||!C)return;
  const quad=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,quad);g.bufferData(g.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),g.STATIC_DRAW);
  GL={g,A,M,C,quad,tex:false,mesh:null};
  stage.classList.add('has-gl');
  // 사진 → 텍스처 (밉맵을 쓰기 위해 2의 거듭제곱 크기로만 옮겨 담는다. 내용은 그대로)
  const img=$('#worldArt0');
  const up=()=>{try{
    const c=document.createElement('canvas');c.width=2048;c.height=1024;
    const x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(img,0,0,2048,1024);
    const t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);
    g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,true);
    g.texImage2D(g.TEXTURE_2D,0,g.RGB,g.RGB,g.UNSIGNED_BYTE,c);
    g.generateMipmap(g.TEXTURE_2D);
    g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR_MIPMAP_LINEAR);
    g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);
    g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);
    GL.tex=true;
  }catch(e){console.warn(e)}};
  if(img.complete&&img.naturalWidth)up();else img.addEventListener('load',up,{once:true});
  // 깊이맵 → 격자 메시. 삼각형은 먼 것부터 그리도록 정렬한다.
  const dimg=new Image();
  dimg.onload=()=>{try{
    const NX=dimg.naturalWidth,NY=dimg.naturalHeight,c=document.createElement('canvas');c.width=NX;c.height=NY;
    const x=c.getContext('2d');x.drawImage(dimg,0,0);const px=x.getImageData(0,0,NX,NY).data;
    const vb=new Float32Array(NX*NY*6),zs=new Float32Array(NX*NY),lz=new Float32Array(NX*NY);
    for(let j=0;j<NY;j++)for(let i=0;i<NX;i++){const k=j*NX+i,z=Math.exp(lerp(ZMIN,ZMAX,px[k*4]/255));
      vb[k*6]=i/(NX-1);vb[k*6+1]=1-j/(NY-1);vb[k*6+2]=z;vb[k*6+3]=px[k*4+1]/255;zs[k]=z;lz[k]=Math.log(z)}
    for(let j=0;j<NY;j++)for(let i=0;i<NX;i++){let lo=9,hi=-9;
      for(let b=Math.max(0,j-1);b<=Math.min(NY-1,j+1);b++)for(let a=Math.max(0,i-1);a<=Math.min(NX-1,i+1);a++){const v=lz[b*NX+a];if(v<lo)lo=v;if(v>hi)hi=v}
      vb[(j*NX+i)*6+4]=clamp((hi-lo-.45)/.5);
      let far=-9;for(let b=Math.max(0,j-3);b<=Math.min(NY-1,j+3);b++)for(let a=Math.max(0,i-3);a<=Math.min(NX-1,i+3);a++){const v=lz[b*NX+a];if(v>far)far=v}
      vb[(j*NX+i)*6+5]=Math.exp(far)}
    const tris=[];
    for(let j=0;j<NY-1;j++)for(let i=0;i<NX-1;i++){const a=j*NX+i,b=a+1,cc=a+NX,d=cc+1;
      tris.push([zs[a]+zs[b]+zs[cc],a,cc,b],[zs[b]+zs[cc]+zs[d],b,cc,d])}
    tris.sort((p,q)=>q[0]-p[0]);
    const ib=new Uint16Array(tris.length*3);tris.forEach((t,i)=>{ib[i*3]=t[1];ib[i*3+1]=t[2];ib[i*3+2]=t[3]});
    const vbo=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,vbo);g.bufferData(g.ARRAY_BUFFER,vb,g.STATIC_DRAW);
    const ibo=g.createBuffer();g.bindBuffer(g.ELEMENT_ARRAY_BUFFER,ibo);g.bufferData(g.ELEMENT_ARRAY_BUFFER,ib,g.STATIC_DRAW);
    GL.mesh={vbo,ibo,n:ib.length};
  }catch(e){console.warn(e)}};
  dimg.src=DEPTH_SRC;
  heroBg.addEventListener('webglcontextlost',e=>{e.preventDefault();GL=null;stage.classList.remove('has-gl')});
})();
function sizeGL(){
  if(!GL)return;
  const d=Math.min(devicePixelRatio||1,2);
  let s=d*glScale; const px=VW*VH*s*s, cap=2.2e6; if(px>cap)s*=Math.sqrt(cap/px);
  heroBg.width=Math.max(2,Math.round(VW*s));heroBg.height=Math.max(2,Math.round(VH*s));
  GL.g.viewport(0,0,heroBg.width,heroBg.height);
}
const pv=[0,0,0];
let mist=0, speed=0;
function camU(g,U,time){
  g.uniform2f(U.uRes,heroBg.width,heroBg.height); g.uniform1f(U.uTime,time%3600);
  g.uniform3fv(U.uRo,cam.ro);g.uniform3fv(U.uF,cam.f);g.uniform3fv(U.uR,cam.r);g.uniform3fv(U.uU,cam.up);
  g.uniform2f(U.uTan,tanH,tanV);
}
function drawGL(u,time){
  if(!GL)return;
  const g=GL.g, clear=sst(range(u,.66,.93)), arrive=sst5(range(u,.66,.96)), fogT=Math.max(TUNE.fog,.05);
  let m=0; for(const hh of LAYERS){const nf=.07*hh+2;m=Math.max(m,1-sst(clamp(Math.abs(hh-cam.ro[1])/nf)))}
  mist=lerp(mist,m*.34,.2);
  // ① 하늘 + 지면
  g.disable(g.DEPTH_TEST);g.disable(g.BLEND);
  g.bindBuffer(g.ARRAY_BUFFER,GL.quad);g.enableVertexAttribArray(0);g.vertexAttribPointer(0,2,g.FLOAT,false,0,0);
  g.useProgram(GL.A.pr);camU(g,GL.A.U,time);
  g.uniform1f(GL.A.U.uAur,lerp(1,0,sst(range(u,.08,.4))));
  g.uniform1f(GL.A.U.uGK,((.02*(1-clear)+.0012)*(1-arrive)+.0015)*fogT);
  g.drawArrays(g.TRIANGLES,0,3);
  g.enable(g.BLEND);g.blendFunc(g.ONE,g.ONE_MINUS_SRC_ALPHA);
  // ② 사진 공간
  if(GL.mesh&&GL.tex&&u>.2){
    const U=GL.M.U;
    g.enable(g.DEPTH_TEST);g.depthFunc(g.LEQUAL);g.clear(g.DEPTH_BUFFER_BIT);
    g.useProgram(GL.M.pr);
    g.bindBuffer(g.ARRAY_BUFFER,GL.mesh.vbo);g.vertexAttribPointer(0,2,g.FLOAT,false,24,0);
    g.enableVertexAttribArray(1);g.vertexAttribPointer(1,4,g.FLOAT,false,24,8);
    g.bindBuffer(g.ELEMENT_ARRAY_BUFFER,GL.mesh.ibo);
    g.uniform3fv(U.uRo,cam.ro);g.uniform3fv(U.uF,cam.f);g.uniform3fv(U.uR,cam.r);g.uniform3fv(U.uU,cam.up);g.uniform2f(U.uTan,tanH,tanV);
    g.uniform3fv(U.uO,O);g.uniform3fv(U.uF0,F0);g.uniform3fv(U.uR0,R0);g.uniform3fv(U.uU0,U0);g.uniform2f(U.uTanP,TANP*IMG_ASPECT,TANP);
    g.uniform1i(U.uTex,0);
    g.uniform1f(U.uMK,(.02*(1-clear)+.0012)*fogT);g.uniform1f(U.uArrive,arrive);
    g.uniform1f(U.uFeather,.09*(1-sst5(range(u,.62,.96))));
    g.uniform1f(U.uFrame,sst5(range(u,.78,.985)));
    g.uniform1f(U.uSpeed,speed);g.uniform1f(U.uSheet,sst5(range(u,.78,.96)));
    g.uniform1f(U.uSkyIn,sst(range(u,.7,.93)));
    g.uniform1f(U.uFarPass,1);g.drawElements(g.TRIANGLES,GL.mesh.n,g.UNSIGNED_SHORT,0);
    g.uniform1f(U.uFarPass,0);g.drawElements(g.TRIANGLES,GL.mesh.n,g.UNSIGNED_SHORT,0);
    g.disableVertexAttribArray(1);g.disable(g.DEPTH_TEST);
  }
  // ③ 구름
  proj(TGT[0],0,TGT[2],pv);
  g.bindBuffer(g.ARRAY_BUFFER,GL.quad);g.vertexAttribPointer(0,2,g.FLOAT,false,0,0);
  g.useProgram(GL.C.pr);camU(g,GL.C.U,time);
  g.uniform1f(GL.C.U.uOver,1-sst(range(u,.5,.78)));
  g.uniform1f(GL.C.U.uMist,mist*(1-range(u,.7,.9)));
  g.uniform1f(GL.C.U.uArrive,arrive);
  g.uniform1f(GL.C.U.uClear,pv[2]>1?range(u,.22,.36):0);
  g.uniform2f(GL.C.U.uPc,pv[0]/VW*2-1,1-pv[1]/VH*2);
  g.drawArrays(g.TRIANGLES,0,3);
}

/* ======================= 깊이 레이어: 링 · 빛 입자 (#particles) ======================= */
const cvs=$('#particles'), ctx=cvs.getContext('2d');
const PCOL=['156,200,226','184,182,229','232,176,221','248,202,167','255,255,255'];
const RCOL=['184,182,229','156,200,226','232,176,221'];
function sizeCanvas(){const d=Math.min(devicePixelRatio||1,2);cvs.width=VW*d;cvs.height=VH*d;ctx.setTransform(d,0,0,d,0,0)}
let rings=[], dust=[];
function buildDepth(){
  // 링: 하늘 구간의 비행 경로 위에 놓인 게이트. 카메라가 그 한가운데를 통과한다.
  rings=[];const a=[0,0,0],b=[0,0,0];
  for(let k=0;k<7;k++){
    const u=.2+k*.05, d=pathPos(u,a); pathPos(u+.004,b);
    let n=[b[0]-a[0],b[1]-a[1],b[2]-a[2]];const nl=Math.hypot(...n)||1;n=n.map(v=>v/nl);
    let e1=[n[2],0,-n[0]];const l1=Math.hypot(...e1)||1;e1=e1.map(v=>v/l1);
    const e2=[n[1]*e1[2]-n[2]*e1[1],n[2]*e1[0]-n[0]*e1[2],n[0]*e1[1]-n[1]*e1[0]];
    rings.push({c:[...a],e1,e2,R:d*.26,col:RCOL[k%3],dash:[[3,9],[2,12],[1,14]][k%3],spin:(k%2?1:-1)*(.05+.02*k)});
  }
  // 빛 입자: 경로 주변의 공간에 흩어져 있고, 카메라가 지나가며 스쳐 간다.
  dust=[];const N=VW<700?130:240;
  let s=7; const rnd=()=>(s=(s*1664525+1013904223)>>>0)/4294967296;
  for(let i=0;i<N;i++){
    const u=.06+.86*rnd(), d=Math.max(pathPos(u,a),3);
    const th=rnd()*6.283, ph=Math.acos(2*rnd()-1), rho=d*(.05+.36*rnd());
    dust.push({x:a[0]+rho*Math.sin(ph)*Math.cos(th),y:Math.max(.5,a[1]+rho*Math.sin(ph)*Math.sin(th)),z:a[2]+rho*Math.cos(ph),sz:d*(.004+.007*rnd()),d,
      c:PCOL[(rnd()*5)|0],ph:rnd()*6.28,px:0,py:0,ok:false});
  }
}
const q0=[0,0,0],q1=[0,0,0];
function drawDepth(u,time,jump){
  ctx.clearRect(0,0,VW,VH);
  const fade=1-range(u,.74,.9);
  if(fade<=0)return;
  ctx.lineCap='round';
  const nz=Math.max(.3,cam.d*.01);
  const SEG=72;
  for(const rg of rings){
    proj(rg.c[0],rg.c[1],rg.c[2],q0);
    const zc=q0[2]; if(zc<-rg.R||zc>rg.R*26)continue;
    const al=(1-range(zc,rg.R*12,rg.R*26))*range(zc,-rg.R*.2,rg.R*.5)*fade*.85;
    if(al<.01)continue;
    const pxr=rg.R/(Math.max(zc,rg.R*.3)*tanV)*VH*.5;
    ctx.strokeStyle=`rgba(${rg.col},${al})`;ctx.lineWidth=clamp(pxr*.006,.9,2.6);
    const ds=clamp(pxr/250,.5,3);ctx.setLineDash(rg.dash.map(v=>v*ds));
    ctx.beginPath();let pen=false;
    for(let i=0;i<=SEG;i++){
      const a=i/SEG*6.2832+time*rg.spin, c=Math.cos(a)*rg.R, s=Math.sin(a)*rg.R;
      proj(rg.c[0]+rg.e1[0]*c+rg.e2[0]*s,rg.c[1]+rg.e1[1]*c+rg.e2[1]*s,rg.c[2]+rg.e1[2]*c+rg.e2[2]*s,q1);
      if(q1[2]<nz){pen=false;continue}
      if(pen)ctx.lineTo(q1[0],q1[1]);else{ctx.moveTo(q1[0],q1[1]);pen=true}
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  for(const p of dust){
    proj(p.x,p.y,p.z,q0);const zc=q0[2];
    if(zc<p.d*.012||q0[0]<-60||q0[0]>VW+60||q0[1]<-60||q0[1]>VH+60){p.ok=false;continue}
    const sz=clamp(p.sz/(zc*tanV)*VH*.5,.5,6);
    const al=clamp(sz/1.1)*range(zc,p.d*.012,p.d*.07)*(1-range(zc,p.d*1.4,p.d*2.6))*(.62+.38*Math.sin(time*1.7+p.ph))*fade*.9;
    if(al>.01){
      const dx=q0[0]-p.px,dy=q0[1]-p.py,dl=Math.hypot(dx,dy);
      if(p.ok&&!jump&&dl>1.5){const k=Math.min(1,110/dl);
        ctx.strokeStyle=`rgba(${p.c},${al*.8})`;ctx.lineWidth=sz*1.3;ctx.beginPath();ctx.moveTo(q0[0]-dx*k,q0[1]-dy*k);ctx.lineTo(q0[0],q0[1]);ctx.stroke();
      }else{ctx.fillStyle=`rgba(${p.c},${al})`;ctx.beginPath();ctx.arc(q0[0],q0[1],sz,0,6.2832);ctx.fill()}
    }
    p.px=q0[0];p.py=q0[1];p.ok=true;
  }
}

/* ======================= INTRO 렌더 ======================= */
let lastU=0, flat=false;
const lb=[0,0,0];
function renderIntro(p,time,dt){
  const u=clamp(p/FLIGHT_END);
  flat=reduce||!GL;
  // ----- 화면 요소 -----
  const tOut=range(p,.015,.15);
  iTitle.style.transform=flat?`scale(${1+.15*eOut(tOut)})`:`translateX(${(VW*.05*eIn(tOut)).toFixed(1)}px) scale(${(1+1.25*eIn(tOut)).toFixed(4)})`;
  iTitle.style.opacity=(1-tOut).toFixed(3);
  iTitle.style.filter=tOut>0?`blur(${(10*tOut).toFixed(2)}px)`:'none';
  iTitle.style.visibility=p>.16?'hidden':'visible';
  const ob=(stage.classList.contains('has-gl')?.18:.45)*(1-range(p,.03,.22));
  orbs.forEach(o=>o.style.opacity=ob.toFixed(3));
  if(hintLive)hint.style.opacity=(1-range(p,0,.05)).toFixed(3);
  veil.style.opacity=range(p,.84,.94).toFixed(3);
  copyEls.forEach((el,i)=>{const c=eOut(range(p,.86+i*.03,.95+i*.03));el.style.opacity=c.toFixed(3);el.style.transform=`translateY(${(24*(1-c)).toFixed(1)}px)`;el.style.filter=c<1?`blur(${(6*(1-c)).toFixed(2)}px)`:'none'});

  if(flat){                       // reduced-motion / WebGL 미지원: 회전 없이 느린 직선 접근 + 페이드
    portal.style.opacity=range(p,.12,.6).toFixed(3);
    pScene.style.transform=`scale(${lerp(1.12,1,range(p,.12,FLIGHT_END)).toFixed(4)})`;
    pLabel.style.opacity='0';
    ctx.clearRect(0,0,VW,VH);
    return;
  }
  // ----- 카메라 -----
  camAt(u,time);
  const du=Math.abs(u-lastU); lastU=u;
  speed=lerp(speed,clamp(du/Math.max(dt,.001)*2.2),1-Math.pow(.88,dt*60));
  const jump=du>.05;
  const done=range(p,FLIGHT_END,FLIGHT_END+.035);
  portal.style.opacity=done.toFixed(3);
  pScene.style.transform='none';
  if(done<1)drawGL(u,time);
  drawDepth(u,time,jump);
  // 포털 라벨: 구름 아래로 보이기 시작한 축제 공간을 따라다닌다
  proj(0,0,-9,lb);
  const lo=lb[2]>1?range(u,.5,.56)*(1-range(u,.64,.7)):0;
  pLabel.style.opacity=lo.toFixed(3);
  if(lo>0)pLabel.style.transform=`translate(${clamp(lb[0],110,VW-110).toFixed(1)}px,${clamp(lb[1]+26,60,VH-90).toFixed(1)}px) translateX(-50%)`;
}

/* ======================= SCROLL (원본 방식: 정지점 + 스냅) ======================= */
// 정지점: 출발(하늘) → 멀리 축제 공간이 보이는 지점 → 도착
const HOLDS={'intro':[0,.44,1]};
const HOLD_W={'intro':.07};
const KNOTS={};
for(const id in HOLDS){const H=HOLDS[id],w=HOLD_W[id],mv=1-H.length*w,k=[[0,0]];let pr=0,pm=0;
  H.forEach(h=>{const r0=pr+(h-pm)*mv;k.push([r0,h],[r0+w,h]);pr=r0+w;pm=h});k.push([1,1]);KNOTS[id]=k}
function remap(id,t){const k=KNOTS[id];if(!k)return t;for(let i=1;i<k.length;i++){const [r0,m0]=k[i-1],[r1,m1]=k[i];if(t<=r1)return r1>r0?m0+(m1-m0)*(t-r0)/(r1-r0):m1}return 1}
function unmap(id,m){const k=KNOTS[id];for(let i=1;i<k.length;i++){const [r0,m0]=k[i-1],[r1,m1]=k[i];if(m1>m0&&m<=m1)return r0+(m-m0)/(m1-m0)*(r1-r0)}return 1}
function holdRaw(id,i){const k=KNOTS[id];return (k[1+i*2][0]+k[2+i*2][0])/2}
function holdY(id,i){const el=$('#'+id);return Math.round(el.offsetTop+holdRaw(id,i)*(el.offsetHeight-VH))}
function snapPoints(){const pts=[];for(const id in HOLDS)HOLDS[id].forEach((_,i)=>pts.push({y:holdY(id,i),id,i}));
  return pts.sort((a,b)=>a.y-b.y)}
let anim=null,snapT=0,touching=false,lastSY=scrollY,dir=1,manual=false;
function smoothTo(y,dur){
  if(anim)cancelAnimationFrame(anim.raf);
  const y0=scrollY,dy=y-y0; if(Math.abs(dy)<2){window.scrollTo(0,y);return}
  if(reduce){window.scrollTo(0,y);return}
  dur=dur||clamp(900+Math.abs(dy)/VH*700,1200,3200);const t0=performance.now();anim={};
  const step=t=>{const k=clamp((t-t0)/dur);window.scrollTo(0,y0+dy*eIO(k));if(k<1&&anim)anim.raf=requestAnimationFrame(step);else anim=null};
  anim.raf=requestAnimationFrame(step);
}
const stopAnim=()=>{if(anim){cancelAnimationFrame(anim.raf);anim=null}};
addEventListener('wheel',e=>{if(Math.abs(e.deltaY)>1)dir=e.deltaY>0?1:-1;stopAnim();stopPlay();queueSnap()},{passive:true});
addEventListener('touchstart',e=>{touching=true;stopAnim();stopPlay()},{passive:true});
addEventListener('touchend',()=>{touching=false;queueSnap()},{passive:true});
function nearest(){const pts=snapPoints(),y=scrollY,last=pts[pts.length-1];
  if(y>last.y+4)return null;
  let prev=null,next=null;for(const p of pts){if(p.y<=y+1)prev=p;else{next=p;break}}
  if(!prev)return next; if(!next)return prev;
  const gap=next.y-prev.y, th=Math.min(gap*.18,VH*.15);
  return dir>0?(y-prev.y>th?next:prev):(next.y-y>th?prev:next);
}
function queueSnap(){clearTimeout(snapT);snapT=setTimeout(()=>{
  if(anim||touching||manual||play)return;
  const p=nearest(); if(p&&Math.abs(p.y-scrollY)>3)smoothTo(p.y);},190)}
addEventListener('scroll',()=>{const d=scrollY-lastSY;if(Math.abs(d)>.5)dir=d>0?1:-1;lastSY=scrollY;if(!anim)queueSnap()},{passive:true});
addEventListener('keydown',e=>{
  if(e.target.closest('input,textarea'))return;
  const down=['ArrowDown','PageDown',' '].includes(e.key),up=['ArrowUp','PageUp'].includes(e.key); if(!down&&!up)return;
  const pts=snapPoints(); if(scrollY>pts[pts.length-1].y+4&&down)return;
  const t=down?pts.find(p=>p.y>scrollY+4):[...pts].reverse().find(p=>p.y<scrollY-4); if(!t)return;
  e.preventDefault(); stopPlay(); smoothTo(t.y);
});
function rawOf(el){return clamp((scrollY-el.offsetTop)/(el.offsetHeight-VH))}
function progressOf(el){return remap(el.id,rawOf(el))}
function yOfP(p){const el=intro.el;return el.offsetTop+unmap('intro',p)*(el.offsetHeight-VH)}

/* 자동 재생: 진행도를 시간에 따라 일정하게 올린다 (정지점에서 멈추지 않는 연속 비행 확인용) */
let play=null;
function startPlay(from){stopAnim();const t0=performance.now(),p0=from,dur=11000*(1-p0);
  play={};const step=t=>{if(!play)return;const k=clamp((t-t0)/dur);window.scrollTo(0,yOfP(lerp(p0,1,k)));if(k<1)play.raf=requestAnimationFrame(step);else stopPlay()};
  play.raf=requestAnimationFrame(step);uiPlay()}
function stopPlay(){if(play){cancelAnimationFrame(play.raf);play=null;uiPlay()}}
let uiPlay=()=>{};

/* ======================= LOOP ======================= */
let last=performance.now(), slow=0, fpsA=60, onFrame=()=>{};
function resize(){VW=innerWidth;VH=innerHeight;fitCam();sizeGL();sizeCanvas();buildDepth()}
function frame(now){
  const dt=Math.min(.05,Math.max(.001,(now-last)/1000)); last=now;
  const past=scrollY>intro.el.offsetTop+intro.el.offsetHeight;
  intro.t=progressOf(intro.el);
  const k=reduce?1:1-Math.pow(1-TUNE.damp,dt*60);            // 스크롤 감쇠: 입력이 끊겨도 카메라는 미끄러지듯 따라온다
  intro.p+=(intro.t-intro.p)*k; if(Math.abs(intro.t-intro.p)<.0002)intro.p=intro.t;
  // 프레임이 느리면 렌더 해상도를 낮춘다 (그리기 직전에 바꿔 빈 프레임이 보이지 않게 한다)
  fpsA=lerp(fpsA,1/dt,.05);
  if(GL&&!past&&intro.p<FLIGHT_END){slow=dt>.03?slow+1:Math.max(0,slow-1);if(slow>45&&glScale>.5){glScale*=.8;slow=0;sizeGL()}}
  if(!past)renderIntro(intro.p,now/1000,dt);
  onFrame();
  requestAnimationFrame(frame);
}
addEventListener('resize',resize);
resize();
requestAnimationFrame(frame);


})();
