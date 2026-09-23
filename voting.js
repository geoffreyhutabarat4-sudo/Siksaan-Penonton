// ================================================================
// SIKSAAN PENONTON — Voting & Twitch Chat System
// Simulated AI Chat + Real Twitch IRC WebSocket Integration
// ================================================================
'use strict';

// ── VOTING OPTIONS DATABASE ──────────────────────────────────────
const VOTING_POOL = {
  buffs: [
    {
      id: 'speed_demon',
      type: 'buff',
      name: '⚡ Speed Demon',
      badge: 'BERKAH',
      desc: 'Kecepatan gerak pemain meningkat +35% permanen!',
      icon: '⚡',
      apply: (game) => {
        game.player.speedMultiplier *= 1.35;
        game.addBanner('⚡ BERKAH: SPEED DEMON (+35% Kecepatan Gerak!)', '#00ff88');
      }
    },
    {
      id: 'vampiric_touch',
      type: 'buff',
      name: '🩸 Vampiric Touch',
      badge: 'BERKAH',
      desc: 'Peluang 8% memulihkan darah (HP) setiap membunuh musuh!',
      icon: '🩸',
      apply: (game) => {
        game.player.lifestealChance = (game.player.lifestealChance || 0) + 0.08;
        game.addBanner('🩸 BERKAH: VAMPIRIC TOUCH (Lifesteal Aktif!)', '#ff4d88');
      }
    },
    {
      id: 'nuclear_blast',
      type: 'buff',
      name: '💥 Nuclear Blast',
      badge: 'BERKAH',
      desc: 'Hancurkan SEMUA musuh di layar seketika & ubah jadi XP!',
      icon: '💥',
      apply: (game) => {
        game.triggerNuke();
        game.addBanner('💥 BERKAH: NUCLEAR BLAST (Arena Dibersihkan!)', '#ffe600');
      }
    },
    {
      id: 'rapid_fire',
      type: 'buff',
      name: '🔥 Rapid Fire',
      badge: 'BERKAH',
      desc: 'Semua senjata menembak 40% lebih cepat!',
      icon: '🔥',
      apply: (game) => {
        game.player.cooldownReduction = Math.max(0.3, (game.player.cooldownReduction || 1) * 0.6);
        game.addBanner('🔥 BERKAH: RAPID FIRE (Serangan Super Cepat!)', '#ff8800');
      }
    },
    {
      id: 'magnet_storm',
      type: 'buff',
      name: '🧲 Magnet Storm',
      badge: 'BERKAH',
      desc: 'Menarik SELURUH bola XP di seluruh map langsung ke pemain!',
      icon: '🧲',
      apply: (game) => {
        game.collectAllGems();
        game.addBanner('🧲 BERKAH: MAGNET STORM (Semua XP Terserap!)', '#00e5ff');
      }
    },
    {
      id: 'titan_might',
      type: 'buff',
      name: '⚔️ Titan Might',
      badge: 'BERKAH',
      desc: 'Damage semua senjata meningkat +50% & ukuran peluru membesar!',
      icon: '⚔️',
      apply: (game) => {
        game.player.damageMultiplier = (game.player.damageMultiplier || 1) * 1.5;
        game.addBanner('⚔️ BERKAH: TITAN MIGHT (+50% Weapon Damage!)', '#ff0055');
      }
    },
    {
      id: 'holy_shield',
      type: 'buff',
      name: '🛡️ Aegis Shield',
      badge: 'BERKAH',
      desc: 'Kebal dari semua serangan musuh selama 12 detik!',
      icon: '🛡️',
      apply: (game) => {
        game.activateStatus('holy_shield', 12);
        game.addBanner('🛡️ BERKAH: AEGIS SHIELD (Kebal 12 Detik!)', '#4da6ff');
      }
    }
  ],
  curses: [
    {
      id: 'blind_faith',
      type: 'curse',
      name: '🌑 Blind Faith',
      badge: 'KUTUKAN',
      desc: 'Layar menjadi gelap 75% (Fog of War) selama 25 detik!',
      icon: '🌑',
      apply: (game) => {
        game.activateStatus('blind_faith', 25);
        audio.playCurseAlert();
        game.addBanner('🌑 KUTUKAN: BLIND FAITH (Layar Gelap Gulita 25s!)', '#a855f7');
      }
    },
    {
      id: 'butter_fingers',
      type: 'curse',
      name: '🧈 Butter Fingers',
      badge: 'KUTUKAN',
      desc: 'Senjata utama terjatuh di lantai! Berjalan ke sana untuk mengambilnya!',
      icon: '🧈',
      apply: (game) => {
        game.dropWeapon();
        audio.playWeaponDrop();
        game.addBanner('🧈 KUTUKAN: BUTTER FINGERS (Senjata Terjatuh! Ambil Cepat!)', '#eab308');
      }
    },
    {
      id: 'inverted_reality',
      type: 'curse',
      name: '🌀 Inverted Reality',
      badge: 'KUTUKAN',
      desc: 'Kontrol gerakan berbalik (W jadi S, A jadi D) selama 20 detik!',
      icon: '🌀',
      apply: (game) => {
        game.activateStatus('inverted_reality', 20);
        audio.playCurseAlert();
        game.addBanner('🌀 KUTUKAN: INVERTED REALITY (Kontrol Terbalik 20s!)', '#ec4899');
      }
    },
    {
      id: 'slippery_floor',
      type: 'curse',
      name: '⛸️ Slippery Floor',
      badge: 'KUTUKAN',
      desc: 'Lantai menjadi licin es dengan inersia tinggi selama 25 detik!',
      icon: '⛸️',
      apply: (game) => {
        game.activateStatus('slippery_floor', 25);
        audio.playCurseAlert();
        game.addBanner('⛸️ KUTUKAN: SLIPPERY FLOOR (Lantai Licin Es 25s!)', '#06b6d4');
      }
    },
    {
      id: 'enemy_hyperdrive',
      type: 'curse',
      name: '⚡ Enemy Hyperdrive',
      badge: 'KUTUKAN',
      desc: 'Semua musuh bergerak 60% lebih cepat selama 18 detik!',
      icon: '👹',
      apply: (game) => {
        game.activateStatus('enemy_hyperdrive', 18);
        audio.playCurseAlert();
        game.addBanner('👹 KUTUKAN: ENEMY HYPERDRIVE (Musuh Gerak Cepat 18s!)', '#ef4444');
      }
    },
    {
      id: 'boss_inbound',
      type: 'curse',
      name: '👾 Boss Inbound',
      badge: 'KUTUKAN',
      desc: 'Penonton langsung memanggil Boss Raksasa ke arena!',
      icon: '👾',
      apply: (game) => {
        game.spawnTitanBoss();
        audio.playBossRoar();
        game.addBanner('👾 KUTUKAN: BOSS INBOUND (Titan Boss Muncul!)', '#f43f5e');
      }
    },
    {
      id: 'magma_eruption',
      type: 'curse',
      name: '🌋 Magma Eruption',
      badge: 'KUTUKAN',
      desc: 'Area lava mendidih muncul acak di tanah selama 20 detik!',
      icon: '🌋',
      apply: (game) => {
        game.activateStatus('magma_eruption', 20);
        audio.playCurseAlert();
        game.addBanner('🌋 KUTUKAN: MAGMA ERUPTION (Hindari Kolam Lava!)', '#f97316');
      }
    }
  ]
};

// ── SIMULATED CHAT PERSONALITIES ─────────────────────────────────
const SIMULATED_USERS = [
  { name: 'BocilKematian', color: '#ff4d4d', badge: '🗡️' },
  { name: 'SultanDonatur', color: '#ffd700', badge: '👑' },
  { name: 'WibuAkut99',    color: '#ff77aa', badge: '⭐' },
  { name: 'ModGalak',      color: '#00ffcc', badge: '🗡️' },
  { name: 'GigaChad_ID',   color: '#38bdf8', badge: '💎' },
  { name: 'WindahFanboy',  color: '#f97316', badge: '⭐' },
  { name: 'KucingOrenBarbar', color: '#fb923c', badge: '⭐' },
  { name: 'TrollMaster',   color: '#a855f7', badge: '' },
  { name: 'RajaMeme69',    color: '#84cc16', badge: '💎' },
  { name: 'ProPlayerKW',   color: '#eab308', badge: '' },
  { name: 'PenontonSetia', color: '#60a5fa', badge: '⭐' },
  { name: 'SiPalingGG',    color: '#f43f5e', badge: '' },
  { name: 'BangTutorial',  color: '#2dd4bf', badge: '💎' },
  { name: 'HokageKonoha',  color: '#fbbf24', badge: '' },
  { name: 'LordTuru',      color: '#94a3b8', badge: '' },
  { name: 'KangBakso',     color: '#f87171', badge: '⭐' },
  { name: 'StreamSniper',  color: '#c084fc', badge: '' },
  { name: 'BebanKeluarga', color: '#a3e635', badge: '' },
  { name: 'AdminSlotGacor',color: '#fb7185', badge: '' },
  { name: 'PecintaGeprek', color: '#fdba74', badge: '⭐' }
];

const EMOTES = ['KEKW', 'LUL', 'PogChamp', 'MonkaS', 'AYAYA', '5Head', 'PepeLaugh', 'OMEGALUL', 'GG', 'WKWK'];

const CHAT_COMMENTS = {
  general: [
    'Ayo bang jangan panik!',
    'GG gameplay-nya lumayan',
    'Fokus dodgenya bang',
    'Ambil gem ungu tuh!',
    'Auto attack mantap',
    'Live streaming terseru hari ini',
    'Jangan lupa napas bang',
    'Kekuatan persahabatan!'
  ],
  lowHealth: [
    'WKWK MATI INI MAH KEKW',
    'PANIK GAK? PANIK LAHHH',
    'DARAH TINGGAL SECUIL wkwkwk',
    'RIP STREAMER MonkaS',
    'Kasian banget sekarat LUL',
    'JANGAN MATI DULU BANG BARU NONTON',
    'Pencet tombol doa bang!'
  ],
  boss: [
    'WADUH BOSNYA GEDE BANGET OMEGALUL',
    'TAMATLAH SUDAH RIWAYATMU',
    'RUN BANG RUN! MonkaS',
    'JANGAN KETABRAK LASER!',
    'BOSNYA NGAMUK GUYS'
  ],
  voting: [
    'SIKSA STREAMER GASS WKWK',
    'PILIH KUTUKAN BIAR SERU!',
    'KASIH BUFF DONG KASIAN UDAH NANGIS',
    'PILIH BUTTER FINGERS NGAKAK KEKW',
    'INVERTED KONTROL GASS !',
    'Ayo spam chat kawan-kawan!'
  ]
};

// ── VOTING & CHAT MANAGER CLASS ──────────────────────────────────
class VotingManager {
  constructor(game) {
    this.game = game;
    this.isVotingActive = false;
    this.votingTimer = 0;
    this.votingDuration = 15; // 15 seconds
    this.currentOptions = [];
    this.votes = [0, 0, 0];
    this.chatInterval = null;
    this.twitchWs = null;
    this.twitchChannel = '';
    this.totalVotesCount = 0;
  }

  init() {
    this.startSimulatedChat();
  }

  // ── TWITCH IRC WEBSOCKET INTEGRATION ────────────────────────────
  connectTwitch(channel) {
    if (!channel) return;
    this.disconnectTwitch();
    this.twitchChannel = channel.toLowerCase().trim().replace(/^#/, '');

    try {
      this.twitchWs = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
      this.twitchWs.onopen = () => {
        this.addChatMessage('SYSTEM', '#3b82f6', `Terhubung ke chat Twitch: #${this.twitchChannel}`, '🤖');
        this.twitchWs.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
        this.twitchWs.send('PASS oauth:dummy_token');
        this.twitchWs.send(`NICK justinfan${Math.floor(Math.random() * 89999 + 10000)}`);
        this.twitchWs.send(`JOIN #${this.twitchChannel}`);
      };

      this.twitchWs.onmessage = (event) => {
        const msg = event.data;
        if (msg.startsWith('PING')) {
          this.twitchWs.send('PONG :tmi.twitch.tv');
          return;
        }
        if (msg.includes('PRIVMSG')) {
          this.handleTwitchPrivmsg(msg);
        }
      };

      this.twitchWs.onerror = () => {
        this.addChatMessage('SYSTEM', '#ef4444', 'Gagal terhubung ke Twitch IRC.', '⚠️');
      };
    } catch (e) {
      console.warn('Twitch connect error:', e);
    }
  }

  disconnectTwitch() {
    if (this.twitchWs) {
      try { this.twitchWs.close(); } catch(e) {}
      this.twitchWs = null;
    }
  }

  handleTwitchPrivmsg(raw) {
    try {
      const match = raw.match(/:([^!]+)![^@]+@[^\s]+\s+PRIVMSG\s+#[^\s]+\s+:(.+)/);
      if (match) {
        const username = match[1];
        const text = match[2].trim();
        this.addChatMessage(username, '#9146FF', text, '🟣');
        this.processVoteInput(text);
      }
    } catch(e) {}
  }

  // ── CHAT SIMULATION LOOP ─────────────────────────────────────────
  startSimulatedChat() {
    if (this.chatInterval) clearInterval(this.chatInterval);
    this.chatInterval = setInterval(() => {
      if (!this.game || this.game.isOver) return;

      const user = SIMULATED_USERS[Math.floor(Math.random() * SIMULATED_USERS.length)];
      let msg = '';

      if (this.isVotingActive) {
        // High chance to vote !1, !2, or !3
        if (Math.random() < 0.75) {
          const voteChoice = Math.floor(Math.random() * 3) + 1;
          const emote = EMOTES[Math.floor(Math.random() * EMOTES.length)];
          msg = `!${voteChoice} ${Math.random() < 0.4 ? emote : ''}`;
          this.registerVote(voteChoice - 1);
        } else {
          msg = CHAT_COMMENTS.voting[Math.floor(Math.random() * CHAT_COMMENTS.voting.length)];
        }
      } else if (this.game.player.hp < this.game.player.maxHp * 0.3) {
        msg = CHAT_COMMENTS.lowHealth[Math.floor(Math.random() * CHAT_COMMENTS.lowHealth.length)];
      } else if (this.game.hasActiveBoss) {
        msg = CHAT_COMMENTS.boss[Math.floor(Math.random() * CHAT_COMMENTS.boss.length)];
      } else {
        msg = CHAT_COMMENTS.general[Math.floor(Math.random() * CHAT_COMMENTS.general.length)];
        if (Math.random() < 0.3) {
          msg += ' ' + EMOTES[Math.floor(Math.random() * EMOTES.length)];
        }
      }

      this.addChatMessage(user.name, user.color, msg, user.badge);
    }, 600 + Math.random() * 600);
  }

  addChatMessage(user, color, text, badge = '') {
    const chatContainer = document.getElementById('chat-messages');
    if (!chatContainer) return;

    const row = document.createElement('div');
    row.className = 'chat-row';
    row.innerHTML = `
      <span class="chat-badge">${badge}</span>
      <strong class="chat-user" style="color:${color}">${user}:</strong>
      <span class="chat-text">${this.escapeHTML(text)}</span>
    `;

    chatContainer.appendChild(row);
    // Keep max 60 messages
    while (chatContainer.children.length > 60) {
      chatContainer.removeChild(chatContainer.firstChild);
    }
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
  }

  // ── VOTING LOGIC ────────────────────────────────────────────────
  startVotingEvent() {
    if (this.isVotingActive) return;
    this.isVotingActive = true;
    this.votingTimer = this.votingDuration;
    this.votes = [0, 0, 0];
    this.totalVotesCount = 0;

    // Pick 3 random options (mix of buffs & curses)
    const allBuffs = [...VOTING_POOL.buffs].sort(() => Math.random() - 0.5);
    const allCurses = [...VOTING_POOL.curses].sort(() => Math.random() - 0.5);

    // Pick 1-2 curses and 1-2 buffs for maximum entertainment
    const numCurses = Math.random() > 0.4 ? 2 : 1;
    const numBuffs = 3 - numCurses;

    const selected = [
      ...allBuffs.slice(0, numBuffs),
      ...allCurses.slice(0, numCurses)
    ].sort(() => Math.random() - 0.5);

    this.currentOptions = selected;

    // Render voting UI modal
    this.renderVotingModal();
    audio.playLevelUp();

    // Announce in chat
    this.addChatMessage('STREAM_BOT', '#a855f7', '📢 PEMUNGUTAN SUARA DIBUKA! Ketik !1, !2, atau !3 di chat!', '🤖');
  }

  renderVotingModal() {
    const modal = document.getElementById('voting-modal');
    if (!modal) return;

    modal.classList.remove('hidden');
    document.getElementById('vote-timer-txt').textContent = `${Math.ceil(this.votingTimer)}s`;

    for (let i = 0; i < 3; i++) {
      const opt = this.currentOptions[i];
      const card = document.getElementById(`vote-card-${i + 1}`);
      if (!card || !opt) continue;

      card.className = `vote-card ${opt.type}`;
      card.querySelector('.vote-card-icon').textContent = opt.icon;
      card.querySelector('.vote-card-badge').textContent = opt.badge;
      card.querySelector('.vote-card-title').textContent = opt.name;
      card.querySelector('.vote-card-desc').textContent = opt.desc;
      card.querySelector('.vote-key-badge').textContent = `[ ${i + 1} / !${i + 1} ]`;
      card.querySelector('.vote-bar-fill').style.width = '0%';
      card.querySelector('.vote-count-txt').textContent = '0 suara (0%)';
    }
  }

  processVoteInput(text) {
    if (!this.isVotingActive) return;
    const clean = text.trim();
    if (clean === '!1' || clean === '1') this.registerVote(0);
    else if (clean === '!2' || clean === '2') this.registerVote(1);
    else if (clean === '!3' || clean === '3') this.registerVote(2);
  }

  registerVote(index) {
    if (!this.isVotingActive || index < 0 || index > 2) return;
    this.votes[index]++;
    this.totalVotesCount++;
    this.updateVoteBars();
    audio.playVoteTick();
  }

  updateVoteBars() {
    const total = Math.max(1, this.totalVotesCount);
    for (let i = 0; i < 3; i++) {
      const count = this.votes[i];
      const pct = Math.round((count / total) * 100);
      const card = document.getElementById(`vote-card-${i + 1}`);
      if (card) {
        card.querySelector('.vote-bar-fill').style.width = `${pct}%`;
        card.querySelector('.vote-count-txt').textContent = `${count} suara (${pct}%)`;
      }
    }
  }

  update(dt) {
    if (!this.isVotingActive) return;

    this.votingTimer -= dt;
    const timerElem = document.getElementById('vote-timer-txt');
    if (timerElem) {
      timerElem.textContent = `${Math.max(0, Math.ceil(this.votingTimer))}s`;
    }

    if (this.votingTimer <= 0) {
      this.finishVoting();
    }
  }

  finishVoting() {
    if (!this.isVotingActive) return;
    this.isVotingActive = false;

    // Determine winner (highest vote, or random tie breaker)
    let maxVotes = -1;
    let winningIndex = 0;
    for (let i = 0; i < 3; i++) {
      if (this.votes[i] > maxVotes) {
        maxVotes = this.votes[i];
        winningIndex = i;
      }
    }

    // If nobody voted, pick random
    if (maxVotes === 0) {
      winningIndex = Math.floor(Math.random() * 3);
    }

    const winner = this.currentOptions[winningIndex];

    // Hide modal
    const modal = document.getElementById('voting-modal');
    if (modal) modal.classList.add('hidden');

    audio.playVoteWin();

    // Apply the winning buff or curse!
    if (winner && winner.apply) {
      winner.apply(this.game);
      this.addChatMessage('STREAM_BOT', '#00ff88', `🏆 HASIL VOTING: [${winner.name}] terpilih dengan ${this.votes[winningIndex]} suara!`, '🎉');
    }
  }
}
