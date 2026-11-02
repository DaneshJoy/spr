;
(function(){
  var g=function(id){return document.getElementById(id)};
  var svg=g('l9-lab'),accEl=g('l9-acc'),expl=g('l9-expl'),bL=g('l9-lda'),bQ=g('l9-qda');
  if(!svg)return;
  var VW=640,VH=440,ML=44,MR=16,MT=18,MB=40,PW=VW-ML-MR,PH=VH-MT-MB;
  var XMIN=-6,XMAX=6,YMIN=-4,YMAX=4,TAU=6.283185307179586;
  var px=function(x){return ML+(x-XMIN)/(XMAX-XMIN)*PW};
  var py=function(y){return MT+(YMAX-y)/(YMAX-YMIN)*PH};
  // deterministic LCG (Math.imul keeps 32-bit exactness) + Box-Muller; fully seeded, no ambient randomness
  var seed=987654321;
  var rnd=function(){seed=(Math.imul(seed,1103515245)+12345)>>>0;return seed/4294967296};
  var gauss=function(){
    var u=rnd()||1e-12,v=rnd(),r=Math.sqrt(-2*Math.log(u)),t=TAU*v;
    return [r*Math.cos(t),r*Math.sin(t)];
  };
  // covariance stored as [sxx,sxy,syy]
  var muA=[-2.2,-1.2],muB=[2.2,1.2];
  var sxA=1,syA=0.8,rA=0.15,sxB=2,syB=0.8,rB=0.55;
  var covA=[sxA*sxA,rA*sxA*syA,syA*syA];
  var covB=[sxB*sxB,rB*sxB*syB,syB*syB];
  var covP=[(covA[0]+covB[0])/2,(covA[1]+covB[1])/2,(covA[2]+covB[2])/2];
  var pts=[],i,z;
  for(i=0;i<70;i++){z=gauss();pts.push({x:muA[0]+sxA*z[0],y:muA[1]+syA*(rA*z[0]+Math.sqrt(1-rA*rA)*z[1]),c:0});}
  for(i=0;i<70;i++){z=gauss();pts.push({x:muB[0]+sxB*z[0],y:muB[1]+syB*(rB*z[0]+Math.sqrt(1-rB*rB)*z[1]),c:1});}
  // quadratic discriminant (log-density + log-prior), equal priors ln(0.5) kept for completeness
  var quad=function(x,y,mu,c){
    var dx=x-mu[0],dy=y-mu[1],det=c[0]*c[2]-c[1]*c[1];
    return -0.5*Math.log(det)-0.5*(c[2]*dx*dx-2*c[1]*dx*dy+c[0]*dy*dy)/det+Math.log(0.5);
  };
  var disc=function(x,y,lda){
    return lda?quad(x,y,muA,covP)-quad(x,y,muB,covP):quad(x,y,muA,covA)-quad(x,y,muB,covB);
  };
  // 1-sigma ellipse of a Gaussian via 2x2 eigen-decomposition of the covariance
  var ell=function(mu,c,col){
    var a=c[0],b=c[1],d=c[2],df=a-d,q=Math.sqrt(df*df+4*b*b);
    var l1=Math.max((a+d+q)/2,1e-9),l2=Math.max((a+d-q)/2,1e-9);
    var s1=Math.sqrt(l1),s2=Math.sqrt(l2),phi=0.5*Math.atan2(2*b,df);
    var cp=Math.cos(phi),sp=Math.sin(phi),ds='',k,t,ux,uy,cx,cy;
    for(k=0;k<=48;k++){t=TAU*k/48;ux=Math.cos(t);uy=Math.sin(t);
      cx=mu[0]+s1*cp*ux-s2*sp*uy;cy=mu[1]+s1*sp*ux+s2*cp*uy;
      ds+=(k?'L':'M')+px(cx).toFixed(1)+' '+py(cy).toFixed(1);}
    return '<path d="'+ds+'Z" fill="none" stroke="'+col+'" stroke-width="2" stroke-opacity="0.9"/>';
  };
  // marching squares over a 25x25 grid: segments where f_A - f_B changes sign
  var march=function(lda){
    var N=25,vals=[],seg='',i,j,e;
    for(i=0;i<N;i++){vals.push([]);for(j=0;j<N;j++)vals[i].push(disc(XMIN+(XMAX-XMIN)*i/(N-1),YMIN+(YMAX-YMIN)*j/(N-1),lda));}
    for(i=0;i<N-1;i++)for(j=0;j<N-1;j++){
      var x0=XMIN+(XMAX-XMIN)*i/(N-1),x1=XMIN+(XMAX-XMIN)*(i+1)/(N-1);
      var y0=YMIN+(YMAX-YMIN)*j/(N-1),y1=YMIN+(YMAX-YMIN)*(j+1)/(N-1);
      var v=[vals[i][j],vals[i+1][j],vals[i+1][j+1],vals[i][j+1]];
      var cs=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]],cr=[];
      for(e=0;e<4;e++){var a=v[e],b=v[(e+1)%4],p1=cs[e],p2=cs[(e+1)%4];
        if((a<0)!==(b<0)){var t=a/(a-b);cr.push([p1[0]+(p2[0]-p1[0])*t,p1[1]+(p2[1]-p1[1])*t]);}}
      if(cr.length===2)seg+='M'+px(cr[0][0]).toFixed(1)+' '+py(cr[0][1]).toFixed(1)+'L'+px(cr[1][0]).toFixed(1)+' '+py(cr[1][1]).toFixed(1);
      else if(cr.length===4)seg+='M'+px(cr[0][0]).toFixed(1)+' '+py(cr[0][1]).toFixed(1)+'L'+px(cr[1][0]).toFixed(1)+' '+py(cr[1][1]).toFixed(1)+'M'+px(cr[2][0]).toFixed(1)+' '+py(cr[2][1]).toFixed(1)+'L'+px(cr[3][0]).toFixed(1)+' '+py(cr[3][1]).toFixed(1);
    }
    return seg;
  };
  var cur='lda';
  var render=function(){
    var cs=getComputedStyle(document.documentElement);
    var A=cs.getPropertyValue('--a').trim()||'#087f8c';
    var B=cs.getPropertyValue('--b').trim()||'#3267b2';
    var bad=cs.getPropertyValue('--bad').trim()||'#b42335';
    var line=cs.getPropertyValue('--line').trim()||'#d8e3ea';
    var muted=cs.getPropertyValue('--muted').trim()||'#536b7a';
    var s='<line x1="'+ML+'" y1="'+(MT+PH)+'" x2="'+(ML+PW)+'" y2="'+(MT+PH)+'" stroke="'+line+'"/>'
      +'<line x1="'+ML+'" y1="'+MT+'" x2="'+ML+'" y2="'+(MT+PH)+'" stroke="'+line+'"/>';
    var t,v;
    for(t=-6;t<=6;t+=2){v=px(t);
      s+='<line x1="'+v.toFixed(1)+'" y1="'+(MT+PH)+'" x2="'+v.toFixed(1)+'" y2="'+(MT+PH+5)+'" stroke="'+line+'"/>'
        +'<text x="'+v.toFixed(1)+'" y="'+(MT+PH+20)+'" direction="ltr" text-anchor="middle" fill="'+muted+'" font-size="12">'+t+'</text>';}
    for(t=-4;t<=4;t+=2){v=py(t);
      s+='<line x1="'+(ML-5)+'" y1="'+v.toFixed(1)+'" x2="'+ML+'" y2="'+v.toFixed(1)+'" stroke="'+line+'"/>'
        +'<text x="'+(ML-8)+'" y="'+(v+4).toFixed(1)+'" direction="ltr" text-anchor="end" fill="'+muted+'" font-size="12">'+t+'</text>';}
    s+='<text x="'+(ML+PW/2)+'" y="'+(VH-8)+'" text-anchor="middle" direction="ltr" fill="'+muted+'" font-size="13">x\u2081</text>';
    s+='<text x="14" y="'+(MT+PH/2)+'" direction="ltr" fill="'+muted+'" font-size="13">x\u2082</text>';
    s+='<circle cx="'+(ML+16)+'" cy="'+(MT+12)+'" r="4" fill="'+A+'"/><text x="'+(ML+26)+'" y="'+(MT+16)+'" fill="'+muted+'" font-size="12">کلاس الف</text>';
    s+='<circle cx="'+(ML+104)+'" cy="'+(MT+12)+'" r="4" fill="'+B+'"/><text x="'+(ML+114)+'" y="'+(MT+16)+'" fill="'+muted+'" font-size="12">کلاس ب</text>';
    for(var p,i2=0;i2<pts.length;i2++){p=pts[i2];
      s+='<circle cx="'+px(p.x).toFixed(1)+'" cy="'+py(p.y).toFixed(1)+'" r="3.4" fill="'+(p.c?B:A)+'" fill-opacity="0.85"/>';}
    if(cur==='lda')s+=ell(muA,covP,A)+ell(muB,covP,B);
    else s+=ell(muA,covA,A)+ell(muB,covB,B);
    s+='<path d="'+march(cur==='lda')+'" fill="none" stroke="'+bad+'" stroke-width="3" stroke-linecap="round"/>';
    svg.innerHTML=s;
  };
  var upd=function(){
    var lda=cur==='lda',ok=0,i2,p,d;
    for(i2=0;i2<pts.length;i2++){p=pts[i2];d=disc(p.x,p.y,lda);if((d>0)===(p.c===0))ok++;}
    if(accEl)accEl.textContent=Math.round(100*ok/pts.length)+'%';
    if(expl)expl.textContent=lda
      ?'کوواریانس مشترک فرض شد؛ مرز خطی است — ساده و مقاوم'
      :'هر کلاس کوواریانس خودش را دارد؛ مرز منحنی و انعطاف‌پذیر — دادهٔ کمتر، خطر بیش‌برازش';
    if(bL)bL.setAttribute('aria-pressed',lda?'true':'false');
    if(bQ)bQ.setAttribute('aria-pressed',lda?'false':'true');
    render();
  };
  if(bL)bL.onclick=function(){cur='lda';upd();};
  if(bQ)bQ.onclick=function(){cur='qda';upd();};
  document.addEventListener('themechange',upd);
  upd();
})();
