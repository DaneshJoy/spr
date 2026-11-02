;
function upd(){let h=+heads.value,a=+prior.value;hv.textContent=h;av.textContent=a;ml.textContent=(h/10).toFixed(3);map.textContent=((h+a-1)/(10+2*a-2)).toFixed(3);expl.textContent=`پسین Beta(${a+h}, ${a+10-h}) است. با افزایش a، پیشین متقارن قدرت بیشتری پیدا می‌کند.`}heads.oninput=upd;prior.oninput=upd;upd();
