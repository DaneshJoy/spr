;
(function(){
  var g=function(id){return document.getElementById(id)};
  var heads=g('heads'),prior=g('prior'),hv=g('hv'),av=g('av'),ml=g('ml'),map=g('map'),expl=g('expl');
  var svg=g('l2chart');
  var N=10,H=720,W=420,ML=52,MR=16,MT=30,MB=52,PW=H-ML-MR,PH=W-MT-MB;
  var vals=function(){
    var h=heads?+heads.value:7,a=prior?+prior.value:2;
    var al=a+h,be=a+N-h;
    var likMode=h/N;
    var postMode;
    if(al>1&&be>1)postMode=(al-1)/(al+be-2);
    else if(be<=1&&al>1)postMode=1;
    else if(al<=1&&be>1)postMode=0;
    else postMode=.5;
    return {h:h,a:a,al:al,be:be,likMode:likMode,postMode:postMode};
  };
  var lik=function(t,v){return Math.pow(t,v.h)*Math.pow(1-t,N-v.h)};
  var post=function(t,v){
    if(t<=0)return v.al===1?Math.pow(1,N-v.h):0;
    if(t>=1)return v.be===1?1:0;
    return Math.pow(t,v.al-1)*Math.pow(1-t,v.be-1);
  };
  var x=t=>ML+t*PW, y=v=>MT+(1-v)*PH;
  var pathOf=function(f,v){
    var d='',m=0,i,t,val;
    for(i=0;i<=200;i++){
      t=i/200;val=f(t,v);
      if(val>m)m=val;
    }
    if(m===0)m=1;
    for(i=0;i<=200;i++){
      t=i/200;
      d+=(i?'L':'M')+x(t).toFixed(1)+' '+y(f(t,v)/m).toFixed(1)+' ';
    }
    return {d:d.trim(),max:m};
  };
  var marker=function(t,col,label){
    var px=x(t);
    return '<line x1="'+px.toFixed(1)+'" y1="'+(MT+PH)+'" x2="'+px.toFixed(1)+'" y2="'+MT+'" stroke="'+col+'" stroke-dasharray="5 4"/>'+
      '<text x="'+(px+6).toFixed(1)+'" y="'+(MT+16)+'" direction="ltr" fill="'+col+'" font-size="13" font-weight="700">'+label+'</text>';
  };
  var render=function(){
    if(!svg)return;
    var v=vals();
    var A=getComputedStyle(document.documentElement).getPropertyValue('--a').trim()||'#087f8c';
    var B=getComputedStyle(document.documentElement).getPropertyValue('--b').trim()||'#3267b2';
    var line=getComputedStyle(document.documentElement).getPropertyValue('--line').trim()||'#d8e3ea';
    var muted=getComputedStyle(document.documentElement).getPropertyValue('--muted').trim()||'#536b7a';
    var la=pathOf(lik,v),lp=pathOf(post,v);
    var s='<rect x="0" y="0" width="'+H+'" height="'+W+'" fill="none"/>';
    s+='<line x1="'+ML+'" y1="'+(MT+PH)+'" x2="'+(ML+PW)+'" y2="'+(MT+PH)+'" stroke="'+line+'"/>';
    s+='<line x1="'+ML+'" y1="'+MT+'" x2="'+ML+'" y2="'+(MT+PH)+'" stroke="'+line+'"/>';
    [0,.25,.5,.75,1].forEach(function(t){
      var px=x(t);
      s+='<text x="'+px.toFixed(1)+'" y="'+(MT+PH+20)+'" direction="ltr" text-anchor="middle" fill="'+muted+'" font-size="12">'+t+'</text>';
      s+='<line x1="'+px.toFixed(1)+'" y1="'+(MT+PH)+'" x2="'+px.toFixed(1)+'" y2="'+(MT+PH+5)+'" stroke="'+line+'"/>';
    });
    s+='<text x="'+(ML+PW/2)+'" y="'+(W-14)+'" text-anchor="middle" direction="ltr" fill="'+muted+'" font-size="14">θ</text>';
    s+='<path d="'+la.d+'" fill="none" stroke="'+B+'" stroke-width="2.5"/>';
    s+='<path d="'+lp.d+'" fill="none" stroke="'+A+'" stroke-width="2.5"/>';
    s+='<line x1="'+ML+'" y1="'+(MT+PH)+'" x2="'+ML+'" y2="'+MT+'" stroke="'+line+'"/>';
    s+=marker(v.likMode,'mk-ml','ML');
    s+=marker(v.postMode,'mk-map','MAP');
    s+='<rect x="'+(H-MR-150)+'" y="'+(MT-2)+'" width="146" height="52" rx="10" fill="none" stroke="'+line+'"/>';
    s+='<line x1="'+(H-MR-138)+'" y1="'+(MT+12)+'" x2="'+(H-MR-112)+'" y2="'+(MT+12)+'" stroke="'+B+'" stroke-width="2.5"/>';
    s+='<text x="'+(H-MR-104)+'" y="'+(MT+16)+'" fill="'+muted+'">درست‌نمایی</text>';
    s+='<line x1="'+(H-MR-138)+'" y1="'+(MT+36)+'" x2="'+(H-MR-112)+'" y2="'+(MT+36)+'" stroke="'+A+'" stroke-width="2.5"/>';
    s+='<text x="'+(H-MR-104)+'" y="'+(MT+40)+'" fill="'+muted+'">پسین</text>';
    svg.innerHTML=s;
  };
  var upd=function(){
    if(!heads||!prior||!hv||!av||!ml||!map||!expl)return;
    var v=vals();
    hv.textContent=v.h;av.textContent=v.a;
    ml.textContent=v.likMode.toFixed(3);
    map.textContent=v.postMode.toFixed(3);
    expl.textContent='پسین Beta('+v.al+', '+v.be+') است. مد پسین: '+v.postMode.toFixed(3)+'؛ با افزایش a، پیشین متقارن قدرت بیشتری پیدا می‌کند و برآورد را به ۰٫۵ می‌کشد.';
    render();
  };
  if(heads)heads.oninput=upd;
  if(prior)prior.oninput=upd;
  document.addEventListener('themechange',render);
  upd();
})();
