import Phaser from 'phaser';
import type { RoomPlayer } from '@/contexts/RealtimeContext';
import { playShoot, playHit, playEliminate, playVictory } from '@/games/SoundFX';

interface ApexConfig {
  players: RoomPlayer[];
  onGameOver: (winner: string, scores: Record<string, number>) => void;
  inputMap: Record<string, { x: number; y: number; buttonA: boolean; buttonB: boolean; buttonX: boolean; buttonY: boolean; holdTime: number }>;
}

interface PlayerState {
  body: Phaser.GameObjects.Container;
  x: number; y: number;
  hp: number; maxHp: number;
  lives: number; kills: number;
  lastAngle: number;
  respawnTimer: number;
  alive: boolean;
  shootCooldown: number;
  dashCooldown: number;
  meleeCooldown: number;
  invincible: number;
  playerId: string;
  playerName: string;
  color: number;
  colorHex: string;
  vx: number; vy: number;
  shieldActive: boolean;
  shieldTimer: number;
  shieldCooldown: number;
  // Visual effect state
  meleeSlashTimer: number;
  dashTrailTimer: number;
  hitFlashTimer: number;
  speedTrailTimer: number;
}

interface Bullet {
  sprite: Phaser.GameObjects.Container;
  vx: number; vy: number;
  ownerId: string; life: number;
}

export default class ApexArenaScene extends Phaser.Scene {
  private roomPlayers: RoomPlayer[];
  private onGameOver: ApexConfig['onGameOver'];
  private inputMap: ApexConfig['inputMap'];
  private playerStates: Map<string, PlayerState> = new Map();
  private bullets: Bullet[] = [];
  private obstacles: { x: number; y: number; hw: number; hh: number }[] = [];
  private gameTimer = 180000;
  private finished = false;
  private gfx!: Phaser.GameObjects.Graphics;
  private particleGfx!: Phaser.GameObjects.Graphics;
  private particles: { x: number; y: number; vx: number; vy: number; life: number; color: number; size: number }[] = [];
  private killFeedTexts: { text: Phaser.GameObjects.Text; timer: number }[] = [];

  private arenaLeft = 30;
  private arenaRight = 0;
  private arenaTop = 50;
  private arenaBottom = 0;

  constructor(config: ApexConfig) {
    super({ key: 'ApexArena' });
    this.roomPlayers = config.players;
    this.onGameOver = config.onGameOver;
    this.inputMap = config.inputMap;
  }

  create() {
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);
    this.arenaRight = w - 30;
    this.arenaBottom = h - 30;

    this.gfx = this.add.graphics().setDepth(0);
    this.particleGfx = this.add.graphics().setDepth(15);

    // Draw arena floor with subtle grid
    this.gfx.fillStyle(0x0a0a18, 1);
    this.gfx.fillRect(this.arenaLeft, this.arenaTop, this.arenaRight - this.arenaLeft, this.arenaBottom - this.arenaTop);
    this.gfx.lineStyle(1, 0xffffff, 0.03);
    for (let x = this.arenaLeft; x <= this.arenaRight; x += 40)
      this.gfx.lineBetween(x, this.arenaTop, x, this.arenaBottom);
    for (let y = this.arenaTop; y <= this.arenaBottom; y += 40)
      this.gfx.lineBetween(this.arenaLeft, y, this.arenaRight, y);

    // Arena border glow
    this.gfx.lineStyle(2, 0x6c63ff, 0.2);
    this.gfx.strokeRect(this.arenaLeft, this.arenaTop, this.arenaRight - this.arenaLeft, this.arenaBottom - this.arenaTop);

    // Obstacles - 3D-looking crates with shadows
    const cratePositions = [
      { x: w * 0.2, y: h * 0.25 }, { x: w * 0.8, y: h * 0.25 },
      { x: w * 0.5, y: h * 0.5 },
      { x: w * 0.2, y: h * 0.75 }, { x: w * 0.8, y: h * 0.75 },
      { x: w * 0.35, y: h * 0.4 }, { x: w * 0.65, y: h * 0.6 },
    ];
    cratePositions.forEach(pos => {
      this.obstacles.push({ x: pos.x, y: pos.y, hw: 20, hh: 20 });
      // Shadow
      this.add.rectangle(pos.x + 3, pos.y + 4, 40, 40, 0x000000, 0.3).setDepth(1);
      // Crate body (3D effect: top face lighter)
      this.add.rectangle(pos.x, pos.y, 40, 40, 0x1a1a2e).setStrokeStyle(1, 0x6c63ff, 0.2).setDepth(2);
      // Top highlight
      this.add.rectangle(pos.x, pos.y - 6, 36, 12, 0x22223a, 0.6).setDepth(3);
      // Cross pattern
      const cg = this.add.graphics().setDepth(3);
      cg.lineStyle(1, 0x6c63ff, 0.08);
      cg.lineBetween(pos.x - 14, pos.y - 14, pos.x + 14, pos.y + 14);
      cg.lineBetween(pos.x + 14, pos.y - 14, pos.x - 14, pos.y + 14);
    });

    // Spawn players with pseudo-3D characters
    this.roomPlayers.forEach((p, i) => {
      const angle = (i / this.roomPlayers.length) * Math.PI * 2;
      const px = w / 2 + Math.cos(angle) * Math.min(w * 0.3, 200);
      const py = h / 2 + Math.sin(angle) * Math.min(h * 0.3, 130);
      const color = Phaser.Display.Color.HexStringToColor(p.color).color;

      const container = this.add.container(px, py).setDepth(5);

      // Shadow ellipse
      const shadow = this.add.ellipse(0, 10, 26, 10, 0x000000, 0.3);
      container.add(shadow);

      // Body (larger circle with gradient effect)
      const bodyOuter = this.add.circle(0, 0, 14, color, 0.3);
      const bodyMain = this.add.circle(0, -1, 12, color);
      const bodyHighlight = this.add.circle(-3, -5, 5, 0xffffff, 0.15);
      container.add([bodyOuter, bodyMain, bodyHighlight]);

      // Direction indicator (weapon barrel)
      const barrel = this.add.rectangle(18, 0, 14, 4, color, 0.7).setOrigin(0, 0.5);
      container.add(barrel);

      // Name tag with background
      const nameBg = this.add.rectangle(0, -26, p.name.length * 7 + 8, 14, 0x000000, 0.5).setOrigin(0.5);
      const label = this.add.text(0, -26, p.name, {
        fontSize: '9px', fontFamily: 'JetBrains Mono', color: '#ffffff',
      }).setOrigin(0.5);
      container.add([nameBg, label]);

      // HP bar
      const hpBg = this.add.rectangle(0, 20, 30, 4, 0x333333);
      const hpFill = this.add.rectangle(0, 20, 30, 4, 0x34d399);
      container.add([hpBg, hpFill]);

      this.playerStates.set(p.id, {
        body: container,
        x: px, y: py,
        hp: 3, maxHp: 3, lives: 3, kills: 0,
        lastAngle: 0, respawnTimer: 0, alive: true,
        shootCooldown: 0, dashCooldown: 0, meleeCooldown: 0, invincible: 0,
        shieldActive: false, shieldTimer: 0, shieldCooldown: 0,
        playerId: p.id, playerName: p.name,
        color, colorHex: p.color,
        vx: 0, vy: 0,
        meleeSlashTimer: 0, dashTrailTimer: 0, hitFlashTimer: 0, speedTrailTimer: 0,
      });
    });

    // HUD
    let hudY = 8;
    this.roomPlayers.forEach(p => {
      this.add.text(16, hudY, '', {
        fontSize: '10px', fontFamily: 'JetBrains Mono', color: p.color,
      }).setDepth(30).setName(`hud-${p.id}`);
      hudY += 18;
    });

    this.add.text(w - 16, 8, '', {
      fontSize: '12px', fontFamily: 'JetBrains Mono', color: '#6c63ff',
    }).setOrigin(1, 0).setName('timer').setDepth(30);

    this.add.text(w / 2, 8, 'APEX ARENA · First to 10 kills', {
      fontSize: '9px', fontFamily: 'JetBrains Mono', color: 'rgba(255,255,255,0.2)',
    }).setOrigin(0.5, 0).setDepth(30);
  }

  update(_time: number, delta: number) {
    if (this.finished) return;

    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);
    const dt = delta / 1000;
    const baseSpeed = 280;
    const maxSpeed = 550;
    const friction = 0.88;

    this.gameTimer -= delta;
    const timerTxt = this.children.getByName('timer') as Phaser.GameObjects.Text;
    if (timerTxt) {
      const secs = Math.max(0, Math.ceil(this.gameTimer / 1000));
      timerTxt.setText(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`);
    }

    // Kill feed
    this.killFeedTexts = this.killFeedTexts.filter(kf => {
      kf.timer -= delta;
      kf.text.setAlpha(Math.max(0, kf.timer / 2000));
      if (kf.timer <= 0) { kf.text.destroy(); return false; }
      return true;
    });

    // Update particles
    this.particleGfx.clear();
    this.particles = this.particles.filter(p => {
      p.life -= delta;
      if (p.life <= 0) return false;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.95;
      p.vy *= 0.95;
      const alpha = Math.max(0, p.life / 500);
      this.particleGfx.fillStyle(p.color, alpha);
      this.particleGfx.fillCircle(p.x, p.y, p.size * alpha);
      return true;
    });

    // Players
    this.playerStates.forEach((ps) => {
      if (!ps.alive) {
        ps.respawnTimer -= delta;
        ps.body.setVisible(false);
        if (ps.respawnTimer <= 0 && ps.lives > 0) {
          ps.alive = true;
          ps.hp = ps.maxHp;
          ps.invincible = 1500;
          ps.x = w / 2 + (Math.random() - 0.5) * 250;
          ps.y = h / 2 + (Math.random() - 0.5) * 180;
          ps.body.setPosition(ps.x, ps.y).setVisible(true).setAlpha(0.5);
        }
        return;
      }

      if (ps.invincible > 0) {
        ps.invincible -= delta;
        ps.body.setAlpha(0.3 + Math.sin(_time * 0.015) * 0.2);
        if (ps.invincible <= 0) ps.body.setAlpha(1);
      }

      const inp = this.inputMap[ps.playerId] || { x: 0, y: 0, buttonA: false, buttonB: false, buttonX: false, buttonY: false, holdTime: 0 };

      // === SPEED RAMPING: hold longer = exponentially faster ===
      const holdMs = inp.holdTime || 0;
      const holdFactor = Math.min(1, holdMs / 400); // 0.4s to max
      const speedCurve = holdFactor * holdFactor; // exponential feel
      const speed = baseSpeed + (maxSpeed - baseSpeed) * speedCurve;

      // Speed trail particles when running fast
      if (holdFactor > 0.5 && (Math.abs(inp.x) > 0.2 || Math.abs(inp.y) > 0.2)) {
        ps.speedTrailTimer -= delta;
        if (ps.speedTrailTimer <= 0) {
          ps.speedTrailTimer = 60;
          this.particles.push({
            x: ps.x - inp.x * 8 + (Math.random() - 0.5) * 6,
            y: ps.y - inp.y * 8 + (Math.random() - 0.5) * 6,
            vx: -inp.x * 30, vy: -inp.y * 30,
            life: 200, color: ps.color, size: 2 + holdFactor * 3,
          });
        }
      }

      // Decay timers
      ps.shootCooldown -= delta;
      ps.dashCooldown -= delta;
      ps.meleeCooldown -= delta;
      ps.meleeSlashTimer -= delta;
      ps.dashTrailTimer -= delta;
      ps.hitFlashTimer -= delta;

      // === SHIELD (button X) — glowing energy bubble ===
      if (ps.shieldCooldown > 0) ps.shieldCooldown -= delta;
      if (inp.buttonX && !ps.shieldActive && ps.shieldCooldown <= 0) {
        ps.shieldActive = true;
        ps.shieldTimer = 2000; // 2s duration
        // Shield activation burst
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          this.particles.push({
            x: ps.x + Math.cos(a) * 22, y: ps.y + Math.sin(a) * 22,
            vx: Math.cos(a) * 40, vy: Math.sin(a) * 40,
            life: 400, color: 0x60a5fa, size: 3,
          });
        }
      }
      if (ps.shieldActive) {
        ps.shieldTimer -= delta;
        if (ps.shieldTimer <= 0) {
          ps.shieldActive = false;
          ps.shieldCooldown = 4000; // 4s cooldown
          // Shield break particles
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            this.particles.push({
              x: ps.x + Math.cos(a) * 24, y: ps.y + Math.sin(a) * 24,
              vx: Math.cos(a) * 80, vy: Math.sin(a) * 80,
              life: 300, color: 0x3b82f6, size: 2,
            });
          }
        }
        // Draw animated shield bubble
        const shieldAlpha = 0.25 + Math.sin(_time * 0.008) * 0.1;
        const shieldRadius = 24 + Math.sin(_time * 0.012) * 2;
        this.particleGfx.lineStyle(2, 0x60a5fa, shieldAlpha + 0.3);
        this.particleGfx.strokeCircle(ps.x, ps.y, shieldRadius);
        this.particleGfx.fillStyle(0x60a5fa, shieldAlpha * 0.4);
        this.particleGfx.fillCircle(ps.x, ps.y, shieldRadius);
        // Hex pattern on shield
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + _time * 0.002;
          const sx = ps.x + Math.cos(a) * shieldRadius * 0.7;
          const sy = ps.y + Math.sin(a) * shieldRadius * 0.7;
          this.particleGfx.fillStyle(0x93c5fd, shieldAlpha * 0.6);
          this.particleGfx.fillCircle(sx, sy, 2);
        }
        // Blocked bullets create shield spark effect
      }

      // === MELEE (button Y) — slash arc + impact ===
      if (inp.buttonY && ps.meleeCooldown <= 0) {
        ps.meleeCooldown = 1000;
        ps.meleeSlashTimer = 250; // visible for 250ms

        // Check nearby enemies for melee hit
        this.playerStates.forEach(target => {
          if (target.playerId === ps.playerId || !target.alive || target.invincible > 0) return;
          const dist = Phaser.Math.Distance.Between(ps.x, ps.y, target.x, target.y);
          if (dist < 50) {
            // Shield blocks melee but takes a big hit
            if (target.shieldActive) {
              target.shieldTimer = Math.max(0, target.shieldTimer - 800);
              // Shield impact sparks
              for (let i = 0; i < 8; i++) {
                this.particles.push({
                  x: target.x + (Math.random() - 0.5) * 20,
                  y: target.y + (Math.random() - 0.5) * 20,
                  vx: (Math.random() - 0.5) * 150, vy: (Math.random() - 0.5) * 150,
                  life: 300, color: 0x60a5fa, size: 3,
                });
              }
              this.cameras.main.shake(60, 0.003);
              return;
            }

            target.hp -= 2;
            target.hitFlashTimer = 200;
            playHit();
            this.cameras.main.shake(120, 0.008);

            // Heavy knockback
            const knockAngle = Math.atan2(target.y - ps.y, target.x - ps.x);
            target.vx += Math.cos(knockAngle) * 350;
            target.vy += Math.sin(knockAngle) * 350;

            // Hit impact: red X slash on target
            for (let i = 0; i < 12; i++) {
              const a = Math.random() * Math.PI * 2;
              this.particles.push({
                x: target.x, y: target.y,
                vx: Math.cos(a) * (80 + Math.random() * 80),
                vy: Math.sin(a) * (80 + Math.random() * 80),
                life: 400, color: 0xf87171, size: 2 + Math.random() * 3,
              });
            }
            // Damage number popup
            const dmgText = this.add.text(target.x, target.y - 20, '-2', {
              fontSize: '14px', fontFamily: 'Syne', color: '#f87171', fontStyle: 'bold',
            }).setOrigin(0.5).setDepth(20);
            this.tweens.add({
              targets: dmgText, y: target.y - 50, alpha: 0,
              duration: 600, onComplete: () => dmgText.destroy(),
            });

            if (target.hp <= 0) {
              target.lives--;
              target.alive = false;
              target.respawnTimer = 3000;
              target.body.setVisible(false);
              playEliminate();
              this.spawnExplosion(target.x, target.y, target.color);
              ps.kills++;
              this.addKillFeed(`${ps.playerName} ⚔ ${target.playerName}`);
            }
          }
        });
      }

      // Draw melee slash arc visual
      if (ps.meleeSlashTimer > 0) {
        const slashProgress = 1 - (ps.meleeSlashTimer / 250);
        const arcStart = ps.lastAngle - 0.8;
        const arcEnd = ps.lastAngle + 0.8;
        const slashRadius = 30 + slashProgress * 15;
        const slashAlpha = 1 - slashProgress;

        // Draw slash arc
        this.particleGfx.lineStyle(4 - slashProgress * 3, ps.color, slashAlpha * 0.8);
        this.particleGfx.beginPath();
        this.particleGfx.arc(ps.x, ps.y, slashRadius, arcStart, arcEnd, false);
        this.particleGfx.strokePath();

        // Inner glow arc
        this.particleGfx.lineStyle(2, 0xffffff, slashAlpha * 0.4);
        this.particleGfx.beginPath();
        this.particleGfx.arc(ps.x, ps.y, slashRadius - 3, arcStart + 0.1, arcEnd - 0.1, false);
        this.particleGfx.strokePath();
      }

      // === DASH (button B) — afterimage trail ===
      if (inp.buttonB && ps.dashCooldown <= 0 && (Math.abs(inp.x) > 0.2 || Math.abs(inp.y) > 0.2)) {
        ps.dashCooldown = 2000;
        ps.dashTrailTimer = 200;
        const dashPower = 600;
        ps.vx = inp.x * dashPower;
        ps.vy = inp.y * dashPower;

        // Dash burst particles (directional cone)
        const dashAngle = Math.atan2(inp.y, inp.x);
        for (let i = 0; i < 15; i++) {
          const spread = (Math.random() - 0.5) * 1.2;
          this.particles.push({
            x: ps.x, y: ps.y,
            vx: Math.cos(dashAngle + Math.PI + spread) * (60 + Math.random() * 80),
            vy: Math.sin(dashAngle + Math.PI + spread) * (60 + Math.random() * 80),
            life: 350, color: ps.color, size: 3 + Math.random() * 3,
          });
        }
      }

      // Draw dash afterimages
      if (ps.dashTrailTimer > 0) {
        const trailAlpha = ps.dashTrailTimer / 200;
        this.particleGfx.fillStyle(ps.color, trailAlpha * 0.3);
        this.particleGfx.fillCircle(ps.x - ps.vx * dt * 2, ps.y - ps.vy * dt * 2, 12);
        this.particleGfx.fillStyle(ps.color, trailAlpha * 0.15);
        this.particleGfx.fillCircle(ps.x - ps.vx * dt * 4, ps.y - ps.vy * dt * 4, 10);
      }

      // === HIT FLASH — red tint on damage ===
      if (ps.hitFlashTimer > 0) {
        const flashAlpha = ps.hitFlashTimer / 200;
        this.particleGfx.fillStyle(0xff0000, flashAlpha * 0.3);
        this.particleGfx.fillCircle(ps.x, ps.y, 16);
        ps.body.setAlpha(0.6 + Math.sin(_time * 0.03) * 0.3);
      } else if (ps.invincible <= 0) {
        ps.body.setAlpha(1);
      }

      // Movement with speed ramping
      ps.vx += inp.x * speed * dt;
      ps.vy += inp.y * speed * dt;
      ps.vx *= friction;
      ps.vy *= friction;

      let nx = ps.x + ps.vx * dt;
      let ny = ps.y + ps.vy * dt;
      nx = Phaser.Math.Clamp(nx, this.arenaLeft + 16, this.arenaRight - 16);
      ny = Phaser.Math.Clamp(ny, this.arenaTop + 16, this.arenaBottom - 16);

      // Obstacle collision
      this.obstacles.forEach(obs => {
        if (Math.abs(nx - obs.x) < obs.hw + 14 && Math.abs(ny - obs.y) < obs.hh + 14) {
          const overlapX = obs.hw + 14 - Math.abs(nx - obs.x);
          const overlapY = obs.hh + 14 - Math.abs(ny - obs.y);
          if (overlapX < overlapY) { nx += Math.sign(nx - obs.x) * overlapX; ps.vx *= -0.3; }
          else { ny += Math.sign(ny - obs.y) * overlapY; ps.vy *= -0.3; }
        }
      });

      ps.x = nx; ps.y = ny;
      ps.body.setPosition(nx, ny);

      // Face direction & rotate barrel
      if (Math.abs(inp.x) > 0.15 || Math.abs(inp.y) > 0.15) {
        ps.lastAngle = Math.atan2(inp.y, inp.x);
      }
      // Rotate the barrel (4th child: bodyOuter=0, bodyMain=1, bodyHighlight=2, barrel=3... wait, shadow=0)
      const barrel = ps.body.getAt(4) as Phaser.GameObjects.Rectangle;
      if (barrel) barrel.setAngle(Phaser.Math.RadToDeg(ps.lastAngle));

      // Update HP bar
      const hpFill = ps.body.getAt(8) as Phaser.GameObjects.Rectangle;
      if (hpFill) hpFill.setDisplaySize(30 * (ps.hp / ps.maxHp), 4);

      // Shoot
      ps.shootCooldown -= delta;
      if (inp.buttonA && ps.shootCooldown <= 0) {
        ps.shootCooldown = 220;
        playShoot();
        const bSpeed = 500;
        const bx = ps.x + Math.cos(ps.lastAngle) * 20;
        const by = ps.y + Math.sin(ps.lastAngle) * 20;

        const bulletContainer = this.add.container(bx, by).setDepth(4);
        // Bullet glow
        const glow = this.add.circle(0, 0, 6, 0xffffff, 0.15);
        const core = this.add.rectangle(0, 0, 8, 3, 0xf0f0f5).setAngle(Phaser.Math.RadToDeg(ps.lastAngle));
        bulletContainer.add([glow, core]);

        this.bullets.push({
          sprite: bulletContainer,
          vx: Math.cos(ps.lastAngle) * bSpeed,
          vy: Math.sin(ps.lastAngle) * bSpeed,
          ownerId: ps.playerId, life: 1200,
        });

        // Muzzle flash
        const flash = this.add.circle(bx, by, 7, 0xffffff, 0.5).setDepth(6);
        this.time.delayedCall(50, () => flash.destroy());
      }
    });

    // Bullets
    this.bullets = this.bullets.filter(b => {
      b.life -= delta;
      if (b.life <= 0) { b.sprite.destroy(); return false; }

      b.sprite.x += b.vx * dt;
      b.sprite.y += b.vy * dt;

      // Bullet trail particle
      if (Math.random() < 0.4) {
        this.particles.push({
          x: b.sprite.x, y: b.sprite.y,
          vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20,
          life: 150, color: 0xffffff, size: 1.5,
        });
      }

      if (b.sprite.x < this.arenaLeft || b.sprite.x > this.arenaRight ||
          b.sprite.y < this.arenaTop || b.sprite.y > this.arenaBottom) {
        b.sprite.destroy(); return false;
      }

      // Hit obstacles
      for (const obs of this.obstacles) {
        if (Math.abs(b.sprite.x - obs.x) < obs.hw + 5 && Math.abs(b.sprite.y - obs.y) < obs.hh + 5) {
          this.spawnSparks(b.sprite.x, b.sprite.y, 0xfbbf24);
          b.sprite.destroy(); return false;
        }
      }

      // Hit players
      let hit = false;
      this.playerStates.forEach(ps => {
        if (ps.playerId === b.ownerId || !ps.alive || ps.invincible > 0) return;
        const dist = Phaser.Math.Distance.Between(b.sprite.x, b.sprite.y, ps.x, ps.y);
        if (dist < 18) {
          // Shield blocks bullets with sparks
          if (ps.shieldActive) {
            for (let i = 0; i < 6; i++) {
              const a = Math.random() * Math.PI * 2;
              this.particles.push({
                x: b.sprite.x, y: b.sprite.y,
                vx: Math.cos(a) * 120, vy: Math.sin(a) * 120,
                life: 250, color: 0x60a5fa, size: 2,
              });
            }
            hit = true;
            return;
          }

          ps.hp--;
          ps.hitFlashTimer = 200;
          playHit();
          this.cameras.main.shake(80, 0.004);

          // Blood/hit sparks
          for (let i = 0; i < 8; i++) {
            const a = Math.random() * Math.PI * 2;
            this.particles.push({
              x: b.sprite.x, y: b.sprite.y,
              vx: Math.cos(a) * (50 + Math.random() * 80),
              vy: Math.sin(a) * (50 + Math.random() * 80),
              life: 350, color: 0xf87171, size: 2 + Math.random() * 2,
            });
          }

          // Damage number
          const dmgText = this.add.text(ps.x, ps.y - 18, '-1', {
            fontSize: '12px', fontFamily: 'Syne', color: '#fbbf24', fontStyle: 'bold',
          }).setOrigin(0.5).setDepth(20);
          this.tweens.add({
            targets: dmgText, y: ps.y - 45, alpha: 0,
            duration: 500, onComplete: () => dmgText.destroy(),
          });

          // Knockback
          const knockAngle = Math.atan2(b.vy, b.vx);
          ps.vx += Math.cos(knockAngle) * 120;
          ps.vy += Math.sin(knockAngle) * 120;

          if (ps.hp <= 0) {
            ps.lives--;
            ps.alive = false;
            ps.respawnTimer = 3000;
            ps.body.setVisible(false);
            playEliminate();
            this.spawnExplosion(ps.x, ps.y, ps.color);
            const killer = this.playerStates.get(b.ownerId);
            if (killer) {
              killer.kills++;
              this.addKillFeed(`${killer.playerName} → ${ps.playerName}`);
            }
          }
          hit = true;
        }
      });
      if (hit) { b.sprite.destroy(); return false; }
      return true;
    });

    // HUD
    this.playerStates.forEach(ps => {
      const ht = this.children.getByName(`hud-${ps.playerId}`) as Phaser.GameObjects.Text;
      if (ht) {
        const status = !ps.alive && ps.lives <= 0 ? ' ✕' : !ps.alive ? ' ↻' : '';
        ht.setText(`${ps.playerName} K:${ps.kills} L:${ps.lives}${status}`);
      }
    });

    this.checkWin();
  }

  spawnSparks(x: number, y: number, color: number) {
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 200, vy: (Math.random() - 0.5) * 200,
        life: 300, color, size: 3,
      });
    }
  }

  spawnExplosion(x: number, y: number, color: number) {
    for (let i = 0; i < 15; i++) {
      const angle = (i / 15) * Math.PI * 2;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * (100 + Math.random() * 100),
        vy: Math.sin(angle) * (100 + Math.random() * 100),
        life: 500, color, size: 5,
      });
    }
  }

  addKillFeed(msg: string) {
    const w = Number(this.game.config.width);
    const yPos = 50 + this.killFeedTexts.length * 16;
    const text = this.add.text(w - 16, yPos, msg, {
      fontSize: '9px', fontFamily: 'JetBrains Mono', color: '#f87171',
    }).setOrigin(1, 0).setDepth(25);
    this.killFeedTexts.push({ text, timer: 3000 });
  }

  checkWin() {
    this.playerStates.forEach(ps => {
      if (ps.kills >= 10) this.endGame(ps.playerName);
    });
    if (this.gameTimer <= 0) {
      let best: PlayerState | null = null;
      this.playerStates.forEach(ps => { if (!best || ps.kills > best.kills) best = ps; });
      this.endGame(best?.playerName || 'Nobody');
    }
    const withLives = Array.from(this.playerStates.values()).filter(ps => ps.lives > 0 || ps.alive);
    if (withLives.length === 1) this.endGame(withLives[0].playerName);
  }

  endGame(winner: string) {
    if (this.finished) return;
    this.finished = true;
    playVictory();
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);

    this.add.rectangle(w / 2, h / 2, w, h, 0x080810, 0.7).setDepth(50);
    this.add.text(w / 2, h / 2 - 20, '🏆', { fontSize: '40px' }).setOrigin(0.5).setDepth(51);
    this.add.text(w / 2, h / 2 + 20, `${winner} wins!`, {
      fontSize: '28px', fontFamily: 'Syne', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(51);

    const scores: Record<string, number> = {};
    this.playerStates.forEach(ps => { scores[ps.playerName] = ps.kills; });
    this.time.delayedCall(3000, () => this.onGameOver(winner, scores));
  }
}
