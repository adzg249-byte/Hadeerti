# حضيرتي — أساس متعدد المنصات

هذا مشروع تطوير مبني على واجهة حضيرتي الموجودة، ومجهز كقاعدة لتطبيق Android وiOS عبر Capacitor. **ليس APK أو تطبيق iOS جاهزًا بعد.**

## الحالة الحالية
- واجهة إدارة الحضيرة موجودة داخل `www/index.html`.
- أضيفت واجهة تسجيل/إنشاء حساب بالبريد وكلمة المرور عبر Firebase Authentication.
- أضيفت طبقة أولية للمزامنة مع Realtime Database تحت `users/{uid}/data`، وتستخدم مساحة منفصلة لكل مستخدم.
- أضيف ملف إعداد `www/firebase-config.js` بقيم نائبة، فلا يتصل التطبيق بالسحابة حتى تُملأ من إعدادات Firebase.
- أضيفت قواعد قاعدة بيانات تمنع القراءة والكتابة العامة وتسمح للمستخدم المسجل ببيانات مساره فقط.

## ربط Firebase
1. في Firebase Console > Project settings > General > Your apps، أضف تطبيق Web (`</>`) باسم `Hadheerti Web` فقط للحصول على إعدادات SDK؛ هذا **لا يحوّل المنتج إلى موقع بدل التطبيق**. Capacitor يعرض نفس الواجهة كتطبيق Android/iOS.
2. انسخ القيم العامة من إعدادات SDK إلى `www/firebase-config.js` (apiKey, authDomain, databaseURL, projectId, storageBucket, messagingSenderId, appId). لا تضع service-account JSON أو أي مفتاح خاص.
3. في Authentication فعّل Email/Password.
4. راجع `firebase-database.rules.json` وانشر القواعد في Realtime Database Rules. لا تفتح القراءة أو الكتابة للجميع.
5. اختبر إنشاء حساب جديد أولًا. لا تستخدم بيانات مهمة قبل تجربة النسخ الاحتياطي والاستعادة والمزامنة على جهازين.

## البناء
- يتطلب Node.js وnpm وAndroid SDK لبناء APK، وmacOS مع Xcode لبناء تطبيق iOS.
- أوامر بعد تثبيت الاعتماديات: `npm install`, `npx cap add android`, `npx cap add ios` (iOS على macOS فقط), `npx cap sync`.
- لم يتم بناء أو اختبار APK/iOS فعليًا في هذه البيئة.

## حدود النسخة
المزامنة المضافة نسخة أولية: يجب اختبار تعارض التعديلات المتزامنة بعناية قبل الاعتماد اليومي. البيانات القديمة تبقى محلية حتى تسجّل الدخول وتوافق على رفعها لأول مرة. لا تمسح بيانات المتصفح القديم قبل تصدير نسخة احتياطية.
