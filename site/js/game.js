// Ember Run: the small game built during the Studio walkthrough. Fully playable.
window.EmberGame = function(canvas){
  const W=900,H=520,ctx=canvas.getContext('2d');
  canvas.width=W*2;canvas.height=H*2;
  const rnd=(a,b)=>a+Math.random()*(b-a),TAU=Math.PI*2;
  const off=(w,h,fn)=>{const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'));return c;};

  // Painted scenery, prepared once
  const sky=off(W,H,g=>{
    const l=g.createLinearGradient(0,0,0,H);l.addColorStop(0,'#090a18');l.addColorStop(.6,'#191128');l.addColorStop(1,'#3a1626');g.fillStyle=l;g.fillRect(0,0,W,H);
    for(let i=0;i<46;i++){const x=rnd(0,W),y=rnd(0,H),r=rnd(50,170),c=g.createRadialGradient(x,y,0,x,y,r);
      const hue=Math.random()<.5?'255,110,50':'120,80,210';c.addColorStop(0,`rgba(${hue},${rnd(.02,.06)})`);c.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=c;g.fillRect(x-r,y-r,r*2,r*2);}
  });
  const planet=off(520,320,g=>{
    const x=210,y=160,r=118;
    const halo=g.createRadialGradient(x,y,r*.9,x,y,r*1.3);halo.addColorStop(0,'rgba(255,130,70,.28)');halo.addColorStop(1,'rgba(255,130,70,0)');g.fillStyle=halo;g.fillRect(0,0,520,320);
    const ring=(front)=>{g.save();g.translate(x,y);g.rotate(-.34);g.scale(1,.26);
      for(let i=0;i<30;i++){const R=r*1.32+i*3.1;g.beginPath();g.arc(0,0,R,front?0:Math.PI,front?Math.PI:TAU);g.strokeStyle=`rgba(${230-i*2},${170-i*2},${130-i*2},${(i%7<2?.12:.42)})`;g.lineWidth=2.4;g.stroke();}
      g.restore();};
    ring(false);
    g.save();g.beginPath();g.arc(x,y,r,0,TAU);g.clip();
    const b=g.createLinearGradient(x-r,y-r,x+r,y+r);b.addColorStop(0,'#f6b27c');b.addColorStop(.5,'#b4483c');b.addColorStop(1,'#2d1230');g.fillStyle=b;g.fillRect(0,0,520,320);
    g.translate(x,y);g.rotate(-.34);
    for(let i=0;i<34;i++){const yy=-r+i*7+rnd(-2,2);g.fillStyle=`rgba(${i%3?'60,16,40':'255,200,150'},${rnd(.05,.2)})`;g.fillRect(-r*1.4,yy,r*2.8,rnd(2,8));}
    g.setTransform(1,0,0,1,0,0);
    const sh=g.createRadialGradient(x-44,y-44,r*.2,x-14,y-14,r*1.25);sh.addColorStop(0,'rgba(0,0,0,0)');sh.addColorStop(.72,'rgba(8,4,20,.32)');sh.addColorStop(1,'rgba(8,4,20,.94)');g.fillStyle=sh;g.fillRect(0,0,520,320);
    g.restore();ring(true);
  });
  const rocks=[...Array(6)].map(()=>off(180,180,g=>{
    const n=11,c=90,R=78,pts=[...Array(n)].map((_,i)=>{const a=i/n*TAU,r=R*rnd(.6,1);return[c+Math.cos(a)*r,c+Math.sin(a)*r];});
    const path=()=>{g.beginPath();pts.forEach((p,i)=>{const q=pts[(i+1)%n];i?0:g.moveTo((pts[n-1][0]+p[0])/2,(pts[n-1][1]+p[1])/2);g.quadraticCurveTo(p[0],p[1],(p[0]+q[0])/2,(p[1]+q[1])/2);});g.closePath();};
    path();const f=g.createRadialGradient(c-30,c-34,8,c,c,R*1.2);f.addColorStop(0,'#a8887a');f.addColorStop(.5,'#5d4644');f.addColorStop(1,'#1d1420');g.fillStyle=f;g.fill();
    g.save();path();g.clip();
    for(let i=0;i<60;i++){g.fillStyle=`rgba(${Math.random()<.5?'255,220,190':'10,5,15'},${rnd(.03,.1)})`;g.beginPath();g.arc(rnd(0,180),rnd(0,180),rnd(1,6),0,TAU);g.fill();}
    for(let i=0;i<7;i++){const x=rnd(30,150),y=rnd(30,150),r=rnd(2.5,11);g.fillStyle='rgba(15,8,16,.34)';g.beginPath();g.arc(x,y,r,0,TAU);g.fill();
      g.strokeStyle='rgba(235,200,170,.22)';g.lineWidth=1.2;g.beginPath();g.arc(x+1,y+1,r,.2,2.2);g.stroke();}
    const rim=g.createRadialGradient(c-16,c-18,R*.62,c,c,R*1.05);rim.addColorStop(0,'rgba(0,0,0,0)');rim.addColorStop(1,'rgba(255,120,50,.32)');g.globalCompositeOperation='source-atop';g.fillStyle=rim;g.fillRect(0,0,180,180);g.restore();
  }));
  const starsets=[.2,.5,1].map((sp,i)=>({sp,list:[...Array(70-i*20)].map(()=>({x:rnd(0,W),y:rnd(0,H),r:rnd(.5,1.1+i*.5),a:rnd(.3,.9)}))}));

  const s={mode:'title',t:0,score:0,lives:3,x:190,y:H/2,vx:0,vy:0,tx:190,ty:H/2,rocks:[],embers:[],parts:[],spawn:0,espawn:0,shake:0,hurt:0,pop:0,best:0,planetX:560};
  const G={W,H,state:s,bot:false};

  function reset(){Object.assign(s,{mode:'play',t:0,score:0,lives:3,x:190,y:H/2,vx:0,vy:0,tx:190,ty:H/2,rocks:[],embers:[],parts:[],spawn:1,espawn:.3,shake:0,hurt:0});}
  G.start=reset;
  G.title=()=>{s.mode='title';s.rocks=[];s.embers=[];s.parts=[];};
  G.aim=(x,y)=>{s.tx=x;s.ty=y;};
  G.click=()=>{if(s.mode!=='play')reset();};
  G.button={x:W/2-84,y:H/2+48,w:168,h:48};

  function burst(x,y,n,col,sp=180){for(let i=0;i<n;i++){const a=rnd(0,TAU),v=rnd(.2,1)*sp;s.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:rnd(.3,.8),m:.8,r:rnd(1,3.4),c:col});}}

  // Autopilot used by the walkthrough: favour open water, drift toward embers.
  G.botTarget=()=>{
    let best=s.y,bs=-1e9;
    for(let y=46;y<H-46;y+=22){let v=-Math.abs(y-s.y)*.12-Math.abs(y-H/2)*.05;
      for(const r of s.rocks){const dx=r.x-s.x;if(dx<-70||dx>360)continue;const gap=Math.abs(r.y-y)-r.r-34;if(gap<40)v-=(40-gap)*(5-dx/100);}
      for(const e of s.embers){const dx=e.x-s.x;if(dx<0||dx>300)continue;v+=Math.max(0,60-Math.abs(e.y-y))*.7;}
      if(v>bs){bs=v;best=y;}}
    return{x:200+Math.sin(s.t*.7)*70,y:best};
  };

  function step(dt){
    s.t+=dt;const fast=1+Math.min(s.t/40,1.1);
    s.planetX-=dt*6;if(s.planetX<-540)s.planetX=W+40;
    for(const ss of starsets)for(const p of ss.list){p.x-=ss.sp*70*dt*fast;if(p.x<0)p.x+=W;}
    if(s.mode!=='play'){for(const p of s.parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.l-=dt;}s.parts=s.parts.filter(p=>p.l>0);return;}
    const ax=(s.tx-s.x)*38-s.vx*11,ay=(s.ty-s.y)*38-s.vy*11;s.vx+=ax*dt;s.vy+=ay*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;
    s.x=Math.max(30,Math.min(W-30,s.x));s.y=Math.max(24,Math.min(H-24,s.y));
    for(let i=0;i<2;i++)s.parts.push({x:s.x-26,y:s.y+rnd(-3,3),vx:rnd(-240,-120),vy:rnd(-16,16)+s.vy*.1,l:rnd(.16,.4),m:.4,r:rnd(1.2,3.2),c:Math.random()<.5?'#ffd9a8':'#ff7a2e'});
    s.spawn-=dt;if(s.spawn<=0){s.spawn=rnd(.55,1.15)/fast;const r=rnd(20,50);s.rocks.push({x:W+70,y:rnd(30,H-30),r,v:rnd(150,260)*fast,a:rnd(0,TAU),w:rnd(-1.3,1.3),k:Math.random()*6|0,dy:rnd(-22,22)});}
    s.espawn-=dt;if(s.espawn<=0){s.espawn=rnd(.5,1);s.embers.push({x:W+30,y:rnd(40,H-40),p:rnd(0,TAU)});}
    for(const r of s.rocks){r.x-=r.v*dt;r.y+=r.dy*dt;r.a+=r.w*dt;
      if(s.hurt<=0&&Math.hypot(r.x-s.x,r.y-s.y)<r.r+13){s.lives--;s.hurt=1.6;s.shake=14;burst(s.x,s.y,34,'#ff8a3c',260);burst(r.x,r.y,18,'#b89a8a',170);r.x=-200;
        if(s.lives<=0){s.mode='over';s.best=Math.max(s.best,s.score);burst(s.x,s.y,70,'#ffd9a8',340);}}}
    for(const e of s.embers){e.x-=210*fast*dt;e.p+=dt*4;if(Math.hypot(e.x-s.x,e.y-s.y)<30){e.x=-99;s.score+=10;s.pop=1;burst(s.x+18,e.y,12,'#ffc27a',130);}}
    s.score+=dt*2;
    s.rocks=s.rocks.filter(r=>r.x>-90);s.embers=s.embers.filter(e=>e.x>-40);
    for(const p of s.parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.985;p.l-=dt;}
    s.parts=s.parts.filter(p=>p.l>0);if(s.parts.length>420)s.parts.splice(0,s.parts.length-420);
    s.hurt=Math.max(0,s.hurt-dt);s.shake*=.9;s.pop=Math.max(0,s.pop-dt*3);
  }

  function ship(g){
    g.save();g.translate(s.x,s.y);g.rotate(Math.max(-.5,Math.min(.5,s.vy/520)));
    if(s.hurt>0&&Math.sin(s.t*40)>0)g.globalAlpha=.4;
    const fl=g.createRadialGradient(-30,0,0,-30,0,30);fl.addColorStop(0,'rgba(255,220,170,.9)');fl.addColorStop(1,'rgba(255,110,40,0)');g.fillStyle=fl;g.fillRect(-64,-22,50,44);
    g.fillStyle='#39262a';g.beginPath();g.moveTo(-8,-6);g.lineTo(-26,-25);g.lineTo(-30,-25);g.lineTo(-20,-4);g.closePath();g.fill();g.beginPath();g.moveTo(-8,6);g.lineTo(-26,25);g.lineTo(-30,25);g.lineTo(-20,4);g.closePath();g.fill();
    const hull=g.createLinearGradient(0,-13,0,13);hull.addColorStop(0,'#fff4e6');hull.addColorStop(.5,'#e9b48c');hull.addColorStop(1,'#7c3a24');g.fillStyle=hull;
    g.beginPath();g.moveTo(32,0);g.quadraticCurveTo(10,-14,-22,-10);g.lineTo(-27,0);g.lineTo(-22,10);g.quadraticCurveTo(10,14,32,0);g.fill();
    g.fillStyle='#ff7a2e';g.fillRect(-20,-1.5,30,3);
    const gl=g.createLinearGradient(6,-7,18,5);gl.addColorStop(0,'#c9f0ff');gl.addColorStop(1,'#173052');g.fillStyle=gl;g.beginPath();g.ellipse(9,-2.5,9,4.6,.05,0,TAU);g.fill();
    g.restore();
  }
  function ember(g,e){
    const pul=1+Math.sin(e.p)*.14,gr=g.createRadialGradient(e.x,e.y,0,e.x,e.y,26*pul);gr.addColorStop(0,'rgba(255,190,110,.75)');gr.addColorStop(1,'rgba(255,100,30,0)');g.fillStyle=gr;g.fillRect(e.x-30,e.y-30,60,60);
    g.save();g.translate(e.x,e.y);g.rotate(e.p*.4);g.scale(pul,pul);const f=g.createLinearGradient(0,-13,0,13);f.addColorStop(0,'#fff7ed');f.addColorStop(1,'#f97316');g.fillStyle=f;
    g.beginPath();g.moveTo(0,-13);g.quadraticCurveTo(1.5,-1.5,13,0);g.quadraticCurveTo(1.5,1.5,0,13);g.quadraticCurveTo(-1.5,1.5,-13,0);g.quadraticCurveTo(-1.5,-1.5,0,-13);g.fill();g.restore();
  }
  function btn(g,label){const b=G.button;g.fillStyle='#f97316';g.beginPath();g.roundRect(b.x,b.y,b.w,b.h,8);g.fill();g.fillStyle='#160b05';g.font='600 18px Inter,sans-serif';g.textAlign='center';g.fillText(label,W/2,b.y+30);}

  function render(){
    const g=ctx;g.setTransform(2,0,0,2,0,0);
    g.drawImage(sky,0,0);
    g.save();if(s.shake>.3)g.translate(rnd(-s.shake,s.shake),rnd(-s.shake,s.shake));
    g.drawImage(planet,s.planetX,20);
    for(const ss of starsets){g.fillStyle='#fff';for(const p of ss.list){g.globalAlpha=p.a;g.fillRect(p.x,p.y,p.r*(1+ss.sp*2),p.r);}}g.globalAlpha=1;
    for(const r of s.rocks){g.save();g.translate(r.x,r.y);g.rotate(r.a);const d=r.r*2.3;g.drawImage(rocks[r.k],-d/2,-d/2,d,d);g.restore();}
    for(const e of s.embers)ember(g,e);
    g.globalCompositeOperation='lighter';for(const p of s.parts){g.globalAlpha=Math.min(1,p.l/p.m);g.fillStyle=p.c;g.beginPath();g.arc(p.x,p.y,p.r,0,TAU);g.fill();}g.globalAlpha=1;g.globalCompositeOperation='source-over';
    if(s.mode!=='over')ship(g);
    g.restore();
    if(s.mode==='play'){
      g.textAlign='left';g.fillStyle='#fff7ed';g.font='500 24px "JetBrains Mono",monospace';g.save();g.translate(26,44);g.scale(1+s.pop*.12,1+s.pop*.12);g.fillText(String(Math.floor(s.score)).padStart(5,'0'),0,0);g.restore();
      for(let i=0;i<3;i++){g.fillStyle=i<s.lives?'#f97316':'rgba(255,255,255,.18)';g.beginPath();const x=W-34-i*26,y=34;g.moveTo(x,y-9);g.quadraticCurveTo(x+1,y-1,x+9,y);g.quadraticCurveTo(x+1,y+1,x,y+9);g.quadraticCurveTo(x-1,y+1,x-9,y);g.quadraticCurveTo(x-1,y-1,x,y-9);g.fill();}
    }else{
      g.fillStyle='rgba(8,6,14,.42)';g.fillRect(0,0,W,H);g.textAlign='center';g.fillStyle='#fff7ed';
      g.font='700 62px Archivo,Inter,sans-serif';g.fillText(s.mode==='title'?'Ember Run':'Run over',W/2,H/2-38);
      g.font='400 18px Inter,sans-serif';g.fillStyle='#e9d9c8';g.fillText(s.mode==='title'?'Steer with your pointer. Collect embers. Miss the rocks.':`Score ${Math.floor(s.score)}   Best ${Math.floor(s.best)}`,W/2,H/2+4);
      btn(g,s.mode==='title'?'Start':'Fly again');
    }
  }

  let last=0,live=false;
  const frame=t=>{if(!live)return;requestAnimationFrame(frame);const dt=Math.min(.033,(t-last)/1000||0);last=t;
    if(G.onFrame)G.onFrame(dt);step(dt);render();};
  G.run=()=>{if(live)return;live=true;last=performance.now();requestAnimationFrame(frame);};
  G.stop=()=>{live=false;};
  G.paint=render;
  return G;
};
