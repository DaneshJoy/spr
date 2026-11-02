;
(function(){
  var g=function(id){return document.getElementById(id)};
  var tau=g('tau'),tauval=g('l6-tauval'),tprEl=g('l6-tpr'),fprEl=g('l6-fpr'),jEl=g('l6-j'),aucEl=g('l6-auc'),expl=g('l6-expl');
  var dist=g('l6-dist'),roc=g('l6-roc');
  var MU_P=.65,MU_N=.35,SIG=.12,SQ2=Math.sqrt(2);
  // Φ(z) via erf, Abramowitz–Stegun 7.1.26 (|err|<1.5e-7)
  var phi=function(z){
    var x=z/SQ2,ax=Math.abs(x),t=1/(1+.3275911*ax);
    var poly=t*(.254829592+t*(-.284496736+t*(1.421413741+t*(-1.453152027+t*1.061405429))));
    var erf=1-poly*Math.exp(-ax*ax);
    return .5*(1+(x<0?-erf:erf));
  };
  var TPR=function(t){return 1-phi((t-MU_P)/SIG)};
  var FPR=function(t){return 1-phi((t-MU_N)/SIG)};
  var AUC=phi((MU_P-MU_N)/(SIG*SQ2));
  var css=function(n,f){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()||f};
  var dens=function(s,mu){return Math.exp(-.5*Math.pow((s-mu)/SIG,2))/(SIG*Math.sqrt(2*Math.PI))};
  // dist chart: two score densities + threshold line + FP/FN shaded areas
  var renderDist=function(t){
    if(!dist)return;
    var W=720,H=300,ML=48,MR=16,MT=30,MB=48,PW=W-ML-MR,PH=H-MT-MB;
    var A=css('--a','#087f8c'),B=css('--b','#3267b2'),warn=css('--warn','#b76e00'),bad=css('--bad','#b42335'),line=css('--line','#d8e3ea'),muted=css('--muted','#536b7a'),text=css('--text','#172b3a');
    var X=function(s){return ML+s*PW},Y=function(d){return MT+(1-d/3.3245)*PH},base=MT+PH,dmax=dens(MU_P,MU_P);
    var s='<line x1="'+ML+'" y1="'+base+'" x2="'+(ML+PW)+'" y2="'+base+'" stroke="'+line+'"/>';
    s+='<line x1="'+ML+'" y1="'+MT+'" x2="'+ML+'" y2="'+base+'" stroke="'+line+'"/>';
    [0,.25,.5,.75,1].forEach(function(v){
      var px=X(v);
      s+='<text x="'+px.toFixed(1)+'" y="'+(base+20)+'" direction="ltr" text-anchor="middle" fill="'+muted+'" font-size="12">'+v+'</text>';
      s+='<line x1="'+px.toFixed(1)+'" y1="'+base+'" x2="'+px.toFixed(1)+'" y2="'+(base+5)+'" stroke="'+line+'"/>';
    });
    s+='<text x="'+(ML+PW/2)+'" y="'+(H-8)+'" text-anchor="middle" fill="'+muted+'" font-size="14">امتیاز مدل (Score)</text>';
    s+='<text x="'+(ML+6)+'" y="'+(MT+14)+'" fill="'+muted+'" font-size="12">چگالی (Density)</text>';
    var fp='M'+X(t).toFixed(1)+' '+base+' ',fn='M'+X(0).toFixed(1)+' '+base+' ',i,v;
    for(i=0;i<=200;i++){v=t+i*(1-t)/200;fp+='L'+X(v).toFixed(1)+' '+Y(dens(v,MU_N)).toFixed(1)+' ';}
    fp+='L'+X(1).toFixed(1)+' '+base+' Z';
    for(i=0;i<=200;i++){v=i*t/200;fn+='L'+X(v).toFixed(1)+' '+Y(dens(v,MU_P)).toFixed(1)+' ';}
    fn+='L'+X(t).toFixed(1)+' '+base+' Z';
    s+='<path d="'+fp+'" fill="'+warn+'" fill-opacity=".3" stroke="none"/>';
    s+='<path d="'+fn+'" fill="'+bad+'" fill-opacity=".3" stroke="none"/>';
    var dp='',dn='';
    for(i=0;i<=200;i++){v=i/200;dp+=(i?'L':'M')+X(v).toFixed(1)+' '+Y(dens(v,MU_P)).toFixed(1)+' ';dn+=(i?'L':'M')+X(v).toFixed(1)+' '+Y(dens(v,MU_N)).toFixed(1)+' ';}
    s+='<path d="'+dn.trim()+'" fill="none" stroke="'+B+'" stroke-width="2.5"/>';
    s+='<path d="'+dp.trim()+'" fill="none" stroke="'+A+'" stroke-width="2.5"/>';
    var px=X(t),lx=Math.min(Math.max(px,ML+30),ML+PW-30);
    s+='<line x1="'+px.toFixed(1)+'" y1="'+base+'" x2="'+px.toFixed(1)+'" y2="'+MT+'" stroke="'+text+'" stroke-width="2"/>';
    s+='<text x="'+lx.toFixed(1)+'" y="'+(MT+12)+'" direction="ltr" text-anchor="middle" fill="'+text+'" font-size="13" font-weight="700">τ='+t.toFixed(2)+'</text>';
    var lx0=W-MR-198;
    s+='<rect x="'+lx0+'" y="'+(MT-2)+'" width="196" height="66" rx="10" fill="none" stroke="'+line+'"/>';
    s+='<line x1="'+(lx0+10)+'" y1="'+(MT+12)+'" x2="'+(lx0+36)+'" y2="'+(MT+12)+'" stroke="'+A+'" stroke-width="2.5"/>';
    s+='<text x="'+(lx0+42)+'" y="'+(MT+16)+'" fill="'+muted+'" font-size="12">مثبت‌ها (بیمار)</text>';
    s+='<line x1="'+(lx0+10)+'" y1="'+(MT+34)+'" x2="'+(lx0+36)+'" y2="'+(MT+34)+'" stroke="'+B+'" stroke-width="2.5"/>';
    s+='<text x="'+(lx0+42)+'" y="'+(MT+38)+'" fill="'+muted+'" font-size="12">منفی‌ها (سالم)</text>';
    s+='<rect x="'+(lx0+10)+'" y="'+(MT+50)+'" width="14" height="10" fill="'+warn+'" fill-opacity=".3"/>';
    s+='<rect x="'+(lx0+34)+'" y="'+(MT+50)+'" width="14" height="10" fill="'+bad+'" fill-opacity=".3"/>';
    s+='<text x="'+(lx0+56)+'" y="'+(MT+59)+'" direction="ltr" fill="'+muted+'" font-size="12">FP / FN</text>';
    dist.innerHTML=s;
  };
  // ROC chart: curve of (FPR(τ),TPR(τ)) + chance diagonal + moving operating point
  var renderRoc=function(t){
    if(!roc)return;
    var W=420,H=420,ML=46,MR=18,MT=16,MB=44,PW=W-ML-MR,PH=H-MT-MB;
    var A=css('--a','#087f8c'),bad=css('--bad','#b42335'),line=css('--line','#d8e3ea'),muted=css('--muted','#536b7a');
    var X=function(f){return ML+f*PW},Y=function(p){return MT+(1-p)*PH};
    var s='<line x1="'+ML+'" y1="'+(MT+PH)+'" x2="'+(ML+PW)+'" y2="'+(MT+PH)+'" stroke="'+line+'"/>';
    s+='<line x1="'+ML+'" y1="'+MT+'" x2="'+ML+'" y2="'+(MT+PH)+'" stroke="'+line+'"/>';
    [0,.25,.5,.75,1].forEach(function(v){
      var px=X(v),py=Y(v);
      s+='<text x="'+px.toFixed(1)+'" y="'+(MT+PH+20)+'" direction="ltr" text-anchor="middle" fill="'+muted+'" font-size="12">'+v+'</text>';
      s+='<line x1="'+px.toFixed(1)+'" y1="'+(MT+PH)+'" x2="'+px.toFixed(1)+'" y2="'+(MT+PH+5)+'" stroke="'+line+'"/>';
      s+='<text x="'+(ML-8)+'" y="'+(py+4)+'" direction="ltr" text-anchor="end" fill="'+muted+'" font-size="12">'+v+'</text>';
      s+='<line x1="'+(ML-5)+'" y1="'+py.toFixed(1)+'" x2="'+ML+'" y2="'+py.toFixed(1)+'" stroke="'+line+'"/>';
    });
    s+='<text x="'+(ML+PW/2)+'" y="'+(H-6)+'" text-anchor="middle" direction="ltr" fill="'+muted+'" font-size="14">FPR</text>';
    s+='<text x="14" y="'+(MT+PH/2)+'" text-anchor="middle" direction="ltr" transform="rotate(-90 14 '+(MT+PH/2)+')" fill="'+muted+'" font-size="14">TPR</text>';
    s+='<line x1="'+ML+'" y1="'+(MT+PH)+'" x2="'+(ML+PW)+'" y2="'+MT+'" stroke="'+line+'" stroke-dasharray="6 5"/>';
    var pts='',i,v;
    for(i=0;i<=200;i++){v=i/200;pts+=X(FPR(v)).toFixed(1)+','+Y(TPR(v)).toFixed(1)+' ';}
    s+='<polyline points="'+pts.trim()+'" fill="none" stroke="'+A+'" stroke-width="2.5"/>';
    var fx=X(FPR(t)),fy=Y(TPR(t));
    s+='<line x1="'+ML+'" y1="'+fy.toFixed(1)+'" x2="'+fx.toFixed(1)+'" y2="'+fy.toFixed(1)+'" stroke="'+muted+'" stroke-dasharray="4 4"/>';
    s+='<line x1="'+fx.toFixed(1)+'" y1="'+(MT+PH)+'" x2="'+fx.toFixed(1)+'" y2="'+fy.toFixed(1)+'" stroke="'+muted+'" stroke-dasharray="4 4"/>';
    s+='<circle cx="'+fx.toFixed(1)+'" cy="'+fy.toFixed(1)+'" r="6" fill="'+bad+'"/>';
    roc.innerHTML=s;
  };
  var explText=function(t,tp,fp){
    var pos;
    if(t>0.62)pos='آستانهٔ بالاست: نقطهٔ عملیاتی به چپ‌پایین منحنی لغزیده است؛ مدل سخت‌گیر شده، حساسیت پایین می‌آید اما هشدارهای اشتباه (FP) هم کم‌اند.';
    else if(t<0.38)pos='آستانهٔ پایین است: نقطهٔ عملیاتی به راست‌بالای منحنی لغزیده است؛ مدل آسان‌گیر شده و تقریباً همهٔ بیمارها را می‌گیرد (TPR بالا) اما مثبت‌های کاذب زیاد می‌شوند.';
    else pos='آستانهٔ میانی است: نقطهٔ عملیاتی نزدیک گوشهٔ خمیدهٔ منحنی است؛ توازن نسبتاً خوبی میان حساسیت و مثبت کاذب برقرار است (در این توزیع‌های قرینه، بیشینهٔ یوودن همین‌جاست).';
    return 'با τ='+t.toFixed(2)+' داریم: TPR='+tp.toFixed(3)+' و FPR='+fp.toFixed(3)+'. '+pos+' به یاد داشته باش: نقطه روی منحنی می‌لغزد، خود منحنی جابه‌جا نمی‌شود؛ منحنی فقط با تغییر خود مدل عوض می‌شود.';
  };
  var upd=function(){
    var t=tau?+tau.value:.5,tp=TPR(t),fp=FPR(t);
    if(tauval)tauval.textContent=t.toFixed(2);
    if(tprEl)tprEl.textContent=tp.toFixed(3);
    if(fprEl)fprEl.textContent=fp.toFixed(3);
    if(jEl)jEl.textContent=(tp-fp).toFixed(3);
    if(aucEl)aucEl.textContent=AUC.toFixed(3);
    if(expl)expl.textContent=explText(t,tp,fp);
    renderDist(t);renderRoc(t);
  };
  if(tau)tau.oninput=upd;
  document.addEventListener('themechange',upd);
  upd();
})();
