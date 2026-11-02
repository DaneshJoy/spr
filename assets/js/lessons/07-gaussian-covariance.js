;
(function(){
  var g=function(id){return document.getElementById(id)};
  var svg=g('l7-lab'),sx=g('l7-sx'),sy=g('l7-sy'),rho=g('l7-rho'),
      thEl=g('l7-theta'),r1El=g('l7-r1'),r2El=g('l7-r2'),expl=g('l7-expl');
  var W=640,H=420,CX=320,CY=210,K=46,NPTS=180;
  // deterministic sample: fixed-seed LCG -> Box-Muller, computed once so points never jump between updates
  var seed=123456789;
  var rand=function(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  var zs=[];
  for(var i=0;i<NPTS;i++){
    var u1=rand();if(u1<1e-12)u1=1e-12;
    var u2=rand(),m=Math.sqrt(-2*Math.log(u1));
    zs.push({a:m*Math.cos(2*Math.PI*u2),b:m*Math.sin(2*Math.PI*u2)});
  }
  var vals=function(){
    return {sx:sx?+sx.value:1,sy:sy?+sy.value:1,r:rho?+rho.value:0};
  };
  // closed-form 2x2 eigendecomposition of Sigma=[[sx^2,r*sx*sy],[r*sx*sy,sy^2]]
  var eig=function(v){
    var a=v.sx*v.sx,b=v.sy*v.sy,c=v.r*v.sx*v.sy;
    var d=Math.sqrt(((a-b)/2)*((a-b)/2)+c*c);
    return {th:.5*Math.atan2(2*c,a-b),l1:(a+b)/2+d,l2:(a+b)/2-d};
  };
  var render=function(){
    if(!svg)return;
    var v=vals(),e=eig(v);
    var cs=getComputedStyle(document.documentElement);
    var A=cs.getPropertyValue('--a').trim()||'#087f8c';
    var B=cs.getPropertyValue('--b').trim()||'#3267b2';
    var line=cs.getPropertyValue('--line').trim()||'#d8e3ea';
    var muted=cs.getPropertyValue('--muted').trim()||'#536b7a';
    var s='',i,u;
    for(u=-6;u<=6;u++){
      var gx=CX+u*K;
      s+='<line x1="'+gx.toFixed(1)+'" y1="0" x2="'+gx.toFixed(1)+'" y2="'+H+'" stroke="'+line+'" stroke-width="'+(u?'1':'1.5')+'"'+(u?' stroke-dasharray="3 4"':'')+'/>';
    }
    for(u=-4;u<=4;u++){
      var gy=CY-u*K;
      s+='<line x1="0" y1="'+gy.toFixed(1)+'" x2="'+W+'" y2="'+gy.toFixed(1)+'" stroke="'+line+'" stroke-width="'+(u?'1':'1.5')+'"'+(u?' stroke-dasharray="3 4"':'')+'/>';
    }
    [-4,-2,2,4].forEach(function(t){
      s+='<text x="'+(CX+t*K)+'" y="'+(CY+16)+'" direction="ltr" text-anchor="middle" fill="'+muted+'" font-size="11">'+t+'</text>';
    });
    [-4,-2,2,4].forEach(function(t){
      s+='<text x="'+(CX+6)+'" y="'+(CY-t*K+4)+'" direction="ltr" text-anchor="start" fill="'+muted+'" font-size="11">'+t+'</text>';
    });
    s+='<text x="604" y="'+(CY-8)+'" direction="ltr" fill="'+muted+'" font-size="13">x</text>';
    s+='<text x="'+(CX+8)+'" y="20" direction="ltr" fill="'+muted+'" font-size="13">y</text>';
    for(i=0;i<NPTS;i++){
      var z=zs[i];
      var X=v.sx*z.a,Y=v.sy*(v.r*z.a+Math.sqrt(1-v.r*v.r)*z.b);
      s+='<circle cx="'+(CX+X*K).toFixed(1)+'" cy="'+(CY-Y*K).toFixed(1)+'" r="3" fill="'+B+'" opacity=".5"/>';
    }
    // SVG y-axis points down, so the math-frame angle theta is drawn as -theta
    var deg=-(e.th*180/Math.PI);
    var ell=function(f,col){
      return '<ellipse cx="'+CX+'" cy="'+CY+'" rx="'+(f*Math.sqrt(e.l1)*K).toFixed(1)+'" ry="'+(f*Math.sqrt(e.l2)*K).toFixed(1)+'" fill="none" stroke="'+col+'" stroke-width="2.5" transform="rotate('+deg.toFixed(2)+' '+CX+' '+CY+')"/>';
    };
    s+=ell(2,B);
    s+=ell(1,A);
    s+='<line x1="'+(CX-6)+'" y1="'+CY+'" x2="'+(CX+6)+'" y2="'+CY+'" stroke="'+muted+'" stroke-width="1.5"/>';
    s+='<line x1="'+CX+'" y1="'+(CY-6)+'" x2="'+CX+'" y2="'+(CY+6)+'" stroke="'+muted+'" stroke-width="1.5"/>';
    s+='<rect x="'+(W-166)+'" y="10" width="156" height="66" rx="10" fill="none" stroke="'+line+'"/>';
    s+='<circle cx="'+(W-150)+'" cy="27" r="3" fill="'+B+'" opacity=".5"/>';
    s+='<text x="'+(W-140)+'" y="31" fill="'+muted+'" font-size="13">نمونه‌ها</text>';
    s+='<line x1="'+(W-156)+'" y1="48" x2="'+(W-128)+'" y2="48" stroke="'+A+'" stroke-width="2.5"/>';
    s+='<text x="'+(W-120)+'" y="52" fill="'+muted+'" font-size="13">بیضی ۱σ</text>';
    s+='<line x1="'+(W-156)+'" y1="66" x2="'+(W-128)+'" y2="66" stroke="'+B+'" stroke-width="2.5"/>';
    s+='<text x="'+(W-120)+'" y="70" fill="'+muted+'" font-size="13">بیضی ۲σ</text>';
    svg.innerHTML=s;
  };
  var upd=function(){
    if(!sx||!sy||!rho||!thEl||!r1El||!r2El||!expl)return;
    var v=vals(),e=eig(v),deg=e.th*180/Math.PI;
    thEl.textContent=deg.toFixed(1)+'°';
    r1El.textContent=Math.sqrt(e.l1).toFixed(2);
    r2El.textContent=Math.sqrt(e.l2).toFixed(2);
    var r=v.r,txt;
    if(r===0)txt='با ρ=۰ کوواریانس صفر است: بیضی نمی‌چرخد و محورهای اصلی با محورهای مختصات هم‌راستا هستند؛ محور بزرگ در جهت واریانس بزرگ‌تر است.';
    else if(r>0)txt='ρ مثبت: دو ویژگی معمولاً با هم زیاد می‌شوند و بیضی رو به بالا می‌چرخد (شیب مثبت).'+(r>=0.9?' چون ρ نزدیک ۱ است، داده‌ها تقریباً روی یک خط قرار می‌گیرند و بیضی به‌شدت باریک و کشیده شده است.':'');
    else txt='ρ سالب: رابطهٔ دو ویژگی معکوس است و بیضی رو به پایین می‌چرخد (شیب معکوس).'+(r<=-0.9?' چون |ρ| نزدیک ۱ است، داده‌ها تقریباً روی یک خط نزولی قرار می‌گیرند.':'');
    expl.textContent=txt+' زاویهٔ چرخش θ ≈ '+deg.toFixed(1)+' درجه است و نیم‌قطرهای بیضی √λ₊='+Math.sqrt(e.l1).toFixed(2)+' و √λ₋='+Math.sqrt(e.l2).toFixed(2)+' بر حسب σ هستند.';
    render();
  };
  if(sx)sx.oninput=upd;
  if(sy)sy.oninput=upd;
  if(rho)rho.oninput=upd;
  document.addEventListener('themechange',render);
  upd();
})();
