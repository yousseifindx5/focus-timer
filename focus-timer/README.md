# Focus Timer

برنامج Pomodoro للـ Desktop (Windows أساساً، وLinux/macOS مستقبلاً) مبني بـ Electron + React + TypeScript.

## عمل ملف الـ exe

1. نزّل وسطّب [Node.js LTS](https://nodejs.org) (مرة واحدة).
2. دبل كليك على **`Build.bat`**.
3. في الآخر هيفتح لوحده فولدر **`Output`** وفيه الملفين المهمين بس:
   - `Focus-Timer-Setup-1.0.0.exe` - مثبّت (ده اللي بيترفع في الـ Release)
   - `Focus-Timer-Portable-1.0.0.exe` - نسخة بتشتغل من غير تثبيت

فولدر `release` فيه ملفات مؤقتة للبناء (زي `win-unpacked`) - تجاهله.

> لو ظهر خطأ `Cannot create symbolic link`: شغّل `Build.bat` كـ Administrator أو فعّل Developer Mode في ويندوز.

## GitHub Actions

| الملف | بيعمل إيه |
|---|---|
| `.github/workflows/test.yml` | على كل push وPull Request: فحص الأنواع + الاختبارات + بناء الواجهة |
| `.github/workflows/release.yml` | لما تعمل tag بيبني الـ exe على سيرفر Windows وينشر الـ Release لوحده |

لعمل Release جديد:
```
git tag v1.0.0
git push origin v1.0.0
```
بعد دقايق هتلاقي الملفين في تبويب **Releases** (رقم النسخة بياخده من الـ tag).
لازم تفعّل: Settings > Actions > General > Workflow permissions > **Read and write permissions**.

## التطوير
```
npm install
npm run dev         # تشغيل مع live-reload
npm start           # بناء + تشغيل
npm run typecheck   # فحص الأنواع
npm test            # الاختبارات
```

## هيكل المشروع
```
Build.bat / Build.sh     بناء الـ exe (Windows) / (Linux, macOS)
electron/                نافذة البرنامج (main + preload)
src/store.ts             حالة البرنامج + منطق التايمر والمهام والإشعارات
src/game.ts              السلسلة (streak) + XP + المستويات + الشارات
src/stats.ts             حسابات الملخصات
src/audio.ts             الأصوات (مولّدة بالكود، مفيش ملفات صوت)
src/themes.ts            الثيمات ومولّد الثيمات
src/pages/               Timer / Tasks / Stats / Streak / Sounds / Settings
src/__tests__/           الاختبارات
build/icon.png           أيقونة البرنامج (PNG 512x512)
```

## ملاحظات
- البيانات بتتحفظ تلقائياً على جهازك، ومن الإعدادات تقدر تعمل تصدير/استيراد نسخة احتياطية.
- الجمعة والسبت هم عطلة نهاية الأسبوع في شارة "محارب العطلة" (غيّرهم من `WEEKEND_DAYS` في `src/types.ts`).
- ميعاد المهمة (Deadline): لو عدّى من غير ما تنجزها بيظهر إشعار مرة واحدة وتفضل في القائمة بلون أحمر، ولو أنجزتها بيتسجل إنها اتنجزت في ميعادها أو متأخرة.

## الخطط المستقبلية
- الربط مع Notion
- زرار تبرع (Donate)
- نسخ Linux وmacOS
