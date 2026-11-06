# Harfix Mini App

Telegram ichida ochiladigan ilova. Hammasi brauzerda ishlaydi, server kerak emas:

- **O‘girish**: matnni yozasiz, natija yangi lotin, eski lotin yoki kirillda darhol chiqadi. Natijani nusxalash, botga yuborish yoki inline orqali istalgan chatga yuborish mumkin.
- **Alifbo**: o‘zgargan 4 ta harf, qoidalar va misollar, klaviatura bo‘yicha maslahat.
- **Test**: 10 ta savollik mashq.

`harfix.js` fayli `core/yangi_alifbo/converter.py` ning JavaScript nusxasi. U ham `core/tests/cases*.json` testlaridan o‘tishi shart:

```bash
node miniapp/tests/run.cjs
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
