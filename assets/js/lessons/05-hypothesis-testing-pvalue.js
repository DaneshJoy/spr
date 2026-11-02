;
(function(){
  var g=function(id){return document.getElementById(id)};
  var svg=g('l5-lab'),dS=g('l5-d'),aS=g('l5-alpha'),dv=g('l5-dv'),av=g('l5-alphav');
  var zOut=g('l5-z'),bOut=g('l5-beta'),pOut=g('l5-power'),expl=g('l5-expl');
  var H=720,W=420,ML=52,MR=16,MT=30,MB=52,PW=H-ML-MR,PH=W-MT-MB;
  var XMIN=-4,XMAX=7,YMAX=.42,N=200,SQ2=Math.sqrt(2),SQ2PI=Math.sqrt(2*Math.PI);
  var erf=function(x){
    var s=x<0?-1:1;x=Math.abs(x);
    var t=1/(1+.3275911*x);
    var y=1-((((1.061405429*t-1.453152027)*t+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-x*x);
    return s*y;
  };
  var phi=function(z){return .5*(1+erf(z/SQ2))};
  var phiInv=function(p){
    var lo=-5,hi=5,m,i;
    for(i=0;i<60;i++){m=(lo+hi)/2;if(phi(m)<p)lo=m;else hi=m;}
    return (lo+hi)/2;
  };
  var pdf=function(x,mu){return Math.exp(-.5*(x-mu)*(x-mu))/SQ2PI};
  var X=function(x){return ML+(x-XMIN)/(XMAX-XMIN)*PW};
  var Y=function(v){return MT+(1-v/YMAX)*PH};
  var curve=function(mu){
    var d='',i,x;
    for(i=0;i<=N;i++){x=XMIN+(XMAX-XMIN)*i/N;d+=(i?'L':'M')+X(x).toFixed(1)+' '+Y(pdf(x,mu)).toFixed(1)+' ';}
    return d.trim();
  };
  var area=function(mu,from,to){
    var d='M'+X(from).toFixed(1)+' '+Y(0).toFixed(1)+' ',n,i,x;
    n=Math.max(2,Math.round(N*(to-from)/(XMAX-XMIN)));
    for(i=0;i<=n;i++){x=from+(to-from)*i/n;d+='L'+X(x).toFixed(1)+' '+Y(pdf(x,mu)).toFixed(1)+' ';}
    return d+'L'+X(to).toFixed(1)+' '+Y(0).toFixed(1)+' Z';
  };
  var render=function(){
    if(!svg)return;
    var d=dS?+dS.value:1,al=aS?+aS.value:.05,z=phiInv(1-al);
    var cs=getComputedStyle(document.documentElement);
    var A=cs.getPropertyValue('--a').trim()||'#087f8c';
    var B=cs.getPropertyValue('--b').trim()||'#3267b2';
    var bad=cs.getPropertyValue('--bad').trim()||'#b42335';
    var warn=cs.getPropertyValue('--warn').trim()||'#b76e00';
    var line=cs.getPropertyValue('--line').trim()||'#d8e3ea';
    var muted=cs.getPropertyValue('--muted').trim()||'#536b7a';
    var text=cs.getPropertyValue('--text').trim()||'#172b3a';
    var s='<rect x="0" y="0" width="'+H+'" height="'+W+'" fill="none"/>';
    s+='<line x1="'+ML+'" y1="'+(MT+PH)+'" x2="'+(ML+PW)+'" y2="'+(MT+PH)+'" stroke="'+line+'"/>';
    s+='<line x1="'+ML+'" y1="'+MT+'" x2="'+ML+'" y2="'+(MT+PH)+'" stroke="'+line+'"/>';
    var i,x0;
    for(i=Math.ceil(XMIN);i<=Math.floor(XMAX);i++){
      x0=X(i);
      s+='<line x1="'+x0.toFixed(1)+'" y1="'+(MT+PH)+'" x2="'+x0.toFixed(1)+'" y2="'+(MT+PH+5)+'" stroke="'+line+'"/>';
      s+='<text x="'+x0.toFixed(1)+'" y="'+(MT+PH+20)+'" direction="ltr" text-anchor="middle" fill="'+muted+'" font-size="11">'+i+'</text>';
    }
    s+='<text x="'+(ML+PW/2)+'" y="'+(W-14)+'" text-anchor="middle" fill="'+muted+'" font-size="14">امتیاز آزمون (z)</text>';
    s+='<path d="'+area(0,z,XMAX)+'" fill="'+bad+'" fill-opacity=".3"/>';
    s+='<path d="'+area(d,XMIN,z)+'" fill="'+warn+'" fill-opacity=".3"/>';
    s+='<path d="'+curve(0)+'" fill="none" stroke="'+B+'" stroke-width="2.5"/>';
    s+='<path d="'+curve(d)+'" fill="none" stroke="'+A+'" stroke-width="2.5"/>';
    s+='<line x1="'+X(z).toFixed(1)+'" y1="'+(MT+PH)+'" x2="'+X(z).toFixed(1)+'" y2="'+MT+'" stroke="'+text+'" stroke-dasharray="5 4"/>';
    s+='<text x="'+(X(z)+6).toFixed(1)+'" y="'+(MT+16)+'" direction="ltr" fill="'+text+'" font-size="13" font-weight="700">z*='+z.toFixed(2)+'</text>';
    s+='<rect x="'+(H-MR-152)+'" y="'+(MT-4)+'" width="148" height="88" rx="10" fill="none" stroke="'+line+'"/>';
    s+='<line x1="'+(H-MR-140)+'" y1="'+(MT+12)+'" x2="'+(H-MR-114)+'" y2="'+(MT+12)+'" stroke="'+B+'" stroke-width="2.5"/>';
    s+='<text x="'+(H-MR-106)+'" y="'+(MT+16)+'" fill="'+muted+'" font-size="12">فرض صفر H₀</text>';
    s+='<line x1="'+(H-MR-140)+'" y1="'+(MT+32)+'" x2="'+(H-MR-114)+'" y2="'+(MT+32)+'" stroke="'+A+'" stroke-width="2.5"/>';
    s+='<text x="'+(H-MR-106)+'" y="'+(MT+36)+'" fill="'+muted+'" font-size="12">فرض جانشین H₁</text>';
    s+='<rect x="'+(H-MR-140)+'" y="'+(MT+46)+'" width="26" height="11" fill="'+bad+'" fill-opacity=".45" stroke="none"/>';
    s+='<text x="'+(H-MR-106)+'" y="'+(MT+56)+'" fill="'+muted+'" font-size="12">ناحیهٔ رد (α)</text>';
    s+='<rect x="'+(H-MR-140)+'" y="'+(MT+66)+'" width="26" height="11" fill="'+warn+'" fill-opacity=".45" stroke="none"/>';
    s+='<text x="'+(H-MR-106)+'" y="'+(MT+76)+'" fill="'+muted+'" font-size="12">خطای نوع دوم (β)</text>';
    svg.innerHTML=s;
  };
  var upd=function(){
    var d=dS?+dS.value:1,al=aS?+aS.value:.05;
    var z=phiInv(1-al),be=phi(z-d),pw=1-be;
    if(dv)dv.textContent=d.toFixed(1);
    if(av)av.textContent=al.toFixed(3);
    if(zOut)zOut.textContent=z.toFixed(2);
    if(bOut)bOut.textContent=be.toFixed(3);
    if(pOut)pOut.textContent=pw.toFixed(3);
    if(expl)expl.textContent='با d='+d.toFixed(1)+' و α='+al.toFixed(3)+'، آستانهٔ تصمیم z*='+z.toFixed(2)+' است؛ β='+be.toFixed(3)+' و توان آزمون '+pw.toFixed(3)+'. اندازهٔ اثر بزرگ‌تر یعنی هم‌پوشانی دو منحنی کمتر و β کوچک‌تر؛ α کوچک‌تر (سخت‌گیرانه‌تر) یعنی آستانه به راست می‌رود و β بزرگ‌تر می‌شود.';
    render();
  };
  if(dS)dS.oninput=upd;
  if(aS)aS.oninput=upd;
  document.addEventListener('themechange',render);
  upd();
})();
