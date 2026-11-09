# پردازش آماری الگو

دورهٔ «پردازش آماری الگو» برای دانشگاه شاهد است؛ مقطع کارشناسی ارشد و دکتری.

- `index.html` فهرست مسیر یادگیری و نقطهٔ شروع است.
- `lessons/` قطعهٔ محتوای هر درس است.
- `templates/layout.html` پوستهٔ مشترک صفحات است.
- `assets/` کدهای مشترک CSS و JavaScript است.
- `build.py` محتوا و پوسته را ترکیب کرده و خروجی نهایی را در `dist/` می‌سازد.

```sh
npm ci
npm run check
# پیش‌نمایش لوکال (ساخت + سرور روی http://localhost:3000):
npm run dev
```

## بستهٔ آفلاین دانشجویی

برای ساخت بستهٔ تک‌فایلی برای هر کلاس (بدون اینترنت، Node.js یا نصب چیزی):

```sh
npm ci
npm run package:offline
```

خروجی در `offline/statistical-pattern-recognition-offline.zip` ساخته می‌شود: `index.html` در ریشهٔ بسته است و فونت وزیرمتن و MathJax (با فونت‌های فرمول) داخل خود بسته کپی می‌شوند.

**راهنمای ویندوز برای دانشجو:** فایل ZIP را با راست‌کلیک و «Extract All…» کامل استخراج کنید، سپس `index.html` را در Microsoft Edge، Chrome یا Firefox باز کنید. به اینترنت، Node.js یا سرور محلی نیاز نیست؛ فرمول‌ها با MathJax محلی رندر می‌شوند.

ساخت بسته به میزبان POSIX با `npm` و `python3` نیاز دارد؛ روی ویندوز از WSL استفاده کنید.

نشانی سایت: https://daneshjoy.github.io/spr/

برای انتشار، در تنظیمات GitHub Pages گزینهٔ **Source: GitHub Actions** را فعال کنید.
