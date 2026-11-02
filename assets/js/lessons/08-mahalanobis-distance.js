;
(function(){
  var g=function(id){return document.getElementById(id)};
  var rho=g('l8-rho'),rhoV=g('l8-rhov'),qx=g('l8-qx'),qxV=g('l8-qxv'),qy=g('l8-qy'),qyV=g('l8-qyv');
  var eu=g('l8-eu'),mh=g('l8-mh'),kv=g('l8-k'),expl=g('l8-expl');
  var svg=g('l8-lab');
  var SX=1.6,SY=1,CX=320,CY=230,S=46;
  // deterministic scatter: fixed-seed LCG + Box-Muller (no Math.random)
  var seed=20260808;
  var lcg=function(){
    seed=(seed*1664525+1013904223)%4294967296;
    return seed/4294967296;
  };
  var Z=[];
  (function(){
    var i,u1,u2,r,t;
    for(i=0;i<160;i++){
      do{u1=lcg();}while(u1<=1e-12);
      u2=lcg();
      r=Math.sqrt(-2*Math.log(u1));
      t=2*Math.PI*u2;
      Z.push([r*Math.cos(t),r*Math.sin(t)]);
    }
  })();
  var vals=function(){
    var r=rho?+rho.value:0.7,ax=qx?+qx.value:1.7,ay=qy?+qy.value:1.7;
    var den=1-r*r;
    var dm=Math.sqrt((ax*ax+ay*ay-2*r*ax*ay)/den);
    var de=Math.sqrt(Math.pow(SX*ax,2)+Math.pow(SY*ay,2));
    return {r:r,ax:ax,ay:ay,dm:dm,de:de};
  };
  var px=function(X){return CX+X*S};
  var py=function(Y){return CY-Y*S};
  var ellipse=function(k,a,b,c,stroke,width,dash,op){
    var th=0.5*Math.atan2(2*c,a-b);
    var mid=(a+b)/2,d=Math.sqrt(Math.pow((a-b)/2,2)+c*c);
    var rx=k*Math.sqrt(mid+d),ry=k*Math.sqrt(mid-d);
    return '<ellipse cx="'+CX+'" cy="'+CY+'" rx="'+(rx*S).toFixed(1)+'" ry="'+(ry*S).toFixed(1)+
      '" fill="none" stroke="'+stroke+'" stroke-width="'+width+'"'+(dash?' stroke-dasharray="6 5"':'')+
      (op?' opacity="'+op+'"':'')+' transform="rotate('+(-th*180/Math.PI).toFixed(2)+' '+CX+' '+CY+')"/>';
  };
  var render=function(){
    if(!svg)return;
    var v=vals();
    var cs=getComputedStyle(document.documentElement);
    var A=cs.getPropertyValue('--a').trim()||'#087f8c';
    var B=cs.getPropertyValue('--b').trim()||'#3267b2';
    var LINE=cs.getPropertyValue('--line').trim()||'#d8e3ea';
    var MUT=cs.getPropertyValue('--muted').trim()||'#536b7a';
    var WARN=cs.getPropertyValue('--warn').trim()||'#b76e00';
    var BAD=cs.getPropertyValue('--bad').trim()||'#b42335';
    var a=SX*SX,b=SY*SY,c=v.r*SX*SY;
    var s='<rect x="0" y="0" width="640" height="460" fill="none"/>';
    // axes through mu
    s+='<line x1="'+CX+'" y1="20" x2="'+CX+'" y2="440" stroke="'+LINE+'"/>';
    s+='<line x1="30" y1="'+CY+'" x2="610" y2="'+CY+'" stroke="'+LINE+'"/>';
    s+='<text x="600" y="'+(CY-8)+'" direction="ltr" text-anchor="end" fill="'+MUT+'" font-size="12">x</text>';
    s+='<text x="'+(CX+8)+'" y="30" direction="ltr" fill="'+MUT+'" font-size="12">y</text>';
    // Mahalanobis contours 3s,2s,1s (largest first)
    s+=ellipse(3,a,b,c,LINE,1.5,false,.9);
    s+=ellipse(2,a,b,c,LINE,2,false,.9);
    s+=ellipse(1,a,b,c,A,2.5,false,0);
    // scatter points
    var i,zx,zy,X,Y;
    for(i=0;i<Z.length;i++){
      zx=Z[i][0];zy=Z[i][1];
      X=SX*zx;
      Y=SY*(v.r*zx+Math.sqrt(1-v.r*v.r)*zy);
      s+='<circle cx="'+px(X).toFixed(1)+'" cy="'+py(Y).toFixed(1)+'" r="3" fill="'+B+'" opacity=".45"/>';
    }
    // query point: Euclidean line, dashed iso-Euclidean circle, k-contour
    var Xq=SX*v.ax,Yq=SY*v.ay;
    s+='<circle cx="'+CX+'" cy="'+CY+'" r="'+(v.de*S).toFixed(1)+'" fill="none" stroke="'+B+'" stroke-width="1.5" stroke-dasharray="6 5" opacity=".7"/>';
    s+='<line x1="'+CX+'" y1="'+CY+'" x2="'+px(Xq).toFixed(1)+'" y2="'+py(Yq).toFixed(1)+'" stroke="'+B+'" stroke-width="2.5"/>';
    if(v.dm>0.01)s+=ellipse(v.dm,a,b,c,WARN,2.5,false,0);
    // mean marker
    s+='<line x1="'+(CX-5)+'" y1="'+(CY-5)+'" x2="'+(CX+5)+'" y2="'+(CY+5)+'" stroke="'+MUT+'" stroke-width="2"/>';
    s+='<line x1="'+(CX-5)+'" y1="'+(CY+5)+'" x2="'+(CX+5)+'" y2="'+(CY-5)+'" stroke="'+MUT+'" stroke-width="2"/>';
    // query dot
    s+='<circle cx="'+px(Xq).toFixed(1)+'" cy="'+py(Yq).toFixed(1)+'" r="6" fill="'+BAD+'"/>';
    // legend
    s+='<rect x="14" y="14" width="168" height="66" rx="10" fill="none" stroke="'+LINE+'"/>';
    s+='<circle cx="30" cy="32" r="3.5" fill="'+B+'" opacity=".55"/>';
    s+='<text x="42" y="36" fill="'+MUT+'" font-size="12">نقاط داده</text>';
    s+='<line x1="22" y1="52" x2="40" y2="52" stroke="'+A+'" stroke-width="2.5"/>';
    s+='<text x="48" y="56" fill="'+MUT+'" font-size="12">بیضی‌های ۱σ/۲σ/۳σ</text>';
    s+='<circle cx="30" cy="70" r="5" fill="'+BAD+'"/>';
    s+='<text x="42" y="74" fill="'+MUT+'" font-size="12">نقطهٔ کوئری</text>';
    svg.innerHTML=s;
  };
  var upd=function(){
    if(!rho||!qx||!qy||!eu||!mh||!kv||!expl)return;
    var v=vals();
    if(rhoV)rhoV.textContent=v.r.toFixed(2);
    if(qxV)qxV.textContent=v.ax.toFixed(1);
    if(qyV)qyV.textContent=v.ay.toFixed(1);
    eu.textContent=v.de.toFixed(2);
    mh.textContent=v.dm.toFixed(2);
    kv.textContent=v.dm.toFixed(2)+' σ';
    expl.textContent='با ρ='+v.r.toFixed(2)+'، فاصلهٔ اقلیدسی '+v.de.toFixed(2)+' و فاصلهٔ ماهالانوبیس '+v.dm.toFixed(2)+' است؛ نقطه روی بیضی k='+v.dm.toFixed(2)+'σ می‌نشیند. با ρ بالا، نقطه‌ای با فاصلهٔ اقلیدسی کم می‌تواند ماهالانوبیس بزرگ بگیرد (خارج از بیضی) و برعکس — فاصله را با شکل داده بسنج.';
    render();
  };
  if(rho)rho.oninput=upd;
  if(qx)qx.oninput=upd;
  if(qy)qy.oninput=upd;
  document.addEventListener('themechange',render);
  upd();
})();
