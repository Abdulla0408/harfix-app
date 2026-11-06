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

## Internetga joylash (GitHub Pages, bepul)

Telegram Mini App faqat **https** manzil bilan ishlaydi. Eng oson yo‘l: GitHub Pages.

1. github.com da yangi **public** repozitoriy oching, masalan `harfix`.
2. **Add file → Upload files** ni bosing va `miniapp` papkasidagi `index.html`, `style.css`, `app.js`, `harfix.js` fayllarini yuklang. `tests` papkasi kerak emas.
3. **Settings → Pages → Branch: main / (root) → Save**.
4. 1–2 daqiqadan keyin manzil chiqadi: `https://<login>.github.io/harfix/`.
5. Shu manzilni `bot/.env` ga yozing: `MINIAPP_URL=https://<login>.github.io/harfix/`, keyin botni qayta ishga tushiring.

Bot ishga tushganda o‘zi menyu tugmasini (chat pastidagi "Harfix") va "📱 Harfix ilovasi" tugmasini qo‘yadi.

"Chatga yuborish" tugmasi ishlashi uchun botda inline rejim yoqilgan bo‘lishi kerak (@BotFather → /setinline).
