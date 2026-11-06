// Scripted walkthrough of Catalyst Studio. Layout, labels and icons mirror src/App.tsx.
(function(){
const frame=document.getElementById('simFrame'),stage=document.getElementById('simStage');
const chaptersEl=document.getElementById('simChapters'),replay=document.getElementById('simReplay'),hint=document.getElementById('simHint');
const CH=['Prompt','Plan','Code','Preview','Play'];
const PROMPT='Make a small arcade game. I steer a ship with the mouse, dodge asteroids and collect embers. One HTML file.';
const MODEL='Prism 2.1 (3B)';
const SOURCE=`<!doctype html>
<title>Ember Run</title>
<canvas id="game" width="900" height="520"></canvas>
<script>
const ctx = game.getContext('2d');
const ship = { x: 190, y: 260, vx: 0, vy: 0 };
const rocks = [], embers = [];
let score = 0, lives = 3, mouse = { x: 190, y: 260 };

// The ship chases the pointer with a little weight
addEventListener('pointermove', e => {
  const box = game.getBoundingClientRect();
  mouse.x = (e.clientX - box.left) * 900 / box.width;
  mouse.y = (e.clientY - box.top) * 520 / box.height;
});

function steer(dt) {
  ship.vx += ((mouse.x - ship.x) * 38 - ship.vx * 11) * dt;
  ship.vy += ((mouse.y - ship.y) * 38 - ship.vy * 11) * dt;
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
}

function spawn() {
  if (Math.random() < 0.02) rocks.push({
    x: 970, y: Math.random() * 520,
    r: 20 + Math.random() * 30,
    speed: 150 + Math.random() * 110,
  });
  if (Math.random() < 0.015) embers.push({
    x: 930, y: 40 + Math.random() * 440,
  });
}

function collide() {
  for (const rock of rocks) {
    if (Math.hypot(rock.x - ship.x, rock.y - ship.y) < rock.r + 13) {
      rock.x = -200;
      if (--lives === 0) gameOver();
    }
  }
  for (const ember of embers) {
    if (Math.hypot(ember.x - ship.x, ember.y - ship.y) < 30) {
      ember.x = -99;
      score += 10;
    }
  }
}

let last = 0;
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  spawn();
  steer(dt);
  collide();
  draw(ctx, { ship, rocks, embers, score, lives });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
<\/script>`;

const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function hl(src){
  return esc(src).replace(/(\/\/[^\n]*)|('[^'\n]*'|"[^"\n]*")|\b(const|let|function|for|of|if|return)\b|\b(\d+\.?\d*)\b|(&lt;\/?[a-z!]+)/g,
    (m,c,s,k,n,t)=>c?`<i class="c">${c}</i>`:s?`<i class="s">${s}</i>`:k?`<i class="k">${k}</i>`:n?`<i class="n">${n}</i>`:t?`<i class="t">${t}</i>`:m);
}
const NAV=[['msg','Chat &amp; Code Preview',''],['folder','Workspace',''],['globe','Browser',''],['sparkles','Model Training &amp; RLHF','142'],['brain','Project Memory','5'],['layers','Skills &amp; Rules','6'],['server','MCP Protocol','2']];

stage.innerHTML=`<div class="cw">
<header class="tb"><div class="tb-l"><span class="tb-brand"><svg width="16" height="16"><use href="#mark"/></svg>Catalyst</span>
  <span class="modes"><b>${icon('terminal',12)}Studio</b><span>${icon('sparkles',12)}Personal</span></span>
  <span class="tb-nav"><span>Workspaces</span><span>Skills</span><span>MCP Tools</span><span>Self-Learning</span></span></div>
  <div class="tb-r"><span class="tb-btn on">${icon('chart',12)}Overview</span><span class="tb-btn">${icon('msg',12)}Side Chat</span><span class="win">${icon('minus',13)}${icon('square',11)}${icon('x',13)}</span></div></header>
<div class="cb">
<aside class="sb"><div class="sb-tools"><span>${icon('panel',15)}${icon('folderOpen',15)}</span>${icon('sparkles',15)}</div>
  <div class="sb-new">${icon('plus',15)}New Conversation</div>
  <nav>${NAV.map((n,i)=>`<a class="${i?'':'on'}">${icon(n[0],15)}<span>${n[1]}</span><em>${n[2]}</em></a>`).join('')}</nav>
  <div class="sb-hist"><span>Conversations</span><em data-count>0</em></div>
  <div class="sb-list" data-list><p>No chats in this workspace yet.<br>Send a message below to begin.</p></div>
  <div class="sb-foot"><span>${icon('settings',15)}Settings</span><small>Online</small><span class="res">Resources OK</span></div></aside>
<div class="mn">
  <div class="sc" data-scroll>
    <div class="empty" data-empty><div class="wm"><svg width="76" height="76"><use href="#mark"/></svg></div><h3>What shall Catalyst build today?</h3><p>Running <b>${MODEL}</b> locally on D:\\Games · 1.84 GB VRAM · 190 tok/s</p></div>
    <div class="thread" data-thread>
      <div class="bubble" data-bubble></div>
      <div class="think" data-think><div class="think-h" data-think-h></div><div class="steps" data-steps></div></div>
      <p class="say" data-say></p>
      <div class="block mode-code" data-block>
        <div class="b-h"><div class="b-l">${icon('terminal',13)}<span class="lang">HTML</span><span class="lines" data-lines>0 lines</span><span class="pill" data-pill>Streaming...</span></div>
          <div class="b-r"><div class="tabs"><span class="tab on" data-t="code">${icon('code',12)}Code</span><span class="tab" data-t="prev">${icon('play',12)}Auto-Run Preview</span><span class="tab" data-t="split">${icon('cols',12)}Split</span></div><span class="b-ic">${icon('reload',13)}</span><span class="b-ic">${icon('max',13)}</span></div></div>
        <div class="b-b"><div class="src" data-src><pre data-code></pre></div><div class="pv" data-pv><canvas data-game aria-label="Ember Run, a playable game"></canvas></div></div>
      </div>
    </div>
  </div>
  <div class="dock"><div class="cbox" data-box>
    <div class="c-top"><span>${icon('folderOpen',13)}General Workspace (D:\\)${icon('down',12)}</span></div>
    <div class="c-text" data-text><span class="ph" data-ph>Ask Catalyst to build a playable game, inspect attached files/images, or write systems...</span><span data-typed></span><span class="caret" data-caret></span></div>
    <div class="c-bot"><div><span class="c-plus">${icon('plus',15)}</span><span class="c-model"><b>${MODEL}</b>${icon('down',12)}</span><span class="c-eff"><svg width="13" height="13" viewBox="0 0 13 13"><path d="M1 12V8h2.6v4zM5.2 12V4.6h2.6V12zM9.4 12V1H12v11z" fill="#f97316"/></svg>High${icon('down',12)}</span></div>
      <div><span class="c-pre">${icon('shield',13)}Turbo Autonomous${icon('down',12)}</span><span class="c-send" data-send>${icon('up',15)}</span></div></div>
  </div></div>
</div></div>
<div class="cur" data-cur><svg width="26" height="30" viewBox="0 0 26 30"><path d="M3 2v22l6-5.6 4 9.4 4.3-1.8-4-9.3H22z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg></div>
</div>`;

const $=k=>stage.querySelector(`[data-${k}]`);
const el={};['scroll','empty','thread','bubble','think','think-h','steps','say','block','lines','pill','src','code','pv','game','box','ph','typed','caret','send','cur','list','count'].forEach(k=>el[k]=$(k));
const game=EmberGame(el.game);window.__ember=game;
const tab=n=>stage.querySelector(`.tab[data-t="${n}"]`);

let scale=1,cw=1240,chh=776;
function fit(){
  const w=frame.clientWidth,compact=w<760;
  stage.classList.toggle('compact',compact);
  cw=compact?620:1240;chh=compact?860:776;
  scale=w/cw;stage.style.width=cw+'px';stage.style.height=chh+'px';stage.style.transform=`scale(${scale})`;frame.style.height=chh*scale+'px';
}
fit();addEventListener('resize',fit);

let run=0,visible=false,human=false,bot=false,done=true,started=false;
const STOP={};
async function wait(ms,id){
  await new Promise(r=>setTimeout(r,ms));
  while(!visible&&id===run)await new Promise(r=>setTimeout(r,180));
  if(id!==run)throw STOP;
}
const stageRect=()=>stage.getBoundingClientRect();
function spot(target){
  if(Array.isArray(target))return target;
  const r=target.getBoundingClientRect(),s=stageRect();
  return[(r.left-s.left+r.width/2)/scale,(r.top-s.top+r.height/2)/scale];
}
let cx=cw*.72,cy=chh*.42;
function place(x,y){cx=x;cy=y;el.cur.style.transform=`translate(${x}px,${y}px)`;}
function move(target,ms,id){
  const[x,y]=spot(target),sx=cx,sy=cy,bend=(x-sx)*.12,t0=performance.now();
  return new Promise((res,rej)=>{const f=t=>{if(id!==run)return rej(STOP);
    const p=Math.min(1,(t-t0)/ms),e=p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
    place(sx+(x-sx)*e,sy+(y-sy)*e+Math.sin(p*Math.PI)*bend*.6);p<1?requestAnimationFrame(f):res();};requestAnimationFrame(f);});
}
async function press(node,id){
  el.cur.classList.add('down');node&&node.classList.add('pressed');
  const rip=document.createElement('i');rip.className='rip';rip.style.cssText=`left:${cx+2}px;top:${cy+2}px`;stage.firstChild.appendChild(rip);setTimeout(()=>rip.remove(),520);
  await wait(130,id);el.cur.classList.remove('down');node&&node.classList.remove('pressed');await wait(120,id);
}
function scrollTo(y,ms=520){const s=el.scroll,a=s.scrollTop,t0=performance.now();const f=t=>{const p=Math.min(1,(t-t0)/ms);s.scrollTop=a+(y-a)*(1-Math.pow(1-p,3));if(p<1)requestAnimationFrame(f);};requestAnimationFrame(f);}

function setMode(m){el.block.className='block mode-'+m;stage.querySelectorAll('.tab').forEach(t=>t.classList.toggle('on',t.dataset.t===m));}
function setCode(n){const text=SOURCE.slice(0,n),c=text.split('\n').length;
  el.code.innerHTML=hl(text).split('\n').map((l,i)=>`<span class="ln">${i+1}</span>${l||' '}`).join('\n');
  el.lines.textContent=c+' lines';el.src.scrollTop=el.src.scrollHeight;}
function setThink(open,live,sec){el.think.classList.toggle('open',open);
  el['think-h'].innerHTML=live?`${icon('spin',13,'spin')}<span class="shim">Thinking for ${sec}s</span>`:`<span>Worked for 9s</span><em>${MODEL} · 190 tok/s</em>`;}
const STEPS=['Inspected D:\\Games, folder is empty','Planned game loop, input and collisions','Writing index.html'];
function stepRow(i,state,at){return `<div class="st ${state}">${icon(state==='run'?'spin':'ok',13,state==='run'?'spin':'')}<span>${STEPS[i]}</span><time>+${at}s</time></div>`;}
function chapter(i){[...chaptersEl.children].forEach((c,n)=>{c.classList.toggle('on',n===i);c.classList.toggle('past',n<i);});}

const ALLSTEPS=()=>STEPS.map((_,i)=>stepRow(i,'ok',['0.4','1.6','2.3'][i])).join('');
function base(ch){
  stage.classList.toggle('chat',ch>0);el.typed.textContent=ch===0?'':'';el.ph.style.display='';el.caret.style.display='none';
  el.thread.style.display=ch>0?'block':'none';el.empty.style.display=ch>0?'none':'';
  el.bubble.textContent=PROMPT;el.say.textContent='';el.block.style.display='none';el.think.style.display='none';
  el.pill.style.display='none';setMode('code');setCode(1);el.scroll.scrollTop=0;
  el.list.innerHTML=ch>0?`<a class="on">${icon('msg',13)}Ember Run arcade game</a>`:'<p>No chats in this workspace yet.<br>Send a message below to begin.</p>';
  el.count.textContent=ch>0?1:0;bot=false;game.title();game.paint();game.stop();el.box.classList.remove('focus');
  if(ch>=2){el.think.style.display='block';el.steps.innerHTML=ALLSTEPS();setThink(true,false);el.say.textContent="I'll keep this to one file with a single canvas loop.";el.block.style.display='block';}
  if(ch>=3){setCode(SOURCE.length);setThink(false,false);el.say.textContent='Ember Run is ready. The ship follows your pointer, a rock costs a life, and each ember is worth 10 points.';}
  if(ch>=4){setMode('prev');game.run();el.scroll.scrollTop=el.block.offsetTop-14;}
}

const scenes=[
  async id=>{ // Prompt
    await wait(600,id);await move(el.box,900,id);await press(null,id);
    el.box.classList.add('focus');el.ph.style.display='none';el.caret.style.display='inline-block';
    for(let i=1;i<=PROMPT.length;i++){el.typed.textContent=PROMPT.slice(0,i);await wait(PROMPT[i-1]===' '?34:17,id);}
    await wait(420,id);await move(el.send,620,id);await press(el.send,id);
  },
  async id=>{ // Plan
    base(1);el.think.style.display='block';setThink(true,true,1);el.steps.innerHTML='';await wait(350,id);
    el.steps.innerHTML=stepRow(0,'run','0.4');await wait(620,id);
    el.steps.innerHTML=stepRow(0,'ok','0.4')+stepRow(1,'run','1.6');setThink(true,true,2);await wait(760,id);
    el.steps.innerHTML=stepRow(0,'ok','0.4')+stepRow(1,'ok','1.6')+stepRow(2,'run','2.3');setThink(true,true,3);await wait(420,id);
  },
  async id=>{ // Code
    el.say.textContent="I'll keep this to one file with a single canvas loop.";el.block.style.display='block';el.pill.style.display='';
    scrollTo(el.say.offsetTop-20);
    const total=SOURCE.length,ms=4600,t0=performance.now();let n=0;
    while(n<total){await wait(30,id);n=Math.min(total,Math.max(n+6,((performance.now()-t0)/ms*total)|0));setCode(n);}
    el.pill.style.display='none';el.steps.innerHTML=ALLSTEPS();setThink(true,false);await wait(450,id);
    el.say.textContent='Ember Run is ready. The ship follows your pointer, a rock costs a life, and each ember is worth 10 points.';
    await wait(500,id);
  },
  async id=>{ // Preview
    setThink(false,false);scrollTo(el.say.offsetTop-14);await wait(500,id);
    await move(tab('split'),900,id);await press(tab('split'),id);setMode('split');game.title();game.run();await wait(1500,id);
    await move(tab('prev'),620,id);await press(tab('prev'),id);setMode('prev');scrollTo(el.block.offsetTop-14);await wait(800,id);
  },
  async id=>{ // Play
    const b=game.button,r=el.game.getBoundingClientRect(),s=stageRect(),k=r.width/scale/game.W;
    const ox=(r.left-s.left)/scale,oy=(r.top-s.top)/scale;
    await wait(500,id);await move([ox+(b.x+b.w/2)*k,oy+(b.y+b.h/2)*k],900,id);await press(null,id);game.start();
    bot=true;game.state.lives=3;await wait(26000,id);
  },
];

game.onFrame=()=>{
  if(!bot||human)return;
  const s=game.state,t=game.botTarget();game.aim(t.x,t.y);
  if(s.mode==='over'){game.start();}
  const r=el.game.getBoundingClientRect(),b=stageRect(),k=r.width/scale/game.W;
  const x=(r.left-b.left)/scale+t.x*k,y=(r.top-b.top)/scale+t.y*k;place(cx+(x-cx)*.18,cy+(y-cy)*.18);
};

async function seq(from){
  const id=++run;started=true;human=false;done=false;el.cur.style.display='';frame.classList.remove('human');
  hint.textContent='The game is real: put your pointer on it to take over.';
  try{
    base(from);chapter(from);
    if(from===0)place(cw*.7,chh*.38);
    for(let c=from;c<scenes.length;c++){chapter(c);await scenes[c](id);}
    done=true;seq(0);
  }catch(e){if(e!==STOP)console.error(e);}
}

// Visitor takes the controls
function takeOver(){
  if(human||!(el.block.classList.contains('mode-prev')||el.block.classList.contains('mode-split')))return;
  human=true;bot=false;run++;el.cur.style.display='none';frame.classList.add('human');chapter(4);
  hint.textContent='You have the controls. Replay restarts the walkthrough.';
}
const toGame=e=>{const r=el.game.getBoundingClientRect();return[(e.clientX-r.left)*game.W/r.width,(e.clientY-r.top)*game.H/r.height];};
el.game.addEventListener('pointerenter',takeOver);
el.game.addEventListener('pointermove',e=>{if(human){const[x,y]=toGame(e);game.aim(x,y);}});
el.game.addEventListener('pointerdown',e=>{takeOver();if(human){const[x,y]=toGame(e);game.aim(x,y);game.click();}});

CH.forEach((c,i)=>{const li=document.createElement('li');li.innerHTML=`<button type="button">${c}</button>`;li.firstChild.onclick=()=>seq(i);chaptersEl.appendChild(li);});
replay.onclick=()=>seq(0);
base(0);chapter(0);place(cw*.7,chh*.38);

new IntersectionObserver(e=>{visible=e[0].isIntersecting;
  if(visible&&!started){started=true;seq(0);}
  if(!visible)game.stop();else if(human||bot||el.block.className.includes('prev')||el.block.className.includes('split'))game.run();
},{threshold:.3}).observe(frame);
})();
