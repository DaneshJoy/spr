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

نشانی سایت: https://daneshjoy.github.io/spr/

برای انتشار، در تنظیمات GitHub Pages گزینهٔ **Source: GitHub Actions** را فعال کنید.
