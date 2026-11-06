// Real-time renders: the hero gyroscope and the closing planet limb.
(function(){
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

function shader(canvas, fs, opts){
  const gl = canvas.getContext('webgl',{antialias:false,alpha:false,powerPreference:'high-performance'});
  if(!gl) { canvas.classList.add('nogl'); return null; }
  const mk=(t,s)=>{const h=gl.createShader(t);gl.shaderSource(h,s);gl.compileShader(h);
    if(!gl.getShaderParameter(h,gl.COMPILE_STATUS))console.error(gl.getShaderInfoLog(h));return h;};
  const pr=gl.createProgram();gl.attachShader(pr,mk(gl.VERTEX_SHADER,VS));gl.attachShader(pr,mk(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pr);gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const a=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
  const U=n=>gl.getUniformLocation(pr,n);
  const s={gl,U,scale:opts.scale,visible:true,slow:0,last:0};
  const resize=()=>{const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.5)*s.scale;
    canvas.width=Math.max(2,r.width*d|0);canvas.height=Math.max(2,r.height*d|0);gl.viewport(0,0,canvas.width,canvas.height);};
  s.resize=resize;resize();addEventListener('resize',resize);
  new IntersectionObserver(e=>{s.visible=e[0].isIntersecting;}).observe(canvas);
  const draw=t=>{gl.uniform2f(U('R'),canvas.width,canvas.height);gl.uniform1f(U('T'),t);opts.frame&&opts.frame(gl,U);gl.drawArrays(gl.TRIANGLES,0,3);};
  const loop=t=>{
    requestAnimationFrame(loop);
    if(!s.visible||document.hidden)return;
    const dt=t-s.last;s.last=t;draw(t/1000);
    // Step resolution down on slow GPUs rather than dropping frames.
    if(dt>0&&dt<400){s.slow=dt>34?s.slow+1:Math.max(0,s.slow-1);if(s.slow>14&&s.scale>.42){s.scale*=.78;s.slow=0;resize();}}
  };
  if(calm)draw(12);else requestAnimationFrame(loop);
  return s;
}

const GYRO=`precision highp float;uniform vec2 R,M,O;uniform float T,S,F;
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float hash(vec2 p){return fract(sin(dot(p,vec2(41.3,289.1)))*43758.5453);}
float ring(vec3 p,float R0,float w,float h){vec2 q=vec2(length(p.xz)-R0,p.y);q=abs(q)-vec2(w,h);return length(max(q,0.))+min(max(q.x,q.y),0.)-.006;}
float star(vec3 p){vec3 a=pow(abs(p*vec3(1.,1.,2.5))+.0001,vec3(.64));float k=a.x+a.y+a.z;return (pow(k,1./.64)-1.04)*.1;}
vec2 map(vec3 p){
  vec3 q=p;q.xz*=rot(.22*sin(T*.21)+S*.7);q.yz*=rot(.12*cos(T*.17));
  float d=star(q);float id=1.;
  float c=length(q)-.145;if(c<d){d=c;id=2.;}
  float ch=max(abs(length(q.xy)-.175)-.012,abs(q.z)-.17);if(ch<d){d=ch;id=4.;}
  vec3 a=q;a.xy*=rot(.56);a.yz*=rot(.44);
  float r=ring(a,1.48,.02,.034);if(r<d){d=r;id=3.;}
  vec3 b=q;b.xy*=rot(-.56);b.yz*=rot(.44);float gB=atan(b.z,b.x)-T*.38;
  r=ring(b,1.48,.018,.03);r=max(r,-(abs(fract(gB/6.2832*3.)-.5)-.44)*1.2);if(r<d){d=r;id=3.;}
  vec3 o=q;o.xy*=rot(T*.04);o.yz*=rot(1.5708+.32*sin(T*.13)+S*1.2);float gC=atan(o.z,o.x);
  r=ring(o,1.92,.014,.055);r=max(r,(.05-abs(fract(gC/6.2832*6.)-.5))*.95);if(r<d){d=r;id=5.;}
  vec3 n1=a-vec3(cos(T*.5)*1.48,0.,-sin(T*.5)*1.48);r=length(n1)-.058;if(r<d){d=r;id=6.;}
  vec3 n2=b-vec3(cos(-T*.38+2.)*1.48,0.,-sin(-T*.38+2.)*1.48);r=length(n2)-.044;if(r<d){d=r;id=6.;}
  return vec2(d,id);}
vec3 nrm(vec3 p){vec2 e=vec2(.0012,-.0012);return normalize(e.xyy*map(p+e.xyy).x+e.yyx*map(p+e.yyx).x+e.yxy*map(p+e.yxy).x+e.xxx*map(p+e.xxx).x);}
vec3 env(vec3 d){
  float u=d.y*.5+.5;vec3 c=mix(vec3(.012,.009,.008),vec3(.05,.035,.03),u*u);
  float top=smoothstep(.55,.95,d.y)*smoothstep(1.,.2,abs(d.x+.25));c+=vec3(1.5,1.32,1.12)*top;
  float strip=smoothstep(.1,.0,abs(d.x-.78))*smoothstep(.75,.3,abs(d.y-.1));c+=vec3(1.4,.62,.22)*strip*1.3;
  float low=smoothstep(-.35,-.95,d.y);c+=vec3(.75,.2,.04)*low*.8;
  float back=smoothstep(.1,.0,abs(d.y+.08))*smoothstep(-.1,.9,-d.z);c+=vec3(.35,.2,.14)*back;
  return c;}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;uv-=O;
  vec3 ro=vec3(0.,0.,6.6),rd=normalize(vec3(uv,-F));
  ro.yz*=rot(M.y*.16-.08);rd.yz*=rot(M.y*.16-.08);ro.xz*=rot(M.x*.22);rd.xz*=rot(M.x*.22);
  float v=length(uv+O*.6);
  vec3 col=mix(vec3(.011,.0072,.0055),vec3(.0033,.0029,.0026),smoothstep(.0,.95,v));
  vec2 st=gl_FragCoord.xy/R.y*260.;float sh=hash(floor(st));
  if(sh>.9965)col+=vec3(1.,.82,.66)*smoothstep(.42,.0,length(fract(st)-.5))*(.25+.5*fract(sh*91.));
  float b=dot(ro,rd),disc=b*b-dot(ro,ro)+6.1;float glow=0.;
  if(disc>0.){
    float t=-b-sqrt(disc),tmax=-b+sqrt(disc),id=0.;
    for(int i=0;i<96;i++){vec3 pp=ro+rd*t;vec2 h=map(pp);if(h.x<.0012){id=h.y;break;}
      glow+=.012/(1.+abs(star(pp))*90.);t+=h.x*.85;if(t>tmax)break;}
    if(id>.5){
      vec3 p=ro+rd*t,n=nrm(p),r=reflect(rd,n);float f=pow(1.-max(dot(n,-rd),0.),5.);
      float ao=clamp(.35+map(p+n*.12).x/.12*.65,.0,1.);vec3 s;
      if(id<1.5){float y=smoothstep(-1.,1.,p.y);vec3 F=mix(vec3(.85,.28,.07),vec3(1.,.68,.42),y);s=env(r)*mix(F,vec3(1.),f)*1.5+F*.035;
        s+=vec3(1.,.36,.08)*pow(max(1.-length(p.xy)/1.05,0.),3.)*.38;}
      else if(id<2.5){s=env(r)*(.05+f*.95);s+=vec3(.9,.28,.05)*pow(max(dot(n,-rd),0.),30.)*.12;}
      else if(id<3.5){vec3 F=vec3(.92,.62,.4);s=env(r)*mix(F,vec3(1.),f)*1.1;}
      else if(id<4.5){s=env(r)*vec3(1.,.82,.66)*1.6;}
      else if(id<5.5){vec3 F=vec3(.42,.33,.28);s=env(r)*mix(F,vec3(1.),f)*1.05;}
      else{s=vec3(1.5,.68,.22)+env(r)*.6;}
      col=s*ao;
    }
  }
  col+=vec3(1.,.36,.09)*glow*.55;
  col=col/(1.+col*.32);col=pow(col,vec3(.4545));
  col+=(hash(gl_FragCoord.xy+T)-.5)*.022;
  gl_FragColor=vec4(col,1.);}`;

const LIMB=`precision highp float;uniform vec2 R;uniform float T;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n(p);p*=2.03;a*=.5;}return s;}
void main(){vec2 uv=(gl_FragCoord.xy-vec2(.5,0.)*R)/R.y;
  float rad=2.4;vec2 c=vec2(.12,-rad+.27);float d=length(uv-c)-rad;
  vec3 col=vec3(.043,.038,.034);
  vec2 st=gl_FragCoord.xy/R.y*220.;float hs=h(floor(st));if(hs>.992&&d>.03)col+=vec3(.9,.8,.7)*smoothstep(.4,.0,length(fract(st)-.5))*hs*.6;
  float rim=exp(-max(d,0.)*16.)*.95+exp(-max(d,0.)*4.5)*.2;
  float ang=atan(uv.x-c.x,uv.y-c.y);float sun=exp(-pow(ang*3.2,2.));
  col+=vec3(1.,.42,.1)*rim*(.25+sun);col+=vec3(1.,.82,.6)*exp(-max(d,0.)*70.)*sun*1.2;
  if(d<0.){vec2 q=uv-c;float depth=clamp(-d*3.,0.,1.);vec2 w=vec2(atan(q.x,q.y)*3.4,length(q)*5.);float cl=fbm(w*2.2+vec2(T*.012,0.));
    vec3 g=mix(vec3(.05,.022,.012),vec3(.008),depth);g+=vec3(.5,.16,.04)*exp(d*14.)*sun*(.4+cl);col=g+vec3(.015,.008,.005)*cl;}
  col=pow(col/(1.+col*.2),vec3(.82));col+=(h(gl_FragCoord.xy+T)-.5)*.018;gl_FragColor=vec4(col,1.);}`;

const hero=document.getElementById('gyro');
let mx=0,my=0,cx=0,cy=0;
addEventListener('pointermove',e=>{mx=e.clientX/innerWidth*2-1;my=e.clientY/innerHeight*2-1;},{passive:true});
shader(hero,GYRO,{scale:.8,frame(gl,U){
  cx+=(mx-cx)*.05;cy+=(my-cy)*.05;
  const asp=hero.width/hero.height,wide=asp>1.05;
  gl.uniform2f(U('M'),cx,cy);gl.uniform1f(U('S'),scrollY/innerHeight);
  gl.uniform2f(U('O'),wide?.43:0,wide?.05:.5-asp*.5);gl.uniform1f(U('F'),wide?2.05:asp*1.25);
}});
shader(document.getElementById('limb'),LIMB,{scale:.6});

// Header state and section reveals
const top=document.getElementById('top');
const onS=()=>top.classList.toggle('solid',scrollY>innerHeight*.72);onS();addEventListener('scroll',onS,{passive:true});
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}}),{threshold:.12});
document.querySelectorAll('h2,.copy,.gate,.iso,.m-grid').forEach(el=>{el.classList.add('rv');io.observe(el);});
})();
