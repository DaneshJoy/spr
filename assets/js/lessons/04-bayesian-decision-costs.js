;
function calc(){let p=+prob.value/100,a=+fp.value,b=+fn.value,t=a/(a+b),x=a*(1-p),y=b*p;pv.textContent=p.toFixed(2);fpv.textContent=a;fnv.textContent=b;thr.textContent=t.toFixed(3);rp.textContent=x.toFixed(3);rn.textContent=y.toFixed(3);decision.textContent=x<y?'تصمیم کم‌ریسک: مثبت':x>y?'تصمیم کم‌ریسک: منفی':'هر دو تصمیم ریسک برابر دارند'}[prob,fp,fn].forEach(x=>x.oninput=calc);calc();
