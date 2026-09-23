# 🎮 Siksaan Penonton (Streamer vs Chat Roguelike)

![Siksaan Penonton Gameplay Preview](preview.png)

**Siksaan Penonton** adalah game 2D Top-Down Action Roguelike interaktif bertema **Livestreamer vs Chat Penonton** yang terinspirasi dari game survival seperti *Vampire Survivors*.

---

## 🌟 Fitur Utama

1. **Auto-Attack Combat & Wave Survival**:
   - Senjata menembak otomatis (*Plasma Bolt*, *Orbiting Fireballs*, dll).
   - Menghadapi gerombolan musuh (*Glitch Bat*, *Zombie Drone*, *Cyber Shooter*, *Heavy Golem*, dan *Titan Tormentor Boss*).
   - Kumpulkan Kristal XP untuk menaikkan level streamer.

2. **Mekanik Inti: Voting Siksaan Penonton**:
   Setiap kali naik level atau siklus 2 menit tiba, game akan berhenti sejenak untuk memunculkan **Voting Penonton** selama 15 detik:
   - **Kategori Berkah (Buff)**:
     - ⚡ *Speed Demon*: Kecepatan gerak bertambah +35%.
     - 🩸 *Vampiric Touch*: Lifesteal 8% memulihkan darah saat membunuh musuh.
     - 💥 *Nuclear Blast*: Menghancurkan seluruh musuh di layar seketika.
     - 🔥 *Rapid Fire*: Cooldown senjata 40% lebih cepat.
     - 🧲 *Magnet Storm*: Menyerap semua kristal XP di peta seketika.
     - ⚔️ *Titan Might*: Damage senjata +50%.
     - 🛡️ *Aegis Shield*: Kebal selama 12 detik.
   - **Kategori Kutukan (Siksaan / Chaos)**:
     - 🌑 *Blind Faith*: Layar gelap gulita (*Fog of War* 75%) selama 25 detik.
     - 🧈 *Butter Fingers*: Senjata utama terjatuh di lantai, pemain harus berlari mengambilnya kembali!
     - 🌀 *Inverted Reality*: Kontrol gerak terbalik (W jadi S, A jadi D) selama 20 detik.
     - ⛸️ *Slippery Floor*: Efek lantai es licin dengan inersia tinggi selama 25 detik.
     - 👹 *Enemy Hyperdrive*: Kecepatan gerak musuh naik +60% selama 18 detik.
     - 👾 *Boss Inbound*: Penonton langsung memanggil Boss Titan Raksasa ke arena!
     - 🌋 *Magma Eruption*: Kolam lava mendidih muncul acak di tanah selama 20 detik.

3. **Simulasi Chat AI & Integrasi Twitch Live Asli**:
   - **Simulated Chat**: Menghadirkan 30+ kepribadian penonton fiktif (SultanDonatur, BocilKematian, WibuAkut, ModGalak, dll) yang aktif mengomentari situasi permainan dan spam voting `!1`, `!2`, `!3`.
   - **Real Twitch Connect**: Hubungkan nama channel Twitch untuk membaca voting penonton asli secara real-time via WebSocket TMI!

4. **Audio Synthesizer (Web Audio API)**:
   - 100% bebas error CORS, menghasilkan musik chiptune retro dinamis dan efek suara 8-bit.

---

## 🕹️ Kontrol Permainan

- **PC**:
  - `W` / `A` / `S` / `D` atau `Tombol Panah`: Bergerak
  - `1` / `2` / `3`: Memilih pilihan voting
  - `M`: Toggle Mute Suara
- **Mobile / Touch**:
  - Sentuh & geser layar untuk Virtual Joystick
  - Ketuk kartu voting untuk memilih
