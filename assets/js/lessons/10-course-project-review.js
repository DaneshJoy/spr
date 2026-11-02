;
(function(){
  var g=function(id){return document.getElementById(id)};
  var svg=g('l10-flow'),detail=g('l10-detail'),box=g('l10-check'),prog=g('l10-prog');
  if(!svg)return;
  var css=function(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim()};
  var FA='۰۱۲۳۴۵۶۷۸۹';
  var fa=function(n){return String(n).replace(/\d/g,function(d){return FA[+d]})};
  var NW=112,NH=74,CY=150,MX=20,SP=142;
  var STEPS=[
    {name:'مدل‌سازی',art:'توزیع‌ها و فرض‌ها',d:'مدل‌سازی: برای هر کلاس یک توزیع احتمال انتخاب می‌کنی (اینجا: گاوسی) و فرض‌هایت را صریح می‌نویسی — استقلال نمونه‌ها، شکل کوواریانس و پیشین کلاس‌ها. نقشهٔ این مرحله در درس ۱ (استدلال بیزی) و درس ۷ (گاوسی و کوواریانس) است.'},
    {name:'آموزش',art:'پارامترهای تخمین‌شده',d:'آموزش: میانگین‌ها، ماتریس کوواریانس و پیشین‌ها را فقط از دادهٔ آموزش تخمین می‌زنی؛ MLE جوابِ «فقط داده» را می‌دهد و MAP پیشین را هم جریمه می‌کند و در دادهٔ کم پایدارتر است. راهنمای این مرحله درس ۲ است.'},
    {name:'تصمیم',art:'آستانهٔ بهینه',d:'تصمیم: پسین هر کلاس را حساب می‌کنی و با توجه به ماتریس هزینه، آستانه را انتخاب می‌کنی؛ هزینهٔ نامتقارن خطاها آستانه را از ۰٫۵ جابه‌جا می‌کند. راهنمای این مرحله درس ۴ است.'},
    {name:'ارزیابی',art:'ROC و درهم‌ریختگی',d:'ارزیابی: روی دادهٔ دست‌نخوردهٔ آزمون، ماتریس درهم‌ریختگی را می‌سازی، TPR/FPR را با مخرج درست حساب می‌کنی و منحنی ROC و AUC را گزارش می‌کنی. راهنمای این مرحله درس ۵ و درس ۶ است.'},
    {name:'گزارش',art:'گزارش و محدودیت‌ها',d:'گزارش: داده، فرض‌ها، روش تقسیم، نتایج و مهم‌تر از همه محدودیت‌ها را می‌نویسی و بذر تصادفی و نسخهٔ ابزارها را ثبت می‌کنی تا هر کسی بتواند نتیجه‌ات را بازتولید کند.'}
  ];
  var sel=-1;
  var cx=function(s){return MX+NW/2+(5-s)*SP};
  var render=function(){
    var A=css('--a')||'#087f8c',CARD=css('--card')||'#ffffff',TEXT=css('--text')||'#172b3a',MUT=css('--muted')||'#536b7a',LINE=css('--line')||'#d8e3ea';
    var s='<defs><marker id="l10-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="11" markerHeight="11" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0L10 5L0 10Z" fill="'+MUT+'"/></marker></defs>';
    // چرخهٔ بهبود: ارزیابی (۴) → آموزش (۲)
    s+='<path d="M '+cx(4)+' 106 C '+cx(4)+' 54, '+cx(2)+' 54, '+cx(2)+' 106" fill="none" stroke="'+MUT+'" stroke-width="1.5" stroke-dasharray="6 5" marker-end="url(#l10-ar)"/>';
    s+='<text x="360" y="42" text-anchor="middle" font-size="12" fill="'+MUT+'">چرخهٔ بهبود: اگر ارزیابی ضعیف بود، به آموزش برگرد</text>';
    // پیکان‌های جریان: مرحلهٔ s به s+1 (در RTL از راست به چپ)
    for(var i=1;i<=4;i++){
      s+='<line x1="'+(cx(i)-NW/2-4).toFixed(0)+'" y1="'+CY+'" x2="'+(cx(i+1)+NW/2+8).toFixed(0)+'" y2="'+CY+'" stroke="'+MUT+'" stroke-width="2" marker-end="url(#l10-ar)"/>';
    }
    STEPS.forEach(function(st,i){
      var sn=i+1,x=cx(sn),on=(i===sel);
      s+='<g role="button" tabindex="0" data-step="'+sn+'" aria-label="مرحلهٔ '+fa(sn)+': '+st.name+'" cursor="pointer">';
      s+='<rect x="'+(x-NW/2)+'" y="'+(CY-NH/2)+'" width="'+NW+'" height="'+NH+'" rx="16" fill="'+(on?A:CARD)+'" stroke="'+(on?A:LINE)+'" stroke-width="2"/>';
      s+='<text x="'+x+'" y="'+(CY-6)+'" text-anchor="middle" font-size="11.5" fill="'+(on?CARD:MUT)+'">مرحلهٔ '+fa(sn)+'</text>';
      s+='<text x="'+x+'" y="'+(CY+18)+'" text-anchor="middle" font-size="15.5" font-weight="800" fill="'+(on?CARD:TEXT)+'">'+st.name+'</text>';
      s+='</g>';
      s+='<text x="'+x+'" y="214" text-anchor="middle" font-size="11.5" fill="'+MUT+'">'+st.art+'</text>';
    });
    s+='<text x="360" y="254" text-anchor="middle" font-size="13" fill="'+MUT+'">خروجی هر مرحله، ورودی مرحلهٔ بعد است؛ برای جزئیات روی هر مرحله کلیک کن.</text>';
    svg.innerHTML=s;
    var ns=svg.querySelectorAll('[data-step]');
    Array.prototype.forEach.call(ns,function(node){
      var i=+node.getAttribute('data-step')-1;
      node.addEventListener('click',function(){pick(i)});
      node.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(i);}});
    });
  };
  var pick=function(i){
    sel=i;
    render();
    if(detail)detail.textContent=STEPS[i].d;
  };
  var updProg=function(){
    if(!box||!prog)return;
    var ins=box.querySelectorAll('input[type="checkbox"]'),n=0;
    Array.prototype.forEach.call(ins,function(c){if(c.checked)n++});
    prog.textContent=fa(n)+' از ۵ مرحله تکمیل شد';
  };
  if(box)box.addEventListener('change',updProg);
  document.addEventListener('themechange',render);
  render();
  updProg();
})();
