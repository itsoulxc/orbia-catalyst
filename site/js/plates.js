// Drawn figures: policy gate traffic, isometric stack, model wireframes.
(function(){
const calm=matchMedia('(prefers-reduced-motion: reduce)').matches;
const seen=(node,fn)=>new IntersectionObserver(e=>fn(e[0].isIntersecting)).observe(node);
function sized(c,h){const dpr=Math.min(devicePixelRatio||1,2),fit=()=>{const r=c.getBoundingClientRect();c.width=r.width*dpr;c.height=r.height*dpr;c._w=r.width;c._h=r.height;c.getContext('2d').setTransform(dpr,0,0,dpr,0,0);};fit();addEventListener('resize',fit);return c.getContext('2d');}

/* Fig. 2 Policy gate. Tool names come from server/agent_runtime.py. */
(function(){
  const c=document.getElementById('gate'),log=document.getElementById('gateLog'),g=sized(c);
  const A=[['workspace.inspect','pass','Listed 41 files'],['workspace.search','pass','12 matches for "collide"'],['git.diff','pass','Read 2 changed files'],['workspace.patch','hold','Approved, 1 replacement applied'],['workspace.verify','hold','Approved, npm test exited 0'],['network.fetch','deny','Refused: allow_network is false']];
  const parts=[];let last=0,next=0,vis=false,i=3;
  const col={pass:'#7fd1a0',hold:'#f9b26b',deny:'#ef6a4c'};
  function add(){const a=A[i++%A.length];parts.push({a,t:0,x:0,y:.5,lane:{pass:.22,hold:.5,deny:.78}[a[1]],held:0,logged:false});}
  function write(a){const li=document.createElement('li');li.className=a[1];li.innerHTML=`<code>${a[0]}</code><span>${a[2]}</span>`;log.prepend(li);while(log.children.length>4)log.lastChild.remove();}
  function draw(t){
    requestAnimationFrame(draw);if(!vis)return;
    const dt=Math.min(.05,(t-last)/1000||0);last=t;next-=dt;if(next<=0){next=1.25;add();}
    const W=c._w,H=c._h,gx=W*.46;g.clearRect(0,0,W,H);
    g.font='500 12.5px "JetBrains Mono",monospace';g.textBaseline='middle';
    const lanes=[['Allowed','pass',.22],['Needs you','hold',.5],['Refused','deny',.78]];
    g.lineWidth=1;
    for(const[,k,l]of lanes){const ly=H*l;g.strokeStyle='rgba(245,239,230,.24)';g.lineWidth=1.4;g.beginPath();g.moveTo(0,H*.5);g.bezierCurveTo(gx*.55,H*.5,gx*.5,ly,gx,ly);k==='deny'?g.lineTo(gx+10,ly):g.lineTo(W,ly);g.stroke();}
    // gate
    g.fillStyle='#16130f';g.strokeStyle='rgba(245,239,230,.3)';g.beginPath();g.roundRect(gx-7,H*.08,14,H*.84,4);g.fill();g.stroke();
    for(const[n,k,l]of lanes){g.fillStyle=col[k];g.beginPath();g.arc(gx,H*l,3.6,0,7);g.fill();g.fillStyle='#a89f91';g.textAlign='right';g.fillText(n,W-4,H*l-14);}
    g.textAlign='left';g.fillStyle='#a89f91';g.fillText('Model',0,H*.5-14);
    for(const p of parts){
      const hold=p.a[1]==='hold',deny=p.a[1]==='deny';
      if(hold&&p.t>.5&&p.held<.8){p.held+=dt;}else p.t+=dt*.3;
      if(deny)p.t=Math.min(p.t,.52);if(deny&&p.t>=.52){p.held+=dt;}
      if((p.t>=.5)&&!p.logged&&(!hold||p.held>=.8)){p.logged=true;write(p.a);}
      const u=Math.min(1,p.t/.5),ly=H*p.lane,e=u*u*(3-2*u);
      const x=p.t<.5?gx*u:gx+(W-gx)*((p.t-.5)/.5),y=p.t<.5?H*.5+(ly-H*.5)*e:ly;
      if(p.t<.5){g.fillStyle='#e6dccd';g.textAlign='left';g.fillText(p.a[0],x+10,y-13);}g.fillStyle=col[p.a[1]];g.shadowColor=col[p.a[1]];g.shadowBlur=12;
      const r=deny&&p.held>0?Math.max(0,4.5-p.held*5):4.5;
      if(r>0){g.beginPath();g.arc(x,y,r,0,7);g.fill();}g.shadowBlur=0;
      if(deny&&p.held>0&&p.held<.5){g.strokeStyle=col.deny;g.globalAlpha=1-p.held*2;g.beginPath();g.arc(x,y,6+p.held*30,0,7);g.stroke();g.globalAlpha=1;}
      if(hold&&p.t>=.5&&p.held<.8){g.strokeStyle=col.hold;g.lineWidth=1.5;g.beginPath();g.arc(x,y,10,-1.57,-1.57+p.held/.8*6.283);g.stroke();g.lineWidth=1;}
    }
    for(let k=parts.length;k--;)if(parts[k].t>1||(parts[k].a[1]==='deny'&&parts[k].held>1))parts.splice(k,1);
  }
  seen(c,v=>vis=v);A.slice(0,3).forEach(write);requestAnimationFrame(draw);
})();

/* Fig. 3 Isometric exploded stack */
(function(){
  const s=document.getElementById('iso'),NS='http://www.w3.org/2000/svg';
  const iso=(x,y,z)=>[320+(x-y)*.866,160+(x+y)*.5-z];
  const pts=a=>a.map(p=>p.join(',')).join(' ');
  const L=[
    {z:0,n:'CPU and GPU',d:'Overload Guard watching',top:'#2a211b',side:'#17110d',draw:chip},
    {z:135,n:'GGUF model',d:'Prism 2.1, 1.84 GB on disk',top:'#3a2013',side:'#1e120b',draw:grid},
    {z:270,n:'Engine',d:'llama.cpp on 127.0.0.1:8008',top:'#2d2a26',side:'#191613',draw:rack},
    {z:405,n:'Catalyst Studio',d:'Chat, preview, workspace',top:'#211e1b',side:'#121110',draw:ui},
    {z:540,n:'Your project',d:'D:\\Games\\ember-run',top:'#c9bea9',side:'#6f6555',draw:files},
  ];
  const A=230,T=22;let h='';
  function plate(l){
    const z=l.z,a=iso(0,0,z),b=iso(A,0,z),c=iso(A,A,z),d=iso(0,A,z),b2=iso(A,0,z-T),c2=iso(A,A,z-T),d2=iso(0,A,z-T);
    h+=`<polygon points="${pts([b,c,c2,b2])}" fill="${l.side}" stroke="rgba(245,239,230,.14)"/>`;
    h+=`<polygon points="${pts([d,c,c2,d2])}" fill="${l.side}" stroke="rgba(245,239,230,.1)" style="filter:brightness(1.35)"/>`;
    h+=`<polygon points="${pts([a,b,c,d])}" fill="${l.top}" stroke="rgba(245,239,230,.26)"/>`;
    l.draw(z);
    const lx=iso(A,0,z);h+=`<line x1="${lx[0]}" y1="${lx[1]}" x2="${lx[0]+34}" y2="${lx[1]}" stroke="rgba(245,239,230,.3)"/>`;
    h+=`<text x="${lx[0]+40}" y="${lx[1]-3}" class="iso-n">${l.n}</text><text x="${lx[0]+40}" y="${lx[1]+15}" class="iso-d">${l.d}</text>`;
  }
  function q(x0,y0,x1,y1,z,fill,extra=''){h+=`<polygon points="${pts([iso(x0,y0,z),iso(x1,y0,z),iso(x1,y1,z),iso(x0,y1,z)])}" fill="${fill}" ${extra}/>`;}
  function chip(z){q(70,70,160,160,z,'#0d0b09','stroke="#f97316" stroke-opacity=".6"');q(92,92,138,138,z,'#f97316','class="iso-pulse"');
    for(let i=0;i<9;i++){const t=26+i*22;q(t,44,t+6,64,z,'#b98a5a');q(t,166,t+6,186,z,'#b98a5a');q(44,t,64,t+6,z,'#b98a5a');q(166,t,186,t+6,z,'#b98a5a');}}
  function grid(z){for(let i=0;i<7;i++)for(let j=0;j<7;j++){const on=(i*3+j*5)%4===0;q(26+i*26,26+j*26,44+i*26,44+j*26,z,on?'#fb923c':'#5a3018',on?`class="iso-tw" style="animation-delay:${(i+j)*.17}s"`:'');}}
  function rack(z){for(let i=0;i<5;i++){q(26,28+i*36,204,54+i*36,z,'#141210','stroke="rgba(245,239,230,.16)"');q(36,37+i*36,46,45+i*36,z,i%2?'#7fd1a0':'#f97316','class="iso-tw" style="animation-delay:'+(i*.4)+'s"');for(let k=0;k<8;k++)q(90+k*12,34+i*36,96+k*12,48+i*36,z,'#3a3430');}}
  function ui(z){q(18,18,212,212,z,'#0d0c0b','stroke="rgba(245,239,230,.2)"');q(18,18,70,212,z,'#131210');q(26,28,62,38,z,'#f97316');for(let i=0;i<6;i++)q(26,50+i*18,62,56+i*18,z,'#3a3430');q(84,160,198,200,z,'#201d1a','stroke="#f97316" stroke-opacity=".5"');q(110,40,172,48,z,'#f5efe6');q(100,58,182,62,z,'#6e675f');}
  function files(z){[[30,34],[92,34],[154,34],[30,110],[92,110]].forEach(([x,y],i)=>{q(x,y,x+48,y+60,z,i===1?'#f97316':'#efe7d8','stroke="#6f6555"');for(let k=0;k<3;k++)q(x+7,y+14+k*12,x+40-k*6,y+18+k*12,z,i===1?'#7c2d12':'#8f8572');});}
  // Data line threading all five layers
  const p0=iso(115,115,0),p1=iso(115,115,540);
  L.forEach(plate);
  h+=`<line x1="${p0[0]}" y1="${p0[1]}" x2="${p1[0]}" y2="${p1[1]}" stroke="#f97316" stroke-opacity=".35" stroke-dasharray="3 7"/>`;
  for(let i=0;i<4;i++)h+=`<circle r="3.4" fill="#ffd9a8"><animate attributeName="cy" from="${p0[1]}" to="${p1[1]}" dur="3.2s" begin="${i*.8}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;1;0" dur="3.2s" begin="${i*.8}s" repeatCount="indefinite"/><set attributeName="cx" to="${p0[0]}"/></circle>`;
  s.setAttribute('viewBox','100 -400 700 810');s.innerHTML=h;
})();

/* Fig. 4 Model wireframes and spec list. Data from models/models_manifest.json. */
(function(){
  const M=[
    {n:'Spark 2.1',p:'1.5B',s:'940 MB',c:'8,192',job:'Fast everyday coding, syntax fixes and small tasks.',rings:1,seg:64},
    {n:'Prism 2.1',p:'3B',s:'1.84 GB',c:'8,192',job:'Daily coding, debugging and multi-file implementation.',rings:2,seg:72},
    {n:'Zenith 2.0',p:'3B',s:'2.01 GB',c:'8,192',job:'Multi-file coding, games and structured reasoning.',rings:3,seg:84},
    {n:'Apex 1.2',p:'7B',s:'4.47 GB',c:'8,192',job:'The largest local coding model, for deep refactors.',rings:4,seg:96,soon:true},
  ];
  const list=document.getElementById('modelList'),cap=document.getElementById('wireCap'),c=document.getElementById('wire'),g=sized(c);
  let cur=1,vis=false,blend=2;
  list.innerHTML=M.map((m,i)=>`<button role="tab" type="button" data-i="${i}"><span class="mn-n">${m.n}${m.soon?'<small>In training</small>':''}</span><span class="mn-j">${m.job}</span><span class="mn-s"><span><b>${m.p}</b>parameters</span><span><b>${m.s}</b>on disk</span><span><b>${m.c}</b>token context</span></span></button>`).join('');
  const pick=i=>{cur=i;[...list.children].forEach((b,n)=>{b.classList.toggle('on',n===i);b.setAttribute('aria-selected',n===i);});cap.textContent=`${M[i].n}, ${M[i].p} parameters. One ring per tier.`;};
  list.addEventListener('click',e=>{const b=e.target.closest('button');if(b)pick(+b.dataset.i);});
  list.addEventListener('pointerover',e=>{const b=e.target.closest('button');if(b)pick(+b.dataset.i);});
  pick(1);
  const rx=(p,a)=>{const[x,y,z]=p,c=Math.cos(a),s=Math.sin(a);return[x,y*c-z*s,y*s+z*c];};
  const ry=(p,a)=>{const[x,y,z]=p,c=Math.cos(a),s=Math.sin(a);return[x*c+z*s,y,-x*s+z*c];};
  const rz=(p,a)=>{const[x,y,z]=p,c=Math.cos(a),s=Math.sin(a);return[x*c-y*s,x*s+y*c,z];};
  const ORB=[[1.15,.56,1.48],[1.15,-.56,1.48],[1.57,.2,1.92],[.45,1.1,2.25]];
  function frame(t){
    requestAnimationFrame(frame);if(!vis&&!calm)return;
    t=calm?4000:t;const T=t/1000,W=c._w,H=c._h,S=Math.min(W,H)/5.1;blend+=(M[cur].rings-blend)*.08;
    g.clearRect(0,0,W,H);g.lineCap='round';
    const yaw=T*.22,pitch=.26;
    const pr=p=>{p=rx(ry(p,yaw),pitch);const f=7/(7-p[2]);return[W/2+p[0]*S*f,H/2+p[1]*S*f,p[2]];};
    // Meridians of the core star
    const star=(u,v)=>{const cu=Math.cos(u),su=Math.sin(u),cv=Math.cos(v),sv=Math.sin(v),e=2.3;const sg=(a)=>Math.sign(a)*Math.pow(Math.abs(a),e);return[sg(cu*cv)*1.02,sg(su*cv)*1.02,sg(sv)*.33];};
    g.lineWidth=.8;
    for(let m=0;m<20;m++){const u=m/20*6.283;g.beginPath();let on=0;for(let k=0;k<=30;k++){const q=pr(star(u,-1.57+k/30*3.14));on?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]);on=1;}g.strokeStyle='rgba(32,22,14,.42)';g.stroke();}
    for(let m=1;m<9;m++){const v=-1.57+m/9*3.14;g.beginPath();for(let k=0;k<=56;k++){const q=pr(star(k/56*6.283,v));k?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]);}g.strokeStyle='rgba(32,22,14,.3)';g.stroke();}
    // Rings, drawn front heavier than back so depth reads without fill
    ORB.forEach((o,ri)=>{const amt=Math.max(0,Math.min(1,blend-ri));if(amt<=.01)return;const seg=120;let prev=null;
      for(let k=0;k<=seg;k++){if(k/seg>amt)break;const a=k/seg*6.283;let p=[Math.cos(a)*o[2],0,Math.sin(a)*o[2]];p=rz(rx(p,o[0]),o[1]);const q=pr(p);
        if(prev){const front=(q[2]+2.4)/4.8;g.strokeStyle=ri%2?`rgba(201,72,14,${.3+front*.7})`:`rgba(32,22,14,${.2+front*.8})`;g.lineWidth=.8+front*1.6;g.beginPath();g.moveTo(prev[0],prev[1]);g.lineTo(q[0],q[1]);g.stroke();}prev=q;}
      if(amt>.98){const a=T*(.5+ri*.13)+ri;let p=[Math.cos(a)*o[2],0,Math.sin(a)*o[2]];p=rz(rx(p,o[0]),o[1]);const q=pr(p);g.fillStyle='#c9480e';g.beginPath();g.arc(q[0],q[1],4.2,0,7);g.fill();}
    });
    // Registration marks
    g.strokeStyle='rgba(32,22,14,.5)';g.lineWidth=1;[[14,14],[W-14,14],[14,H-14],[W-14,H-14]].forEach(([x,y])=>{g.beginPath();g.moveTo(x-7,y);g.lineTo(x+7,y);g.moveTo(x,y-7);g.lineTo(x,y+7);g.stroke();});
  }
  seen(c,v=>vis=v);requestAnimationFrame(frame);
})();
})();
