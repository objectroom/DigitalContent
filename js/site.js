/* 02 WORLD · 03 PROJECTS 화면 연출 — 원본 웹사이트(College-Festival-2031-offline) 스크립트 이식.
   01 인트로는 js/intro.js, 3D 지도와 핀 카드는 js/map.js 가 담당한다.
   제외(확정 결정): SYSTEM 섹션, 카테고리 필터, 제품 상세 화면, 원본 인트로 */
(()=>{
"use strict";
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const range=(p,a,b)=>clamp((p-a)/(b-a));
const eOut=t=>1-Math.pow(1-t,3), eIn=t=>t*t*t, eIO=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const bump=t=>Math.sin(Math.PI*clamp(t));
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
let VW=innerWidth, VH=innerHeight;
let lastScrollY=scrollY, scrollVel=0;

/* ======================= DATA ======================= */
const CHAPTERS=[
  {k:'CH.01',t:'AI가 공간으로 들어오다',d:'2031년, 소형 MCU가 탑재된 AI는 개인 기기와 일상 공간 곳곳에서 작동하기 시작했습니다.',m:'orb',pal:'dusk'},
  {k:'CH.02',t:'공간이 상황을 읽다',d:'벤치와 조명, 길과 무대가 스스로 주변의 소리와 붐빔을 느끼고 지금의 분위기를 이해합니다.',m:'waves',pal:'day'},
  {k:'CH.03',t:'나를 이해하는 AI',d:'AI는 나의 취향과 컨디션을 기억해, 필요한 순간에만 조용히 말을 겁니다.',m:'person',pal:'lav'},
  {k:'CH.04',t:'함께 만드는 일상',d:'개인과 공간, 운영자가 연결되어 모두에게 조금 더 편안한 하루를 함께 만들어 갑니다.',m:'network',pal:'peach'},
];
const WORLD_ART=[
 '<img class="world-art" src="assets/images/team-hero.webp" alt="파스텔빛 대학 축제 입구" decoding="async">',
 '<img class="world-art" src="assets/images/team-chapter-01.webp" alt="축제 부스에 적용된 소형 AI 모듈" decoding="async">',
 '<img class="world-art" src="assets/images/team-chapter-02.webp" alt="주변 상황을 감지하는 캠퍼스 공간" decoding="async">',
 '<img class="world-art" src="assets/images/team-chapter-03.webp" alt="개인 AI와 소통하는 축제 방문객" decoding="async">',
 '<img class="world-art" src="assets/images/team-chapter-04.webp" alt="AI 단말을 활용해 협력하는 방문객과 운영자" decoding="async">',
 '<img class="world-art" src="assets/images/team-environment-01.webp" alt="축제 광장을 걷는 학생들" decoding="async">'];
$('#wcScene').innerHTML=WORLD_ART[5];
/* 02-C 3관점 아이콘: 에셋 파일(icon-person/space/operator.svg) 사용 */
['icon-person','icon-space','icon-operator'].forEach((n,i)=>{const ic=$('#wc'+(3+i)+' .ic');if(ic)ic.innerHTML=`<img src="assets/images/${n}.svg" width="26" height="26" alt="">`});

/* ======================= WORLD A ======================= */
const stack=$('#stack'), chList=$('#chapters');
CHAPTERS.forEach((c,i)=>{
  stack.insertAdjacentHTML('beforeend',`<article class="wcard" aria-hidden="${i?'true':'false'}"><div class="img">${WORLD_ART[i+1]}</div><div class="txt"><small>${c.k}</small><h3>${c.t}</h3><p>${c.d}</p></div></article>`);
  chList.insertAdjacentHTML('beforeend',`<li><button data-ch="${i}"><em>${c.k}</em><b>${c.t}</b></button></li>`);
});
const wcards=$$('.wcard'), chBtns=$$('#chapters button'), counter=$('#counter'), wvbar=$('#wvbar');
const worldA={el:$('#world-a'),p:0,t:0,act:-1};
function renderWorldA(p){
  const s=clamp((p-.06)/.82)*3;
  wcards.forEach((c,k)=>{const d=k-s;
    if(d<0){const a=clamp(-d);c.style.transform=`perspective(1400px) translateY(${(-115*eIn(a)).toFixed(2)}%) rotateX(${(26*eIn(a)).toFixed(2)}deg) rotate(${(-6*a).toFixed(2)}deg) scale(${(1-.08*a).toFixed(4)})`;c.style.filter=a>0.02?`blur(${(5*eIn(a)).toFixed(2)}px)`:'';c.style.opacity=(1-eIn(a)).toFixed(3)}
    else{c.style.filter=d>0.02?`saturate(${(1-.25*clamp(d)).toFixed(3)})`:'';c.style.transform=`translateY(${(d*22).toFixed(1)}px) scale(${(1-.05*d).toFixed(4)})`;c.style.opacity=(d<=2?1:clamp(3-d)).toFixed(3)}
    c.style.zIndex=10-k;const tx=c.querySelector('.txt');if(tx)tx.style.opacity=(d<0?1-clamp(-d*1.6):1-clamp(d*1.4)).toFixed(3);
  });
  const act=Math.min(3,Math.round(s));
  if(act!==worldA.act){worldA.act=act;chBtns.forEach((b,i)=>b.classList.toggle('on',i===act));wcards.forEach((c,i)=>c.setAttribute('aria-hidden',i===act?'false':'true'));counter.innerHTML=`<b>0${act+1}</b> / 04`}
  wvbar.style.height=(s/3*100).toFixed(2)+'%';
}
chBtns.forEach(b=>b.addEventListener('click',()=>{const i=+b.dataset.ch;const el=worldA.el;const top=el.offsetTop, h=el.offsetHeight-VH;scrollToY(holdY('world-a',i))}));

/* ======================= WORLD C ======================= */
const worldC={el:$('#world-c'),p:0,t:0};
const wcEls=[0,1,2,3,4,5,6].map(i=>$('#wc'+i)), wcScene=$('#wcScene'), wcbar=$('#wcbar');
function renderWorldC(p){
  wcScene.style.transform=`scale(${(1.12-.12*p).toFixed(4)}) translateY(${(-2*p).toFixed(2)}%)`;
  const marks=[[0,.12],[.04,.16],[.12,.24],[.26,.38],[.36,.48],[.46,.58],[.55,.65]];
  wcEls.forEach((el,i)=>{const c=eOut(range(p,...marks[i]));el.style.opacity=c.toFixed(3);el.style.transform=`translateY(${(24*(1-c)).toFixed(1)}px)`;el.style.filter=c<1?`blur(${(6*(1-c)).toFixed(2)}px)`:'none'});
  wcbar.style.width=(range(p,.6,.97)*100).toFixed(2)+'%';
}

/* ======================= NAV / SCROLL ======================= */
const intro={el:$('#intro')};
const introEnd=()=>intro.el.offsetTop+intro.el.offsetHeight-VH;
const nav=$('#nav'), dots=$('#dots');
const secOrder=['intro','world-a','projects'];
function scrollToY(y){smoothTo(y)}
function goTo(id){const el=$('#'+id); let y=HOLDS[id]?holdY(id,0):el.offsetTop; if(id==='intro')y=0; scrollToY(y)}
$$('[data-go]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();goTo(a.dataset.go)}));
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.15});
$$('main .reveal').forEach(el=>io.observe(el));

/* ======================= SCROLL PAUSES + SNAP ======================= */
// mapped progress values where the scene should rest (content fully shown)
const HOLDS={'world-a':[.06,.3333,.6067,.88],'world-c':[.7]};   // 원본 값. intro 정지점은 js/intro.js, system 제외
const HOLD_W={'world-a':.12,'world-c':.22};   // raw share of the section each pause takes
const KNOTS={};
for(const id in HOLDS){const H=HOLDS[id],w=HOLD_W[id],mv=1-H.length*w,k=[[0,0]];let pr=0,pm=0;
  H.forEach(h=>{const r0=pr+(h-pm)*mv;k.push([r0,h],[r0+w,h]);pr=r0+w;pm=h});k.push([1,1]);KNOTS[id]=k}
function remap(id,t){const k=KNOTS[id];if(!k)return t;for(let i=1;i<k.length;i++){const [r0,m0]=k[i-1],[r1,m1]=k[i];if(t<=r1)return r1>r0?m0+(m1-m0)*(t-r0)/(r1-r0):m1}return 1}
function holdRaw(id,i){const k=KNOTS[id];return (k[1+i*2][0]+k[2+i*2][0])/2}
function holdY(id,i){const el=$('#'+id);return Math.round(el.offsetTop+holdRaw(id,i)*(el.offsetHeight-VH))}
function snapPoints(){const pts=[{y:introEnd(),id:'intro',i:-1}];for(const id in HOLDS)HOLDS[id].forEach((_,i)=>pts.push({y:holdY(id,i),id,i}));
  pts.push({y:$('#projects').offsetTop,id:'projects',i:0});return pts.sort((a,b)=>a.y-b.y)}
let anim=null,snapT=0,touching=false,lastSY=scrollY,dir=1;
function smoothTo(y,dur){
  if(anim)cancelAnimationFrame(anim.raf);
  const y0=scrollY,dy=y-y0; if(Math.abs(dy)<2){window.scrollTo(0,y);return}
  if(reduce){window.scrollTo(0,y);return}
  dur=dur||clamp(500+Math.abs(dy)/VH*160,650,1500);const t0=performance.now();anim={};
  const step=t=>{const k=clamp((t-t0)/dur);window.scrollTo(0,y0+dy*eIO(k));if(k<1&&anim)anim.raf=requestAnimationFrame(step);else anim=null};
  anim.raf=requestAnimationFrame(step);
}
const stopAnim=()=>{if(anim){cancelAnimationFrame(anim.raf);anim=null}};
addEventListener('wheel',e=>{if(Math.abs(e.deltaY)>1)dir=e.deltaY>0?1:-1;stopAnim();queueSnap()},{passive:true});
addEventListener('touchstart',()=>{touching=true;stopAnim()},{passive:true});
addEventListener('touchend',()=>{touching=false;queueSnap()},{passive:true});
function nearest(){const pts=snapPoints(),y=scrollY,last=pts[pts.length-1];
  if(y<introEnd()-4)return null;                     // 인트로 안: js/intro.js 가 담당
  if(y>last.y+4)return null;                         // below the map: free scrolling
  let prev=null,next=null;for(const p of pts){if(p.y<=y+1)prev=p;else{next=p;break}}
  if(!prev)return next; if(!next)return prev;
  const gap=next.y-prev.y, th=Math.min(gap*.18,VH*.15);
  return dir>0?(y-prev.y>th?next:prev):(next.y-y>th?prev:next);
}
function queueSnap(){clearTimeout(snapT);snapT=setTimeout(()=>{
  if(anim||touching)return;
  const p=nearest(); if(p&&Math.abs(p.y-scrollY)>3)smoothTo(p.y);},190)}
addEventListener('scroll',()=>{const d=scrollY-lastSY;if(Math.abs(d)>.5)dir=d>0?1:-1;lastSY=scrollY;if(!anim)queueSnap()},{passive:true});
addEventListener('keydown',e=>{
  if(e.target.closest('input,textarea'))return;
  const down=['ArrowDown','PageDown',' '].includes(e.key),up=['ArrowUp','PageUp'].includes(e.key); if(!down&&!up)return;
  if(scrollY<introEnd()-4||(up&&scrollY<=introEnd()+4))return;   // 인트로 구간은 js/intro.js
  const pts=snapPoints(),y=anim?anim.target??scrollY:scrollY; if(y>pts[pts.length-1].y+4&&down)return;
  const t=down?pts.find(p=>p.y>scrollY+4):[...pts].reverse().find(p=>p.y<scrollY-4); if(!t)return;
  e.preventDefault(); smoothTo(t.y);
});
// small step indicator for the pinned scene in view
const holdbar=document.createElement('div');holdbar.className='holdbar';holdbar.setAttribute('aria-hidden','true');document.body.appendChild(holdbar);
let hbKey='';
function tickHoldbar(){
  let cur=null;for(const id in HOLDS){const el=$('#'+id);if(scrollY>=el.offsetTop-2&&scrollY<=el.offsetTop+el.offsetHeight-VH+2)cur=id}
  const show=!!cur&&HOLDS[cur].length>1&&cur!=='intro'; holdbar.classList.toggle('show',show); if(!show)return;
  const pts=HOLDS[cur].map((_,i)=>holdY(cur,i)); let a=0;pts.forEach((y,i)=>{if(scrollY>=y-VH*.35)a=i});
  const key=cur+pts.length; if(key!==hbKey){hbKey=key;holdbar.innerHTML=pts.map(()=>'<i></i>').join('')}
  [...holdbar.children].forEach((x,i)=>x.classList.toggle('on',i===a));
}
const scenes=[[worldA,renderWorldA],[worldC,renderWorldC]];
function progressOf(el){const top=el.offsetTop, h=el.offsetHeight-VH;return remap(el.id,clamp((scrollY-top)/h))}
function updateChrome(){
  const y=scrollY+VH*.45; let cur=0;
  secOrder.forEach((id,i)=>{const el=$('#'+id);if(el.offsetTop<=y)cur=i});
  const iy=scrollY-intro.el.offsetTop, ih=intro.el.offsetHeight-VH;
  const show=iy>ih*.8;
  nav.classList.add('show'); dots.classList.toggle('show',show);
  nav.classList.toggle('glass',scrollY>intro.el.offsetHeight-VH*1.05);
  $$('.dots button').forEach((b,i)=>b.classList.toggle('on',i===cur));
  $$('.nav a[data-sec]').forEach(a=>a.classList.toggle('on',a.dataset.sec===secOrder[cur].replace('-a','')));
}

function loop(){
  scrollVel=lerp(scrollVel,Math.abs(scrollY-lastScrollY),.2); lastScrollY=scrollY;
  for(const [s,fn] of scenes){
    s.t=progressOf(s.el);
    const near=Math.abs(s.t-s.p)>.0004;
    if(near){s.p=reduce?s.t:lerp(s.p,s.t,.14);fn(s.p)}
    else if(s.p!==s.t){s.p=s.t;fn(s.p)}
  }
  updateChrome(); tickHoldbar();
  requestAnimationFrame(loop);
}
function onResize(){VW=innerWidth;VH=innerHeight;scenes.forEach(([s,fn])=>fn(s.p))}
addEventListener('resize',onResize);
onResize(); scenes.forEach(([s,fn])=>{s.t=s.p=progressOf(s.el);fn(s.p)});
requestAnimationFrame(loop);

/* ======================= ENHANCED MOTION LAYER ======================= */
const FINE=matchMedia('(pointer:fine)').matches;
let PX=VW/2, PY=VH*.45, pIn=false, pDown=false;
const fxm={x:0,y:0};
addEventListener('pointermove',e=>{PX=e.clientX;PY=e.clientY;pIn=true},{passive:true});
document.addEventListener('pointerleave',()=>{pIn=false});
addEventListener('blur',()=>{pIn=false});
const mstage=$('#mapStage');

/* ---------- 3. Cursor follower ---------- */
const cur=document.createElement('div');cur.id='cur';cur.innerHTML='<span></span>';
const curDot=document.createElement('div');curDot.id='curDot';
const sprog=document.createElement('div');sprog.id='sprog';
document.body.append(sprog,cur,curDot);
const curSpan=cur.firstChild; const cc={x:PX,y:PY};
const CLICKABLE='a,button,[role="button"],.pin';
addEventListener('pointerdown',()=>{pDown=true;cur.classList.add('down')});
addEventListener('pointerup',()=>{pDown=false;cur.classList.remove('down')});
function cursorState(t){
  if(!t||!t.closest)return['',''];
  if(t.closest('.pin'))return['lbl','OPEN'];
  if(t.closest('.gallery button'))return['lbl','VIEW'];
  if(t.closest(CLICKABLE))return['big',''];
  if(t.closest('.map-stage'))return['lbl',mstage.classList.contains('drag')?'·  ·':'DRAG'];
  if(t.closest('.steps'))return['lbl','SWIPE'];
  return['',''];
}
let curTarget=null;
addEventListener('pointerover',e=>{curTarget=e.target},{passive:true});
function tickCursor(){
  if(reduce||!FINE)return;
  cur.classList.toggle('on',pIn); curDot.classList.toggle('on',pIn);
  cc.x=lerp(cc.x,PX,.2); cc.y=lerp(cc.y,PY,.2);
  cur.style.transform=`translate3d(${cc.x.toFixed(1)}px,${cc.y.toFixed(1)}px,0)`;
  curDot.style.transform=`translate3d(${PX}px,${PY}px,0)`;
  const [cls,txt]=cursorState(curTarget);
  cur.classList.toggle('big',cls==='big'); cur.classList.toggle('lbl',cls==='lbl');
  if(curSpan.textContent!==txt)curSpan.textContent=txt;
}

/* ---------- 4. Magnetic buttons ---------- */
const MAG='.btn,.nav ul a,.logo,.map-ctrl button,.dots button,.to-system .row button';
const mags=new Map(); let magEl=null;
addEventListener('pointermove',e=>{magEl=FINE&&e.target.closest?e.target.closest(MAG):null},{passive:true});
function tickMag(){
  if(reduce)return;
  if(magEl&&!mags.has(magEl))mags.set(magEl,{x:0,y:0});
  mags.forEach((m,el)=>{let tx=0,ty=0;
    if(el===magEl&&pIn){const r=el.getBoundingClientRect();const k=el.matches('.dots button')?.5:el.matches('.btn')?.3:.22;
      tx=(PX-(r.left+r.width/2-m.x))*k; ty=(PY-(r.top+r.height/2-m.y))*k; const lim=el.matches('.btn')?14:8; tx=clamp(tx,-lim,lim); ty=clamp(ty,-lim,lim)}
    m.x=lerp(m.x,tx,.18); m.y=lerp(m.y,ty,.18);
    if(el!==magEl&&Math.abs(m.x)+Math.abs(m.y)<.05){el.style.translate='';mags.delete(el);return}
    el.style.translate=`${m.x.toFixed(2)}px ${m.y.toFixed(2)}px`});
}

/* ---------- 5. Ripple on press ---------- */
addEventListener('pointerdown',e=>{
  if(reduce)return; const b=e.target.closest&&e.target.closest('.btn,.filters button,.map-ctrl button'); if(!b)return;
  const r=b.getBoundingClientRect(), s=document.createElement('span'); s.className='rpl';
  s.style.left=(e.clientX-r.left)+'px'; s.style.top=(e.clientY-r.top)+'px'; s.style.setProperty('--s',(Math.hypot(r.width,r.height)/6).toFixed(1));
  b.appendChild(s); s.addEventListener('animationend',()=>s.remove());
});

/* ---------- 6. 3D tilt + glare ---------- */
const TILT='.stack,.step,.gallery button,.ov .img,.design-vis,.pcard .vis';
let tiltEl=null;
function resetTilt(el){el.classList.remove('tilting');el.style.setProperty('--rx','0deg');el.style.setProperty('--ry','0deg')}
addEventListener('pointermove',e=>{
  if(reduce||!FINE)return; const el=e.target.closest?e.target.closest(TILT):null;
  if(el!==tiltEl){if(tiltEl)resetTilt(tiltEl);tiltEl=el}
  if(!el)return; el.classList.add('glare','tilting');
  const r=el.getBoundingClientRect(), x=clamp((e.clientX-r.left)/r.width), y=clamp((e.clientY-r.top)/r.height);
  const amt=el.matches('.stack')?7:el.matches('.design-vis')?6:9;
  el.style.setProperty('--rx',((.5-y)*amt).toFixed(2)+'deg'); el.style.setProperty('--ry',((x-.5)*amt*1.25).toFixed(2)+'deg');
  el.style.setProperty('--mx',(x*100).toFixed(1)+'%'); el.style.setProperty('--my',(y*100).toFixed(1)+'%');
},{passive:true});
document.addEventListener('pointerleave',()=>{if(tiltEl){resetTilt(tiltEl);tiltEl=null}});

/* ---------- 7. Staggered reveals + label decode ---------- */
function stagger(el){
  const sib=[...el.parentNode.children].filter(x=>x.classList.contains('reveal')); const i=sib.indexOf(el);
  if(i>0&&!reduce){el.style.transitionDelay=(i*.09).toFixed(2)+'s';
    el.addEventListener('transitionend',function clr(ev){if(ev.target===el&&ev.propertyName==='opacity'){el.style.transitionDelay='';el.removeEventListener('transitionend',clr)}})}
}
$$('main .reveal').forEach(stagger);
const GLY='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/*+';
function scramble(el){
  if(reduce)return; const o=el.dataset.txt??(el.dataset.txt=el.textContent); const tok=(el._tok||0)+1; el._tok=tok; let f=0;
  (function step(){if(el._tok!==tok)return; f++; const rev=f/20*o.length;
    el.textContent=[...o].map((c,i)=>i<rev||!/[A-Z0-9]/.test(c)?c:GLY[(Math.random()*GLY.length)|0]).join('');
    if(rev<o.length)requestAnimationFrame(step); else el.textContent=o})();
}
const lio=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){setTimeout(()=>scramble(e.target),180);lio.unobserve(e.target)}}),{threshold:.6});
$$('main .label').forEach(el=>{if(/[A-Z]/.test(el.textContent)&&!el.children.length)lio.observe(el)});
$$('.nav ul a').forEach(a=>a.addEventListener('pointerenter',()=>scramble(a)));

/* ---------- 8. World A: card depth + image drift ---------- */
const wImgs=wcards.map(c=>c.querySelector('.world-art'));
function tickWorldImgs(){
  if(reduce)return; const s=clamp((worldA.p-.06)/.82)*3;
  wImgs.forEach((im,k)=>{if(!im)return;const d=k-s;
    im.style.transform=`scale(${(1.04+.12*clamp(Math.abs(d))).toFixed(4)}) translate(${(fxm.x*-10).toFixed(1)}px,${(d*4+fxm.y*-8).toFixed(1)}px)`});
}
const wcImg=$('#wcScene .world-art');

/* ---------- 10. Velocity skew on scrolling copy ---------- */
const skewEls=$$('.wa-left,.wc-right,.sys-inner .h-main'); let sv=0, lastY=scrollY;
function tickSkew(){
  if(reduce)return; sv=lerp(sv,scrollY-lastY,.12); lastY=scrollY;
  const k=clamp(sv*.045,-2.2,2.2); skewEls.forEach(el=>el.style.transform=Math.abs(k)<.01?'':`skewY(${(-k).toFixed(3)}deg)`);
}

/* ---------- master fx loop ---------- */
function fxLoop(now){
  const tx=pIn?PX/VW-.5:0, ty=pIn?PY/VH-.5:0; fxm.x=lerp(fxm.x,tx,.07); fxm.y=lerp(fxm.y,ty,.07);
  tickCursor(); tickMag();
  tickWorldImgs(); tickSkew();
  if(wcImg&&!reduce)wcImg.style.translate=`${(fxm.x*-22).toFixed(1)}px ${(fxm.y*-14).toFixed(1)}px`;
  const H=document.documentElement.scrollHeight-VH; sprog.style.transform=`scaleX(${(H>0?scrollY/H:0).toFixed(4)})`;
  requestAnimationFrame(fxLoop);
}
requestAnimationFrame(fxLoop);
})();
