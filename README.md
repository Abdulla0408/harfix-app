# Harfix Mini App

Telegram ichida ochiladigan ilova. Hammasi brauzerda ishlaydi, server kerak emas:

- **O‘girish**: matnni yozasiz, natija yangi lotin, eski lotin yoki kirillda darhol chiqadi. Natijani nusxalash, botga yuborish yoki inline orqali istalgan chatga yuborish mumkin.
- **Alifbo**: o‘zgargan 4 ta harf, qoidalar va misollar, klaviatura bo‘yicha maslahat.
- **Test**: 10 ta savollik mashq.

`harfix.js` fayli `core/yangi_alifbo/converter.py` ning JavaScript nusxasi. U ham `core/tests/cases*.json` testlaridan o‘tishi shart:

```bash
node miniapp/tests/run.cjs
```

`online.js` — ilovalarning «online» qismi (reklama kartasi, e'lon, yangi versiya xabari). Shu fayl Android va Windows ilovalarida ham aynan bir xil turadi; test buni tekshiradi:

```bash
node miniapp/tests/online.cjs
```

## Kompyuterda ko‘rish

```bash
python -m http.server 8765 --directory miniapp
```

Keyin brauzerda http://localhost:8765 ni oching. Telegram tugmalari ("Botga yuborish", "Chatga yuborish") faqat Telegram ichida chiqadi.

## Internetda

Ilova GitHub Pages'da turadi: https://abdulla0408.github.io/harfix-app/
(repozitoriy: https://github.com/Abdulla0408/harfix-app). Bu manzil `bot/.env` dagi `MINIAPP_URL` da yozilgan.

`miniapp` papkasining o‘zi shu repozitoriyga ulangan git papka. O‘zgartirishni internetga chiqarish uchun:

```bash
cd miniapp
git add -A
git commit -m "Mini App yangilandi"
git push
```

1–2 daqiqadan keyin sayt yangilanadi. Telegram eski nusxani keshda saqlab qolsa, ilovani yopib qayta oching.

Telegram Mini App faqat **https** manzil bilan ishlaydi. Manzil o‘zgarsa, `MINIAPP_URL` ni yangilab, botni qayta ishga tushiring.

Bot ishga tushganda o‘zi menyu tugmasini (chat pastidagi "Harfix") va "📱 Harfix ilovasi" tugmasini qo‘yadi.

"Chatga yuborish" tugmasi ishlashi uchun botda inline rejim yoqilgan bo‘lishi kerak (@BotFather → /setinline).

## Reklama va sozlamalar: Boshqaruv paneli

Android, Windows va Mini App ilovalari internet bo‘lganda umumiy sozlamalarni o‘qiydi: reklama, homiylar, Yandex banneri, e'lon va «yangi versiya» xabari. Ularni **Boshqaruv panelida** o‘zgartirasiz:

**Botda: /admin → 📱 Ilovalar → 🛠 Boshqaruv paneli.** Telegram ichida Harfix ochiladi va unda **Admin** bo‘limi paydo bo‘ladi. Uni faqat bot adminlari ochadi; kirish 12 soat amal qiladi, keyin tugmani qayta bosasiz.

| Bo‘lim | Nima qiladi |
|---|---|
| 📊 Auditoriya | Har ilovada: o‘rnatilgan, bugun / 7 / 30 kunda faol |
| 📺 Reklama | Reklamani yoqish/o‘chirish; yangi foydalanuvchiga necha kun ko‘rsatilmasin (hozir 3) |
| 🤝 O‘z reklamangiz | Homiy kartalari: qo‘shish, tahrirlash, to‘xtatish, o‘chirish. Kartaning ko‘rinishi shu yerning o‘zida chiqadi |
| 🌐 Yandex (Android) | Yandex banneri: yoqish va blok ID |
| 📢 E'lon | Ilovalar tepasidagi xabar (matn, havola, qaysi ilovalarda, qachongacha) |
| ⬆️ Yangi versiya | Android va Windows uchun versiya raqami va yuklab olish havolasi |
| 📈 Anonim statistika | Kunlik anonim belgini hammasida o‘chirish/yoqish |

O‘zgartirgach, pastdagi **Saqlash** tugmasini bosing. Mini App keyingi ochilishida, Android va Windows esa ochilganda yoki 6 soat ichida yangi sozlamani oladi. Ilovalarni yangilash shart emas.

Tez yoqish/o‘chirish: **/admin → 📱 Ilovalar → 📺 Reklamani yoqish** (yoki o‘chirish).

Reklama qachon chiqmaydi (o‘zgarmas qoidalar):
- internet bo‘lmasa;
- sozlama shu kuni internetdan yuklanmagan bo‘lsa;
- yangi foydalanuvchiga birinchi kunlarda (panelda belgilangan son);
- Harfix klaviaturasida, belgilangan matn menyusida va boshqa ilovalarda — hech qachon.

### O‘z reklamangizni berish (homiy kartasi)

O‘z kanalingiz, mahsulotingiz yoki pul to‘lagan reklama beruvchi uchun:
1. Boshqaruv paneli → **🤝 O‘z reklamangiz** → **＋ Homiy qo‘shish**.
2. Yozing: **nomi**, **matn** (1–2 gap), **havola** (`@kanal`, `t.me/kanal` yoki `https://sayt.uz` — o‘zi https ga aylantiradi), tugma matni. Ixtiyoriy: rasm havolasi (kvadrat logotip), qaysi ilovalarda, boshlanish/tugash sanasi, ulush.
3. **Tayyor** → **📺 Reklama → Reklama yoqilgan** → **Saqlash**.

Karta «O‘girish» sahifasining pastida, **«Reklama»** belgisi bilan chiqadi; foydalanuvchi uni × bilan yopa oladi. Bir nechta homiy bo‘lsa, har ochilganda bittasi tanlanadi; «ulush» 2 bo‘lsa, ikki barobar ko‘p chiqadi. Tugash sanasi o‘tgach karta o‘zi to‘xtaydi. Reklama beruvchi bilan narx va muddatni o‘zingiz kelishasiz; to‘lov Harfix orqali o‘tmaydi.

### Yandex tarmoq reklamasi (faqat Android)

Yandex reklamani o‘zi topadi va ko‘rsatilgani uchun sizga to‘laydi:
1. Yandex reklama tarmog‘ida (Yandex Ads / РСЯ) ro‘yxatdan o‘ting, Harfix ilovasini qo‘shing va **banner** reklama bloki oching. Blok ID `R-M-1234567-1` ko‘rinishida bo‘ladi.
2. Boshqaruv paneli → **🌐 Yandex reklamasi** → yoqing va blok ID ni yozing.
3. **📺 Reklama → Reklama yoqilgan** → **Saqlash**.

Banner Android ilova oynasining eng pastida chiqadi (yozayotganda yashirinadi). Avval sinab ko‘rish uchun Yandex'ning namuna bloki: `demo-banner-yandex`.

Windows uchun mos reklama tarmog‘i yo‘q, u yerda homiy kartasi ishlaydi. Mini App esa shu saytning o‘zi: kerak bo‘lsa, Telegram Mini App reklama tarmog‘ini istalgan kuni qo‘shsa bo‘ladi, foydalanuvchilar hech narsa yangilamaydi.

### Sozlamalar qayerda saqlanadi

Supabase'da (`Abdulla0408's Project`, `harfix.config` jadvali). Ilovalar ularni faqat o‘qiy oladi (`harfix_config`); saqlashni faqat bot bergan admin sessiyasi qiladi (`harfix_admin_save`).

Shu papkadagi **`config.json` — zaxira nusxa**: Supabase'ga ulanib bo‘lmasa, ilovalar uni o‘qiydi. Unda reklama o‘chiq, ya'ni nosozlik bo‘lsa ilovalar reklamasiz ishlayveradi. Uni o‘zgartirish shart emas; o‘zgartirsangiz, tekshiring:

```bash
node miniapp/tests/online.cjs
```

### Anonim statistika

Ilovalar kuniga bir marta faqat «ishlatildi» belgisini yuboradi: tasodifiy raqam (o‘rnatilganda yaratiladi), platforma va versiya. Ism, Telegram akkaunt, telefon raqami, yozilgan matn yoki fayl yuborilmaydi. Foydalanuvchi buni ilova sozlamalarida o‘chira oladi; hammasida birdan o‘chirish: Boshqaruv paneli → 📈 Anonim statistika.

- Raqamlar botda: **/admin → 📱 Ilovalar** (o‘rnatilgan, yangi, bugun/7/30 kunda faol, versiyalar, 14 kunlik jadval) va Boshqaruv panelining «📊 Auditoriya» bo‘limida.
- Ma'lumotlar Supabase'da (`Abdulla0408's Project`, `harfix` sxemasi). Ilovalar faqat `harfix_ping` funksiyasini chaqira oladi; jadvallarni o‘qib bo‘lmaydi. Botdagi raqamlar `bot/.env` dagi `APP_STATS_KEY` bilan o‘qiladi.
- Bepul Supabase loyihasi bir hafta hech kim murojaat qilmasa «uxlab» qoladi. Foydalanuvchilar bo‘lsa, har kuni murojaat bo‘ladi. Uxlab qolsa: supabase.com → loyiha → **Restore**. Bu vaqtda ilovalar oddiygidek ishlayveradi.
