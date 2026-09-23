// ================================================================
// SIKSAAN PENONTON (Audience Torment: Streamer vs Chat Roguelike)
// Main Game Engine — 60 FPS Standalone HTML5 Canvas Roguelike
// ================================================================
'use strict';

class TormentGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.fogCanvas = document.createElement('canvas');
    this.fogCtx = this.fogCanvas.getContext('2d');

    this.W = 0;
    this.H = 0;
    this.resize();

    this.votingManager = new VotingManager(this);

    // Game states: 'MENU', 'PLAYING', 'VOTING', 'GAMEOVER', 'VICTORY'
    this.state = 'MENU';
    this.isOver = false;

    // Camera
    this.camera = { x: 0, y: 0 };
    this.shake = 0;

    // Game stats & timer
    this.gameTime = 0; // seconds
    this.lastVotingTime = 0;
    this.votingInterval = 120; // Voting every 2 minutes even if not leveling up
    this.kills = 0;
    this.score = 0;

    // Player
    this.player = null;

    // Entities
    this.enemies = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.gems = [];
    this.particles = [];
    this.floatingTexts = [];
    this.magmaPools = [];
    this.droppedWeapon = null;

    // Active status effects (buffs / curses)
    this.activeStatuses = {}; // e.g. { blind_faith: 25, inverted_reality: 20 }
    this.banner = null; // { text, color, timer }

    // Spawning
    this.spawnTimer = 0;
    this.hasActiveBoss = false;
    this.bossRef = null;

    // Controls
    this.keys = {};
    this.mouse = { x: 0, y: 0, isDown: false };
    this.joystick = { active: false, startX: 0, startY: 0, curX: 0, curY: 0, dx: 0, dy: 0 };

    this.lastFrameTime = performance.now();
    this.initEventListeners();
  }

  resize() {
    const container = document.getElementById('canvas-container');
    if (!container) return;
    this.W = this.canvas.width = container.clientWidth || 800;
    this.H = this.canvas.height = container.clientHeight || 600;
    this.fogCanvas.width = this.W;
    this.fogCanvas.height = this.H;
  }

  initEventListeners() {
    window.addEventListener('resize', () => this.resize());

    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;

      // Quick vote hotkeys during voting
      if (this.votingManager.isVotingActive) {
        if (e.key === '1') this.votingManager.registerVote(0);
        if (e.key === '2') this.votingManager.registerVote(1);
        if (e.key === '3') this.votingManager.registerVote(2);
      }

      if (e.key === 'm' || e.key === 'M') {
        const isMuted = audio.toggleMute();
        this.addBanner(isMuted ? '🔇 Audio Dimatikan' : '🔊 Audio Dinyalakan', '#ffffff');
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    // Mouse movement
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    });

    this.canvas.addEventListener('mousedown', () => { this.mouse.isDown = true; });
    window.addEventListener('mouseup', () => { this.mouse.isDown = false; });

    // Touch controls / Virtual Joystick
    this.canvas.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const tx = touch.clientX - rect.left;
      const ty = touch.clientY - rect.top;
      this.joystick.active = true;
      this.joystick.startX = tx;
      this.joystick.startY = ty;
      this.joystick.curX = tx;
      this.joystick.curY = ty;
      this.joystick.dx = 0;
      this.joystick.dy = 0;
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      if (!this.joystick.active) return;
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const tx = touch.clientX - rect.left;
      const ty = touch.clientY - rect.top;
      this.joystick.curX = tx;
      this.joystick.curY = ty;

      let dx = tx - this.joystick.startX;
      let dy = ty - this.joystick.startY;
      const dist = Math.hypot(dx, dy);
      const maxDist = 50;
      if (dist > maxDist) {
        dx = (dx / dist) * maxDist;
        dy = (dy / dist) * maxDist;
      }
      this.joystick.dx = dx / maxDist;
      this.joystick.dy = dy / maxDist;
      e.preventDefault();
    }, { passive: false });

    this.canvas.addEventListener('touchend', () => {
      this.joystick.active = false;
      this.joystick.dx = 0;
      this.joystick.dy = 0;
    });

    // UI Buttons
    const btnStart = document.getElementById('btn-start-game');
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        document.getElementById('start-overlay').classList.add('hidden');
        this.startGame();
      });
    }

    const btnRestart = document.getElementById('btn-restart');
    if (btnRestart) {
      btnRestart.addEventListener('click', () => {
        document.getElementById('gameover-overlay').classList.add('hidden');
        this.startGame();
      });
    }

    const btnAudio = document.getElementById('btn-toggle-sound');
    if (btnAudio) {
      btnAudio.addEventListener('click', () => {
        const isMuted = audio.toggleMute();
        btnAudio.textContent = isMuted ? '🔇 Unmute' : '🔊 Sound On';
      });
    }

    // Connect Twitch Form
    const btnConnectTwitch = document.getElementById('btn-connect-twitch');
    if (btnConnectTwitch) {
      btnConnectTwitch.addEventListener('click', () => {
        const channelInput = document.getElementById('twitch-channel-input');
        if (channelInput && channelInput.value.trim()) {
          this.votingManager.connectTwitch(channelInput.value.trim());
          btnConnectTwitch.textContent = '🟢 Terhubung';
          btnConnectTwitch.style.background = '#9146FF';
        }
      });
    }

    // Vote card clicks
    for (let i = 1; i <= 3; i++) {
      const card = document.getElementById(`vote-card-${i}`);
      if (card) {
        card.addEventListener('click', () => {
          this.votingManager.registerVote(i - 1);
        });
      }
    }
  }

  // ── START GAME ──────────────────────────────────────────────────
  startGame() {
    this.state = 'PLAYING';
    this.isOver = false;
    this.gameTime = 0;
    this.lastVotingTime = 0;
    this.kills = 0;
    this.score = 0;
    this.enemies = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.gems = [];
    this.particles = [];
    this.floatingTexts = [];
    this.magmaPools = [];
    this.droppedWeapon = null;
    this.activeStatuses = {};
    this.hasActiveBoss = false;
    this.bossRef = null;

    // Setup player
    this.player = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 16,
      baseSpeed: 3.2,
      speedMultiplier: 1.0,
      hp: 100,
      maxHp: 100,
      level: 1,
      xp: 0,
      xpNeeded: 25,
      facing: 1,
      walkAnim: 0,
      lifestealChance: 0,
      damageMultiplier: 1.0,
      cooldownReduction: 1.0,
      magnetRadius: 100,
      canAttack: true, // false when butter_fingers drops weapon
      weapons: [
        { type: 'wand', level: 1, cooldown: 0.65, timer: 0 },
        { type: 'orbit', level: 1, count: 2, angle: 0, radius: 45, damage: 15 }
      ]
    };

    this.camera.x = 0;
    this.camera.y = 0;

    audio.init();
    audio.startBGM();
    this.votingManager.init();
    this.addBanner('🎮 SIKSAAN PENONTON: STREAM DIMULAI! BERTAHANLAH!', '#00ff88');
  }

  // ── STATUS EFFECTS & HAZARDS ────────────────────────────────────
  activateStatus(id, duration) {
    this.activeStatuses[id] = duration;
    audio.isCurseActive = (id === 'blind_faith' || id === 'inverted_reality' || id === 'slippery_floor');
    this.updateStatusBadges();
  }

  updateStatusBadges() {
    const badgeContainer = document.getElementById('active-buffs-list');
    if (!badgeContainer) return;
    badgeContainer.innerHTML = '';

    for (const [key, duration] of Object.entries(this.activeStatuses)) {
      if (duration <= 0) continue;
      const span = document.createElement('span');
      const isCurse = ['blind_faith', 'inverted_reality', 'slippery_floor', 'enemy_hyperdrive', 'magma_eruption'].includes(key);
      span.className = `status-badge ${isCurse ? 'curse' : 'buff'}`;
      span.textContent = `${this.formatStatusName(key)} (${Math.ceil(duration)}s)`;
      badgeContainer.appendChild(span);
    }
  }

  formatStatusName(key) {
    const map = {
      blind_faith: '🌑 Blind Faith',
      inverted_reality: '🌀 Inverted Control',
      slippery_floor: '⛸️ Slippery Floor',
      enemy_hyperdrive: '👹 Enemy Hyperdrive',
      magma_eruption: '🌋 Magma Floor',
      holy_shield: '🛡️ Aegis Shield'
    };
    return map[key] || key;
  }

  dropWeapon() {
    this.player.canAttack = false;
    this.droppedWeapon = {
      x: this.player.x,
      y: this.player.y,
      pulse: 0
    };
    this.addFloatingText(this.player.x, this.player.y - 20, '⚠️ SENJATA JATUH!', '#ffcc00');
  }

  collectDroppedWeapon() {
    this.player.canAttack = true;
    this.droppedWeapon = null;
    audio.playWeaponPickup();
    this.addBanner('🗡️ SENJATA DIAMBIL KEMBALI! Serang lagi!', '#00ff88');
    this.addFloatingText(this.player.x, this.player.y - 20, '✨ WEAPON RESTORED!', '#00ff88');
    this.spawnSparks(this.player.x, this.player.y, '#00ff88', 25);
  }

  triggerNuke() {
    audio.playNuke();
    this.shake = 30;
    // Explode all enemies
    for (const e of this.enemies) {
      e.hp = 0;
      this.spawnGem(e.x, e.y, e.type === 'boss' ? 50 : 5);
      this.spawnSparks(e.x, e.y, '#ff4444', 15);
      this.kills++;
    }
    this.enemies = [];
    this.hasActiveBoss = false;
    this.bossRef = null;
    this.addFloatingText(this.player.x, this.player.y - 40, '💥 NUCLEAR WIPE!', '#ffe600');
  }

  collectAllGems() {
    audio.playGem();
    for (const g of this.gems) {
      g.isMagnetized = true;
      g.speed = 14;
    }
    this.addFloatingText(this.player.x, this.player.y - 30, '🧲 ALL GEMS PULL!', '#00e5ff');
  }

  spawnTitanBoss() {
    this.hasActiveBoss = true;
    const angle = Math.random() * Math.PI * 2;
    const dist = 350;
    const bx = this.player.x + Math.cos(angle) * dist;
    const by = this.player.y + Math.sin(angle) * dist;

    const boss = {
      x: bx,
      y: by,
      vx: 0,
      vy: 0,
      size: 38,
      type: 'boss',
      name: 'TITAN TORMENTOR',
      hp: 1800 + this.player.level * 200,
      maxHp: 1800 + this.player.level * 200,
      speed: 1.4,
      damage: 25,
      shootTimer: 0,
      color: '#ff0055',
      anim: 0
    };
    this.enemies.push(boss);
    this.bossRef = boss;
    this.addFloatingText(bx, by - 50, '⚠️ BOSS TORMENTOR SPAWNED!', '#ff0055');
  }

  addBanner(text, color = '#00ff88') {
    this.banner = { text, color, timer: 3.5 };
  }

  addFloatingText(x, y, text, color = '#ffffff') {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      vy: -1.2,
      alpha: 1.0,
      life: 1.2
    });
  }

  spawnSparks(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 1.5 + Math.random() * 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        color,
        size: 2 + Math.random() * 3,
        alpha: 1.0,
        life: 0.5 + Math.random() * 0.4
      });
    }
  }

  // ── GAME LOOP ───────────────────────────────────────────────────
  run() {
    const now = performance.now();
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;

    this.update(dt);
    this.render();

    requestAnimationFrame(() => this.run());
  }

  update(dt) {
    if (this.state === 'VOTING') {
      this.votingManager.update(dt);
      return;
    }
    if (this.state !== 'PLAYING') return;

    this.gameTime += dt;

    // Check 2-minute audience voting cycle
    if (this.gameTime - this.lastVotingTime >= this.votingInterval) {
      this.lastVotingTime = this.gameTime;
      this.state = 'VOTING';
      this.votingManager.startVotingEvent();
      return;
    }

    // Update screen shake
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 25);

    // Update active status durations
    for (const key in this.activeStatuses) {
      this.activeStatuses[key] -= dt;
      if (this.activeStatuses[key] <= 0) {
        delete this.activeStatuses[key];
        audio.isCurseActive = false;
      }
    }
    this.updateStatusBadges();

    // Update banner
    if (this.banner) {
      this.banner.timer -= dt;
      if (this.banner.timer <= 0) this.banner = null;
    }

    // Update Player
    this.updatePlayer(dt);

    // Update Weapons & Projectiles
    this.updateWeapons(dt);

    // Update Enemies & Spawner
    this.updateEnemies(dt);

    // Update Hazards (Magma pools)
    this.updateMagmaPools(dt);

    // Update Gems & Particles
    this.updateGems(dt);
    this.updateParticles(dt);

    // Camera follow player smoothly
    this.camera.x += (this.player.x - this.W / 2 - this.camera.x) * 0.1;
    this.camera.y += (this.player.y - this.H / 2 - this.camera.y) * 0.1;

    // Update HUD
    this.updateHUD();
  }

  // ── PLAYER UPDATE ───────────────────────────────────────────────
  updatePlayer(dt) {
    const p = this.player;

    // Movement input
    let mx = 0;
    let my = 0;

    if (this.keys['w'] || this.keys['arrowup']) my -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) my += 1;
    if (this.keys['a'] || this.keys['arrowleft']) mx -= 1;
    if (this.keys['d'] || this.keys['arrowright']) mx += 1;

    // Touch joystick support
    if (this.joystick.active) {
      mx = this.joystick.dx;
      my = this.joystick.dy;
    }

    // Inverted Reality curse
    if (this.activeStatuses['inverted_reality']) {
      mx = -mx;
      my = -my;
    }

    // Normalize diagonal
    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }

    const currentSpeed = p.baseSpeed * p.speedMultiplier;

    // Slippery Floor ice physics vs normal snappy movement
    if (this.activeStatuses['slippery_floor']) {
      p.vx += mx * currentSpeed * 0.15;
      p.vy += my * currentSpeed * 0.15;
      p.vx *= 0.96; // ice glide
      p.vy *= 0.96;
    } else {
      p.vx = mx * currentSpeed;
      p.vy = my * currentSpeed;
    }

    p.x += p.vx;
    p.y += p.vy;

    if (mx !== 0) p.facing = mx > 0 ? 1 : -1;
    if (len > 0.1) p.walkAnim += dt * 10;

    // Check dropped weapon collision
    if (this.droppedWeapon && !p.canAttack) {
      this.droppedWeapon.pulse += dt * 5;
      const d = Math.hypot(p.x - this.droppedWeapon.x, p.y - this.droppedWeapon.y);
      if (d < p.size + 20) {
        this.collectDroppedWeapon();
      }
    }
  }

  // ── WEAPONS & PROJECTILES ───────────────────────────────────────
  updateWeapons(dt) {
    const p = this.player;
    if (!p.canAttack) return;

    for (const w of p.weapons) {
      if (w.type === 'wand') {
        w.timer -= dt;
        const cooldown = w.cooldown * p.cooldownReduction;
        if (w.timer <= 0) {
          w.timer = cooldown;
          this.firePlasmaWand();
        }
      } else if (w.type === 'orbit') {
        w.angle += dt * 3.5;
        // Check collision between orbital orbs and enemies
        for (let i = 0; i < w.count; i++) {
          const orbAngle = w.angle + (i * Math.PI * 2) / w.count;
          const ox = p.x + Math.cos(orbAngle) * w.radius;
          const oy = p.y + Math.sin(orbAngle) * w.radius;

          for (const e of this.enemies) {
            if (Math.hypot(e.x - ox, e.y - oy) < e.size + 10) {
              this.damageEnemy(e, w.damage * p.damageMultiplier * dt * 12, ox, oy);
              this.spawnSparks(ox, oy, '#ffaa00', 1);
            }
          }
        }
      }
    }

    // Update Player Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.x += pr.vx * dt * 60;
      pr.y += pr.vy * dt * 60;
      pr.life -= dt;

      // Hit detection
      let hit = false;
      for (const e of this.enemies) {
        if (Math.hypot(e.x - pr.x, e.y - pr.y) < e.size + pr.size) {
          this.damageEnemy(e, pr.damage * p.damageMultiplier, pr.x, pr.y);
          this.spawnSparks(pr.x, pr.y, pr.color, 4);
          audio.playHit();
          hit = true;
          break;
        }
      }

      if (hit || pr.life <= 0) {
        this.projectiles.splice(i, 1);
      }
    }

    // Update Enemy Projectiles
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const ep = this.enemyProjectiles[i];
      ep.x += ep.vx * dt * 60;
      ep.y += ep.vy * dt * 60;
      ep.life -= dt;

      if (Math.hypot(p.x - ep.x, p.y - ep.y) < p.size + ep.size) {
        this.damagePlayer(ep.damage);
        this.enemyProjectiles.splice(i, 1);
        continue;
      }

      if (ep.life <= 0) {
        this.enemyProjectiles.splice(i, 1);
      }
    }
  }

  firePlasmaWand() {
    if (this.enemies.length === 0) return;

    // Find closest enemy
    let closest = null;
    let minDist = 450;
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
      if (d < minDist) {
        minDist = d;
        closest = e;
      }
    }

    if (closest) {
      const angle = Math.atan2(closest.y - this.player.y, closest.x - this.player.x);
      const speed = 8.5;
      this.projectiles.push({
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 5,
        damage: 28,
        color: '#00ffff',
        life: 1.5
      });
      audio.playShoot();
    }
  }

  // ── ENEMIES & SPAWNING ──────────────────────────────────────────
  updateEnemies(dt) {
    const p = this.player;

    // Spawn waves
    this.spawnTimer += dt;
    const spawnRate = Math.max(0.35, 1.6 - this.gameTime * 0.003); // gets faster over time

    if (this.spawnTimer >= spawnRate) {
      this.spawnTimer = 0;
      this.spawnEnemy();
    }

    const enemySpeedMult = this.activeStatuses['enemy_hyperdrive'] ? 1.6 : 1.0;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.anim = (e.anim || 0) + dt * 5;

      // Move toward player
      const angle = Math.atan2(p.y - e.y, p.x - e.x);
      e.x += Math.cos(angle) * e.speed * enemySpeedMult;
      e.y += Math.sin(angle) * e.speed * enemySpeedMult;

      // Enemy specific actions (e.g. Shooter / Boss)
      if (e.type === 'shooter') {
        e.shootTimer = (e.shootTimer || 0) + dt;
        if (e.shootTimer >= 2.5) {
          e.shootTimer = 0;
          this.enemyProjectiles.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(angle) * 4.0,
            vy: Math.sin(angle) * 4.0,
            size: 4,
            damage: 12,
            color: '#ff3366',
            life: 3.0
          });
        }
      } else if (e.type === 'boss') {
        e.shootTimer = (e.shootTimer || 0) + dt;
        if (e.shootTimer >= 1.8) {
          e.shootTimer = 0;
          // 8-way radial projectile attack
          for (let k = 0; k < 8; k++) {
            const bAngle = (k * Math.PI) / 4 + e.anim;
            this.enemyProjectiles.push({
              x: e.x,
              y: e.y,
              vx: Math.cos(bAngle) * 3.5,
              vy: Math.sin(bAngle) * 3.5,
              size: 6,
              damage: 18,
              color: '#ff0055',
              life: 3.5
            });
          }
        }
      }

      // Hit player on contact
      if (Math.hypot(p.x - e.x, p.y - e.y) < p.size + e.size) {
        this.damagePlayer(e.damage * dt * 3.5);
      }

      // Check death
      if (e.hp <= 0) {
        this.kills++;
        this.score += e.type === 'boss' ? 1000 : 50;

        // Lifesteal chance
        if (p.lifestealChance > 0 && Math.random() < p.lifestealChance) {
          p.hp = Math.min(p.maxHp, p.hp + 10);
          this.addFloatingText(p.x, p.y - 25, '+10 HP Lifesteal!', '#00ff88');
        }

        // Spawn XP Gem
        const xpAmount = e.type === 'boss' ? 50 : e.type === 'golem' ? 12 : 4;
        this.spawnGem(e.x, e.y, xpAmount);
        this.spawnSparks(e.x, e.y, e.color || '#ff4444', 8);

        if (e.type === 'boss') {
          this.hasActiveBoss = false;
          this.bossRef = null;
          this.addBanner('🏆 TITAN TORMENTOR BERHASIL DIKALAHKAN!', '#ffe600');
          audio.playLevelUp();
        }

        this.enemies.splice(i, 1);
      }
    }
  }

  spawnEnemy() {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.max(this.W, this.H) * 0.6 + 50;
    const sx = this.player.x + Math.cos(angle) * dist;
    const sy = this.player.y + Math.sin(angle) * dist;

    // Pick enemy type based on game time
    const rand = Math.random();
    let type = 'zombie';
    let hp = 30 + this.gameTime * 0.3;
    let speed = 1.6;
    let size = 12;
    let damage = 10;
    let color = '#00ff88';

    if (rand < 0.25) {
      type = 'bat';
      hp = 18 + this.gameTime * 0.2;
      speed = 2.8;
      size = 9;
      damage = 7;
      color = '#c084fc';
    } else if (rand < 0.5 && this.gameTime > 30) {
      type = 'shooter';
      hp = 45 + this.gameTime * 0.4;
      speed = 1.3;
      size = 14;
      damage = 12;
      color = '#f43f5e';
    } else if (rand < 0.65 && this.gameTime > 60) {
      type = 'golem';
      hp = 140 + this.gameTime * 0.8;
      speed = 0.9;
      size = 20;
      damage = 22;
      color = '#eab308';
    }

    this.enemies.push({
      x: sx,
      y: sy,
      type,
      hp,
      maxHp: hp,
      speed,
      size,
      damage,
      color,
      anim: 0
    });
  }

  damageEnemy(e, amount, hitX, hitY) {
    e.hp -= amount;
    this.addFloatingText(hitX, hitY - 10, `${Math.round(amount)}`, '#ffffff');
  }

  damagePlayer(amount) {
    if (this.activeStatuses['holy_shield']) {
      this.addFloatingText(this.player.x, this.player.y - 20, '🛡️ BLOCKED!', '#4da6ff');
      return;
    }

    this.player.hp -= amount;
    this.shake = Math.min(15, this.shake + 5);
    audio.playHit();

    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.gameOver();
    }
  }

  // ── HAZARDS: MAGMA POOLS ────────────────────────────────────────
  updateMagmaPools(dt) {
    if (this.activeStatuses['magma_eruption']) {
      if (Math.random() < 0.05 && this.magmaPools.length < 8) {
        const offsetDist = Math.random() * 200 + 40;
        const offsetAngle = Math.random() * Math.PI * 2;
        this.magmaPools.push({
          x: this.player.x + Math.cos(offsetAngle) * offsetDist,
          y: this.player.y + Math.sin(offsetAngle) * offsetDist,
          radius: 30 + Math.random() * 20,
          life: 8.0
        });
      }
    }

    for (let i = this.magmaPools.length - 1; i >= 0; i--) {
      const pool = this.magmaPools[i];
      pool.life -= dt;

      // Burn player if standing in pool
      const dist = Math.hypot(this.player.x - pool.x, this.player.y - pool.y);
      if (dist < pool.radius) {
        this.damagePlayer(15 * dt);
        this.spawnSparks(this.player.x, this.player.y, '#ff4400', 1);
      }

      if (pool.life <= 0) {
        this.magmaPools.splice(i, 1);
      }
    }
  }

  // ── GEMS & LEVEL UP ─────────────────────────────────────────────
  spawnGem(x, y, xpValue) {
    this.gems.push({
      x,
      y,
      xp: xpValue,
      color: xpValue >= 50 ? '#ff0055' : xpValue >= 12 ? '#ffe600' : '#00e5ff',
      isMagnetized: false,
      speed: 0
    });
  }

  updateGems(dt) {
    const p = this.player;
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i];
      const dist = Math.hypot(p.x - g.x, p.y - g.y);

      if (dist < p.magnetRadius || g.isMagnetized) {
        g.isMagnetized = true;
        g.speed = Math.min(16, g.speed + dt * 35);
        const angle = Math.atan2(p.y - g.y, p.x - g.x);
        g.x += Math.cos(angle) * g.speed;
        g.y += Math.sin(angle) * g.speed;
      }

      if (dist < p.size + 12) {
        this.collectGem(g);
        this.gems.splice(i, 1);
      }
    }
  }

  collectGem(g) {
    audio.playGem();
    this.player.xp += g.xp;
    this.score += g.xp * 10;

    // Level up check
    if (this.player.xp >= this.player.xpNeeded) {
      this.player.xp -= this.player.xpNeeded;
      this.player.level++;
      this.player.xpNeeded = Math.round(this.player.xpNeeded * 1.4);
      this.player.maxHp += 15;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 25);

      this.addFloatingText(this.player.x, this.player.y - 30, `🎉 LEVEL UP! (Lv. ${this.player.level})`, '#ffe600');
      this.spawnSparks(this.player.x, this.player.y, '#ffe600', 30);

      // Trigger Audience Voting
      this.state = 'VOTING';
      this.votingManager.startVotingEvent();
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt;
      p.alpha = p.life / 0.8;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.y += t.vy;
      t.life -= dt;
      t.alpha = t.life / 1.2;
      if (t.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  updateHUD() {
    const p = this.player;
    if (!p) return;

    // HP Bar
    const hpPct = Math.max(0, (p.hp / p.maxHp) * 100);
    const hpBar = document.getElementById('hud-hp-bar');
    if (hpBar) {
      hpBar.style.width = `${hpPct}%`;
      document.getElementById('hud-hp-txt').textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
    }

    // XP Bar
    const xpPct = Math.min(100, (p.xp / p.xpNeeded) * 100);
    const xpBar = document.getElementById('hud-xp-bar');
    if (xpBar) {
      xpBar.style.width = `${xpPct}%`;
      document.getElementById('hud-lvl-txt').textContent = `Lv. ${p.level}`;
    }

    // Timer & Kills
    const mins = Math.floor(this.gameTime / 60);
    const secs = Math.floor(this.gameTime % 60);
    document.getElementById('hud-timer-txt').textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    document.getElementById('hud-kills-txt').textContent = `${this.kills} Kills`;
    document.getElementById('hud-score-txt').textContent = `${this.score.toLocaleString('id-ID')} Pts`;

    // Boss Bar
    const bossHud = document.getElementById('boss-hud');
    if (this.hasActiveBoss && this.bossRef) {
      bossHud.classList.remove('hidden');
      const bPct = Math.max(0, (this.bossRef.hp / this.bossRef.maxHp) * 100);
      document.getElementById('boss-hp-bar').style.width = `${bPct}%`;
    } else {
      bossHud.classList.add('hidden');
    }
  }

  // ── GAME OVER ───────────────────────────────────────────────────
  gameOver() {
    this.state = 'GAMEOVER';
    this.isOver = true;
    audio.stopBGM();
    audio.playCurseAlert();

    const overlay = document.getElementById('gameover-overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
      const mins = Math.floor(this.gameTime / 60);
      const secs = Math.floor(this.gameTime % 60);
      document.getElementById('go-time').textContent = `${mins}m ${secs}s`;
      document.getElementById('go-level').textContent = `Lv. ${this.player.level}`;
      document.getElementById('go-kills').textContent = `${this.kills}`;
      document.getElementById('go-score').textContent = `${this.score.toLocaleString('id-ID')}`;
    }
  }

  // ── RENDER ENGINE ───────────────────────────────────────────────
  render() {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, this.W, this.H);

    // Apply Screen Shake
    if (this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }

    // World Transform
    ctx.save();
    ctx.translate(-this.camera.x, -this.camera.y);

    // 1. Draw Cyber Arena Grid Floor
    this.drawArenaGrid(ctx);

    // 2. Draw Magma Hazards
    this.drawMagmaPools(ctx);

    // 3. Draw Dropped Weapon
    if (this.droppedWeapon) {
      this.drawDroppedWeapon(ctx);
    }

    // 4. Draw Gems
    this.drawGems(ctx);

    // 5. Draw Enemies
    this.drawEnemies(ctx);

    // 6. Draw Player & Weapons
    if (this.player) {
      this.drawPlayer(ctx);
    }

    // 7. Draw Projectiles
    this.drawProjectiles(ctx);

    // 8. Draw Particles
    this.drawParticles(ctx);

    ctx.restore(); // Restore World Transform

    // 9. Draw Fog of War (Blind Faith Curse)
    if (this.activeStatuses['blind_faith'] && this.player) {
      this.drawFogOfWar();
    }

    // 10. Draw Banner Alerts
    if (this.banner) {
      this.drawBanner(ctx);
    }

    // 11. Draw Virtual Joystick for Mobile
    if (this.joystick.active) {
      this.drawJoystick(ctx);
    }

    ctx.restore();
  }

  drawArenaGrid(ctx) {
    const gridSize = 64;
    const startX = Math.floor(this.camera.x / gridSize) * gridSize - gridSize;
    const startY = Math.floor(this.camera.y / gridSize) * gridSize - gridSize;
    const endX = startX + this.W + gridSize * 2;
    const endY = startY + this.H + gridSize * 2;

    // Dark Background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(startX, startY, endX - startX, endY - startY);

    // Neon Grid lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(77, 150, 255, 0.08)';
    ctx.beginPath();
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();

    // Occasional glowing grid cross points
    ctx.fillStyle = 'rgba(168, 85, 247, 0.15)';
    for (let x = startX; x <= endX; x += gridSize * 2) {
      for (let y = startY; y <= endY; y += gridSize * 2) {
        ctx.fillRect(x - 2, y - 2, 4, 4);
      }
    }
  }

  drawMagmaPools(ctx) {
    for (const pool of this.magmaPools) {
      ctx.save();
      const grad = ctx.createRadialGradient(pool.x, pool.y, 5, pool.x, pool.y, pool.radius);
      grad.addColorStop(0, '#ff6600');
      grad.addColorStop(0.7, 'rgba(255, 68, 0, 0.6)');
      grad.addColorStop(1, 'rgba(255, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pool.x, pool.y, pool.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawDroppedWeapon(ctx) {
    const dw = this.droppedWeapon;
    ctx.save();
    // Glowing beacon ring
    const ringR = 24 + Math.sin(dw.pulse) * 6;
    ctx.strokeStyle = '#ffe600';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ffe600';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(dw.x, dw.y, ringR, 0, Math.PI * 2);
    ctx.stroke();

    // Weapon Icon
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🗡️', dw.x, dw.y);
    ctx.restore();
  }

  drawGems(ctx) {
    for (const g of this.gems) {
      ctx.save();
      ctx.fillStyle = g.color;
      ctx.shadowColor = g.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      // Diamond diamond shape
      const s = g.xp >= 50 ? 8 : g.xp >= 12 ? 6 : 4;
      ctx.moveTo(g.x, g.y - s);
      ctx.lineTo(g.x + s, g.y);
      ctx.lineTo(g.x, g.y + s);
      ctx.lineTo(g.x - s, g.y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  drawEnemies(ctx) {
    for (const e of this.enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(0, e.size * 0.8, e.size * 0.8, e.size * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = e.color;
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 0, e.size, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(-e.size * 0.3, -e.size * 0.2, e.size * 0.25, 0, Math.PI * 2);
      ctx.arc(e.size * 0.3, -e.size * 0.2, e.size * 0.25, 0, Math.PI * 2);
      ctx.fill();

      // Enemy HP Bar for Boss / Golem
      if (e.type === 'boss' || e.type === 'golem') {
        const barW = e.size * 2;
        const barH = 4;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(-barW / 2, -e.size - 10, barW, barH);
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(-barW / 2, -e.size - 10, barW * (e.hp / e.maxHp), barH);
      }

      ctx.restore();
    }
  }

  drawPlayer(ctx) {
    const p = this.player;
    ctx.save();
    ctx.translate(p.x, p.y);

    // Aegis Shield Bubble
    if (this.activeStatuses['holy_shield']) {
      ctx.strokeStyle = '#4da6ff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#4da6ff';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(0, 0, p.size + 14, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, p.size * 0.8, p.size * 0.9, p.size * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bobbing walk animation
    const bob = Math.sin(p.walkAnim) * 2;

    // Body (Streamer Avatar with Headset)
    ctx.scale(p.facing, 1);

    // Jacket / Torso
    ctx.fillStyle = '#3b82f6';
    ctx.shadowColor = '#3b82f6';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(-p.size * 0.7, -p.size * 0.5 + bob, p.size * 1.4, p.size * 1.1, 4);
    ctx.fill();

    // Head
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(0, -p.size * 0.9 + bob, p.size * 0.65, 0, Math.PI * 2);
    ctx.fill();

    // Gaming Headset (Neon Magenta)
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, -p.size * 0.9 + bob, p.size * 0.75, Math.PI * 0.8, Math.PI * 2.2);
    ctx.stroke();
    // Earcups
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(-p.size * 0.85, -p.size * 1.1 + bob, 4, 8);
    ctx.fillRect(p.size * 0.65, -p.size * 1.1 + bob, 4, 8);

    // Eyes
    ctx.fillStyle = '#1e1e2e';
    ctx.beginPath();
    ctx.arc(p.size * 0.25, -p.size * 0.9 + bob, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Draw Orbiting Fireballs
    if (p.canAttack) {
      for (const w of p.weapons) {
        if (w.type === 'orbit') {
          for (let i = 0; i < w.count; i++) {
            const orbAngle = w.angle + (i * Math.PI * 2) / w.count;
            const ox = p.x + Math.cos(orbAngle) * w.radius;
            const oy = p.y + Math.sin(orbAngle) * w.radius;

            ctx.save();
            ctx.fillStyle = '#ff8800';
            ctx.shadowColor = '#ff3300';
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(ox, oy, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }
    }
  }

  drawProjectiles(ctx) {
    for (const pr of this.projectiles) {
      ctx.save();
      ctx.fillStyle = pr.color;
      ctx.shadowColor = pr.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const ep of this.enemyProjectiles) {
      ctx.save();
      ctx.fillStyle = ep.color;
      ctx.shadowColor = ep.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(ep.x, ep.y, ep.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.restore();
    }

    for (const t of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, t.alpha);
      ctx.font = '800 13px Nunito, sans-serif';
      ctx.fillStyle = t.color;
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.textAlign = 'center';
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }
  }

  drawFogOfWar() {
    const fCtx = this.fogCtx;
    fCtx.clearRect(0, 0, this.W, this.H);

    // Dark layer
    fCtx.fillStyle = 'rgba(3, 3, 10, 0.94)';
    fCtx.fillRect(0, 0, this.W, this.H);

    // Torch cutout around player
    fCtx.globalCompositeOperation = 'destination-out';
    const px = this.player.x - this.camera.x;
    const py = this.player.y - this.camera.y;
    const torchR = 110;

    const grad = fCtx.createRadialGradient(px, py, 20, px, py, torchR);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.7, 'rgba(0,0,0,0.8)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    fCtx.fillStyle = grad;
    fCtx.beginPath();
    fCtx.arc(px, py, torchR, 0, Math.PI * 2);
    fCtx.fill();

    fCtx.globalCompositeOperation = 'source-over';
    this.ctx.drawImage(this.fogCanvas, 0, 0);
  }

  drawBanner(ctx) {
    const b = this.banner;
    ctx.save();
    ctx.font = '900 15px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textW = ctx.measureText(b.text).width;
    const pad = 24;

    ctx.fillStyle = 'rgba(10, 10, 25, 0.9)';
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 2;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.roundRect(this.W / 2 - textW / 2 - pad, 75, textW + pad * 2, 38, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = b.color;
    ctx.fillText(b.text, this.W / 2, 94);
    ctx.restore();
  }

  drawJoystick(ctx) {
    const j = this.joystick;
    ctx.save();
    // Outer circle
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(j.startX, j.startY, 50, 0, Math.PI * 2);
    ctx.stroke();

    // Thumb stick
    ctx.fillStyle = 'rgba(77, 150, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(j.startX + j.dx * 50, j.startY + j.dy * 50, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Instantiate game on load
window.addEventListener('DOMContentLoaded', () => {
  const game = new TormentGame();
  game.run();
});
