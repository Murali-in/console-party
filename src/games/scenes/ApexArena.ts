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
  invincible: number;
  playerId: string;
  playerName: string;
  color: number;
  colorHex: string;
  vx: number; vy: number;
  shieldActive: boolean;
  shieldTimer: number;
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
        shootCooldown: 0, dashCooldown: 0, invincible: 0,
        shieldActive: false, shieldTimer: 0,
        playerId: p.id, playerName: p.name,
        color, colorHex: p.color,
        vx: 0, vy: 0,
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
    const speed = 240;
    const friction = 0.85;

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

      const inp = this.inputMap[ps.playerId] || { x: 0, y: 0, buttonA: false, buttonB: false };

      // Dash (button B)
      ps.dashCooldown -= delta;
      if (inp.buttonB && ps.dashCooldown <= 0 && (Math.abs(inp.x) > 0.2 || Math.abs(inp.y) > 0.2)) {
        ps.dashCooldown = 2000;
        const dashPower = 500;
        ps.vx = inp.x * dashPower;
        ps.vy = inp.y * dashPower;
        // Dash trail particles
        for (let i = 0; i < 8; i++) {
          this.particles.push({
            x: ps.x, y: ps.y,
            vx: (Math.random() - 0.5) * 100, vy: (Math.random() - 0.5) * 100,
            life: 300, color: ps.color, size: 4,
          });
        }
      }

      // Movement
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
        if (ps.playerId === b.ownerId || !ps.alive || ps.invincible > 0 || ps.shieldActive) return;
        const dist = Phaser.Math.Distance.Between(b.sprite.x, b.sprite.y, ps.x, ps.y);
        if (dist < 18) {
          ps.hp--;
          playHit();
          this.cameras.main.shake(80, 0.003);
          this.spawnSparks(b.sprite.x, b.sprite.y, ps.color);

          // Knockback
          const knockAngle = Math.atan2(b.vy, b.vx);
          ps.vx += Math.cos(knockAngle) * 100;
          ps.vy += Math.sin(knockAngle) * 100;

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
