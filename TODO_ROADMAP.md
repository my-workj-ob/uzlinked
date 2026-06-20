# 🚀 VibeGrid Product Roadmap & TODO

Ushbu hujjat VibeGrid loyihasining kelgusi rivojlanish bosqichlari uchun mo'ljallangan strategik rejalarni, UX/UI takomillashtirishlari va 10 ta "Oltin Xususiyat"ni o'z ichiga oladi. Hozirgi bosqichda tizimni barqarorlashtirib, Beta-test sinovlarini boshlaymiz, kelajakda esa ushbu roadmap asosida loyihani boyitib boramiz.

---

## 🎨 5 ta Muhim UX/UI Yaxshilanishlari

### 1. 🔍 Explore (Kashf etish) Sahifasi
* **Tavsif:** Ommaviy guruhlar va kanallarni topish uchun alohida sahifa.
* **Tarkibi:** Sahifaning eng yuqori qismida qidiruv paneli (Search bar) va ostida tezkor filtrlash teglari joylashadi: `#IT`, `#Dizayn`, `#Marketing`, `#Vakansiyalar`.
* **Algoritmi:** Qidiruv va reyting natijalari guruh/kanallarning obunachilar soni va oxirgi 24 soat ichidagi faolligi (yozilgan postlar soni) asosida tartiblanib, eng tepadan pastga qarab tiziladi.

### 2. 💬 Haqiqiy Chat Tajribasi (Dynamic Input UI)
* **Auto-resizing Textarea:** Foydalanuvchi matn yozganda input balandligi dinamik o'zgaradi (1 qatordan boshlab maksimal 5 qatorgacha kengayadi, undan oshganda ichki scroll paydo bo'ladi).
* **Uchlik Tugmalar Tizimi:** 
  - Inputning chap tomonida fayl/rasm biriktirish uchun **Qisqich (Paperclip) 📎** ikonasi.
  - O'ng tomonida **Smajliklar (Emoji Picker) 😊** tugmasi.
  - O'ng chekkada faqat matn yozilgandagina faollashib ko'k/yashil rangda yonadigan **Yuborish (Send)** tugmasi.

### 3. 📢 Guruh va Kanallar Uchun Rich Media Qurollari
* **Kechiktirilgan Postlar (Scheduled Posts):** Adminlar matn yoki mediani belgilangan vaqtda (masalan, ertaga 08:00 da) avtomatik chop etish uchun taymer qo'ya olishi.
* **Shovqinsiz Xabar (Silent Broadcast):** Obunachilarning telefoniga tovushli push-bildirishnoma yubormasdan xabarni jimgina kanalga joylash imkoniyati.
* **Ovoz Berish (Polls / Quizzes):** Telegramdagi kabi variantli so'rovnomalar va testlar yaratish tizimi.

### 4. 🔗 URL va @usernamelarni Avtomatik Aniqlash (Linkification)
* **Mantiq:** Matn ekranga chiqishidan oldin frontendda maxsus RegEx (muntazam ifoda) süzgichidan o'tadi.
* **URL havolalar:** `http://` yoki `https://` bilan boshlangan so'zlar avtomatik ravishda `<a href="..." target="_blank">` tegiga o'raladi.
* **@nickname havolalar:** `@` bilan boshlangan so'zlar foydalanuvchi profiliga yo'naltiruvchi havola bo'ladi.
* **Mini Profil Kartochkasi (Hover Card):** Sichqoncha ko'rsatkichi `@username` ustiga borganda, u haqida qisqacha ma'lumot beruvchi mitti profil kartochkasi (Hover Card) qalqib chiqadi.

### 5. ⚡ Micro-UX Qulayliklari
* **"Tepaga ketib qoldim" Tugmasi:** Chatda yuqoridagi xabarlarni o'qiyotgan foydalanuvchiga pastga tez qaytishi uchun o'ng pastki burchakda mitti **Pastga O'q (↓)** tugmasi chiqadi. Unda o'qilmagan yangi xabarlar soni ko'rsatiladi.
* **Swipe to Reply:** Mobil qurilmalarda xabarni barmoq bilan chapga sal surish orqali avtomatik ravishda unga javob yozish (Reply) rejimini faollashtirish.

---

## 🔥 VIBEGRID UCHUN 10 TA "OLTIN XUSUSIYAT"

### 1. 🟢 Realtime Presence ("Kim onlayn?" va "Yozmoqda...")
* Suhbatdosh profilida yoki chat ro'yxatida u faol bo'lsa, ismi yonida yashil nuqta yonib turadi.
* Suhbatdosh yozayotgan paytda pastda mitti kulrang yozuvda `“uz_coder_06 yozmoqda...”` deb realtime holat chiqib turadi.

### 2. 📂 Chat Papkalari (Custom Chat Folders)
* Suhbatlar ro'yxatini toza saqlash uchun yuqori qismda chatlarni toifalarga ajratuvchi tablar: `[Barchasi]`, `[Kanallar]`, `[Ish]`, `[Shaxsiy]`. Foydalanuvchilar o'z ehtiyojlariga qarab yangi papkalar yarata oladilar.

### 3. 👁️ Xabar Maqomi (Double-Tick Tizimi)
* **Bitta kulrang ptichka (✓):** Xabar muvaffaqiyatli yuborildi.
* **Ikkita ko'k ptichka (✓✓):** Suhbatdosh chatni ochib, xabarni o'qidi.

### 4. 🎤 Ovozli Xabarlar (Voice Notes) + AI Transkripsiya
* Mikrofonga bosib ovozli xabar yuborish imkoniyati.
* Ovozli xabar ostida **[Matnga o'tkazish]** tugmasi bo'lib, u orqali AI ovozni matnga o'girib beradi (majlisda yoki darsda ovoz eshitolmaydigan foydalanuvchilar uchun qulay).

### 5. 💬 Kanallar Uchun "Izohlar Zanjiri" (Channel Comments)
* Kanaldagi har bir post tagida muhokama qilish uchun **[💬 Izohlar]** tugmasi joylashadi. Unga bosganda post ostida alohida izohlar zanjiri ochiladi (Telegram kanallaridagi muhokama guruhlari kabi).

### 6. 🔔 Markaziy Bildirishnomalar Minorasi (Global Activity Hub)
* Yuqoridagi bildirishnomalar menyusi uchta alohida bo'limga ajratiladi:
  - **Reaksiyalar:** Kim sizning postingizga qanday emoji qoldirdi.
  - **Eslatmalar:** Sizni guruhlarda kim `@` orqali chaqirdi.
  - **Moliya:** Kim sizga qancha "Tip" (rahmatnoma to'lovi) yubordi.

### 7. 📁 Chat Ichidagi Media Galereya (Shared Media Tab)
* Chat yoki guruh sozlamalarida ushbu suhbat doirasida yuborilgan barcha rasmlar, fayllar va havolalarni alohida toifalar bo'yicha arxivlovchi tablar jamlanmasi.

### 8. 🔄 Mualliflikni Saqlagan Holda "Uzatish" (Forwarding with Attribution)
* Post yoki xabarni boshqa chatga uzatganda, xabar tepasida **"Manba: @UZB kanali"** degan bosiluvchi havola paydo bo'ladi. Bu kanallarning virusli tarzda bepul tarqalishiga xizmat qiladi.

### 9. 📝 Qoralamalar (Drafts)
* Kiritilayotgan matn har 2 soniyada brauzerning `localStorage` xotirasiga saqlab boriladi. Agar foydalanuvchi yozishni tugatmasdan chatdan chiqib ketsa, chat ro'yxatidagi ushbu suhbat yonida qizil rangli `[Qoralama]` yozuvi chiqadi.

### 10. ⚡ IndexedDB yordamida Zero-Latency Chat Keshi
* Saytga kirganda oldingi xabarlar aylanib turmasdan (Loading...), IndexedDB keshidan 0.01 soniyada ko'rsatiladi. Orqa fonda esa Supabase'dan faqat oxirgi yangi xabarlar tortib olinib, ro'yxat ostiga silliq qo'shiladi.

---

## 🛠️ Beta-Testing Rejasi
Hozirgi ustuvor vazifa — ushbu funksiyalarni darhol kodlash emas, balki loyihani barqaror ishlab turgan holda **10 ta eng yaqin do'stingizga** tarqatish. Ular tizimda haqiqiy guruhlar ochib, postlar yozib ko'rgandagina real muhitdagi xatoliklar va foydalanish qulayliklari (UX) yuzaga chiqadi. Sinovlar davomida topilgan xatolar ushbu roadmapga qo'shib boriladi.
