import Phaser from 'phaser';
import type { RoomPlayer } from '@/contexts/RealtimeContext';
import { playShoot, playHit, playEliminate, playVictory } from '@/games/SoundFX';

interface ApexConfig {
  players: RoomPlayer[];
  onGameOver: (winner: string, scores: Record<string, number>) => void;
  inputMap: Record<string, { x: number; y: number; buttonA: boolean; buttonB: boolean }>;
}

interface PlayerState {
  sprite: Phaser.GameObjects.Arc;
  dirIndicator: Phaser.GameObjects.Line;
  label: Phaser.GameObjects.Text;
  hpBars: Phaser.GameObjects.Rectangle[];
  hp: number;
  maxHp: number;
  lives: number;
  kills: number;
  lastAngle: number;
  respawnTimer: number;
  alive: boolean;
  shootCooldown: number;
  invincible: number;
  playerId: string;
  playerName: string;
  color: number;
}

interface Bullet {
  sprite: Phaser.GameObjects.Rectangle;
  vx: number;
  vy: number;
  ownerId: string;
  life: number;
}

export default class ApexArenaScene extends Phaser.Scene {
  private roomPlayers: RoomPlayer[];
  private onGameOver: ApexConfig['onGameOver'];
  private inputMap: ApexConfig['inputMap'];
  private playerStates: Map<string, PlayerState> = new Map();
  private bullets: Bullet[] = [];
  private obstacles: Phaser.GameObjects.Rectangle[] = [];
  private hudTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private gameTimer = 180000;
  private finished = false;
  private killFeed: { text: Phaser.GameObjects.Text; timer: number }[] = [];

  constructor(config: ApexConfig) {
    super({ key: 'ApexArena' });
    this.roomPlayers = config.players;
    this.onGameOver = config.onGameOver;
    this.inputMap = config.inputMap;
  }

  create() {
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);

    // Arena border
    const g = this.add.graphics();
    g.lineStyle(2, 0x6c63ff, 0.3);
    g.strokeRect(30, 30, w - 60, h - 60);

    // Grid floor
    g.lineStyle(1, 0x6c63ff, 0.03);
    for (let x = 30; x < w - 30; x += 40) g.lineBetween(x, 30, x, h - 30);
    for (let y = 30; y < h - 30; y += 40) g.lineBetween(30, y, w - 30, y);

    // Obstacles (crates with cross pattern)
    const cratePositions = [
      { x: w * 0.2, y: h * 0.25 }, { x: w * 0.8, y: h * 0.25 },
      { x: w * 0.5, y: h * 0.5 },
      { x: w * 0.2, y: h * 0.75 }, { x: w * 0.8, y: h * 0.75 },
      { x: w * 0.35, y: h * 0.15 }, { x: w * 0.65, y: h * 0.85 },
      { x: w * 0.35, y: h * 0.5 }, { x: w * 0.65, y: h * 0.5 },
    ];
    cratePositions.forEach(pos => {
      const crate = this.add.rectangle(pos.x, pos.y, 36, 36, 0x16162a);
      crate.setStrokeStyle(1, 0x6c63ff, 0.25);
      this.obstacles.push(crate);
      // Cross marking
      const cg = this.add.graphics();
      cg.lineStyle(1, 0x6c63ff, 0.1);
      cg.lineBetween(pos.x - 12, pos.y - 12, pos.x + 12, pos.y + 12);
      cg.lineBetween(pos.x + 12, pos.y - 12, pos.x - 12, pos.y + 12);
    });

    // Spawn players
    this.roomPlayers.forEach((p, i) => {
      const angle = (i / this.roomPlayers.length) * Math.PI * 2;
      const px = w / 2 + Math.cos(angle) * Math.min(w * 0.3, 200);
      const py = h / 2 + Math.sin(angle) * Math.min(h * 0.3, 130);
      const color = Phaser.Display.Color.HexStringToColor(p.color).color;

      const sprite = this.add.circle(px, py, 12, color).setStrokeStyle(1, 0xffffff, 0.2).setDepth(5);
      const dirIndicator = this.add.line(0, 0, px, py, px + 20, py, color, 0.4).setDepth(4);
      const label = this.add.text(px, py - 22, p.name, {
        fontSize: '9px', fontFamily: 'JetBrains Mono', color: '#f0f0f5',
      }).setOrigin(0.5).setDepth(10);

      // HP bars
      const hpBars: Phaser.GameObjects.Rectangle[] = [];
      for (let h = 0; h < 3; h++) {
        const bar = this.add.rectangle(px - 10 + h * 10, py + 18, 8, 3, 0x34d399).setDepth(10);
        hpBars.push(bar);
      }

      this.playerStates.set(p.id, {
        sprite, dirIndicator, label, hpBars,
        hp: 3, maxHp: 3, lives: 3, kills: 0,
        lastAngle: 0, respawnTimer: 0, alive: true,
        shootCooldown: 0, invincible: 0,
        playerId: p.id, playerName: p.name, color,
      });

      const ht = this.add.text(16, 16 + i * 20, '', {
        fontSize: '10px', fontFamily: 'JetBrains Mono', color: p.color,
      }).setDepth(20);
      this.hudTexts.set(p.id, ht);
    });

    // Timer
    this.add.text(w - 16, 16, '', {
      fontSize: '11px', fontFamily: 'JetBrains Mono', color: '#6c63ff',
    }).setOrigin(1, 0).setName('timer').setDepth(20);

    // Kill target
    this.add.text(w / 2, 16, 'First to 10 kills', {
      fontSize: '9px', fontFamily: 'JetBrains Mono', color: '#f0f0f5', alpha: 0.3,
    }).setOrigin(0.5, 0).setDepth(20);
  }

  update(_time: number, delta: number) {
    if (this.finished) return;

    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);
    const dt = delta / 1000;
    const speed = 200;

    this.gameTimer -= delta;

    // Timer text
    const timerTxt = this.children.getByName('timer') as Phaser.GameObjects.Text;
    if (timerTxt) {
      const secs = Math.max(0, Math.ceil(this.gameTimer / 1000));
      timerTxt.setText(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`);
    }

    // Kill feed fade
    this.killFeed = this.killFeed.filter(kf => {
      kf.timer -= delta;
      kf.text.setAlpha(Math.max(0, kf.timer / 2000));
      if (kf.timer <= 0) { kf.text.destroy(); return false; }
      return true;
    });

    // Players
    this.playerStates.forEach((ps) => {
      if (!ps.alive) {
        ps.respawnTimer -= delta;
        ps.sprite.setVisible(false);
        ps.dirIndicator.setVisible(false);
        ps.label.setVisible(false);
        ps.hpBars.forEach(b => b.setVisible(false));
        if (ps.respawnTimer <= 0 && ps.lives > 0) {
          ps.alive = true;
          ps.hp = ps.maxHp;
          ps.invincible = 1500;
          ps.sprite.setVisible(true).setAlpha(0.5);
          ps.dirIndicator.setVisible(true);
          ps.label.setVisible(true);
          ps.sprite.setPosition(
            w / 2 + (Math.random() - 0.5) * 250,
            h / 2 + (Math.random() - 0.5) * 180
          );
        }
        return;
      }

      // Invincibility
      if (ps.invincible > 0) {
        ps.invincible -= delta;
        ps.sprite.setAlpha(0.3 + Math.sin(_time * 0.015) * 0.2);
        if (ps.invincible <= 0) ps.sprite.setAlpha(1);
      }

      const inp = this.inputMap[ps.playerId] || { x: 0, y: 0, buttonA: false, buttonB: false };

      // Movement
      let nx = ps.sprite.x + inp.x * speed * dt;
      let ny = ps.sprite.y + inp.y * speed * dt;
      nx = Phaser.Math.Clamp(nx, 44, w - 44);
      ny = Phaser.Math.Clamp(ny, 44, h - 44);

      let blocked = false;
      this.obstacles.forEach(obs => {
        if (Math.abs(nx - obs.x) < 30 && Math.abs(ny - obs.y) < 30) blocked = true;
      });
      if (!blocked) ps.sprite.setPosition(nx, ny);

      ps.label.setPosition(ps.sprite.x, ps.sprite.y - 22);

      // HP bars
      ps.hpBars.forEach((bar, idx) => {
        bar.setPosition(ps.sprite.x - 10 + idx * 10, ps.sprite.y + 18);
        bar.setVisible(true);
        bar.setFillStyle(idx < ps.hp ? 0x34d399 : 0x333333);
      });

      // Face direction
      if (Math.abs(inp.x) > 0.15 || Math.abs(inp.y) > 0.15) {
        ps.lastAngle = Math.atan2(inp.y, inp.x);
      }

      // Direction indicator
      const indicatorLen = 22;
      ps.dirIndicator.setTo(
        ps.sprite.x, ps.sprite.y,
        ps.sprite.x + Math.cos(ps.lastAngle) * indicatorLen,
        ps.sprite.y + Math.sin(ps.lastAngle) * indicatorLen
      );

      // Shoot
      ps.shootCooldown -= delta;
      if (inp.buttonA && ps.shootCooldown <= 0) {
        ps.shootCooldown = 250;
        playShoot();
        const bSpeed = 450;
        const bullet: Bullet = {
          sprite: this.add.rectangle(
            ps.sprite.x + Math.cos(ps.lastAngle) * 16,
            ps.sprite.y + Math.sin(ps.lastAngle) * 16,
            6, 3, 0xf0f0f5
          ).setAngle(Phaser.Math.RadToDeg(ps.lastAngle)).setDepth(3),
          vx: Math.cos(ps.lastAngle) * bSpeed,
          vy: Math.sin(ps.lastAngle) * bSpeed,
          ownerId: ps.playerId,
          life: 1200,
        };
        this.bullets.push(bullet);

        // Muzzle flash
        const flash = this.add.circle(
          ps.sprite.x + Math.cos(ps.lastAngle) * 18,
          ps.sprite.y + Math.sin(ps.lastAngle) * 18,
          5, 0xffffff, 0.6
        ).setDepth(6);
        this.time.delayedCall(60, () => flash.destroy());
      }
    });

    // Bullets
    this.bullets = this.bullets.filter(b => {
      b.life -= delta;
      if (b.life <= 0) { b.sprite.destroy(); return false; }

      b.sprite.x += b.vx * dt;
      b.sprite.y += b.vy * dt;

      if (b.sprite.x < 30 || b.sprite.x > w - 30 || b.sprite.y < 30 || b.sprite.y > h - 30) {
        b.sprite.destroy(); return false;
      }

      for (const obs of this.obstacles) {
        if (Math.abs(b.sprite.x - obs.x) < 22 && Math.abs(b.sprite.y - obs.y) < 22) {
          // Spark effect
          const spark = this.add.circle(b.sprite.x, b.sprite.y, 4, 0xfbbf24, 0.6);
          this.time.delayedCall(80, () => spark.destroy());
          b.sprite.destroy();
          return false;
        }
      }

      let hit = false;
      this.playerStates.forEach(ps => {
        if (ps.playerId === b.ownerId || !ps.alive || ps.invincible > 0) return;
        const dist = Phaser.Math.Distance.Between(b.sprite.x, b.sprite.y, ps.sprite.x, ps.sprite.y);
        if (dist < 16) {
          ps.hp--;
          playHit();
          this.cameras.main.shake(80, 0.003);

          if (ps.hp <= 0) {
            ps.lives--;
            ps.alive = false;
            ps.respawnTimer = 3000;
            playEliminate();

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
      const ht = this.hudTexts.get(ps.playerId);
      if (ht) {
        const status = !ps.alive && ps.lives <= 0 ? ' ☠' : !ps.alive ? ' (respawning)' : '';
        ht.setText(`${ps.playerName} K:${ps.kills} ♥:${ps.lives}${status}`);
      }
    });

    this.checkWin();
  }

  addKillFeed(msg: string) {
    const w = Number(this.game.config.width);
    const yPos = 40 + this.killFeed.length * 16;
    const text = this.add.text(w - 16, yPos, msg, {
      fontSize: '9px', fontFamily: 'JetBrains Mono', color: '#f87171',
    }).setOrigin(1, 0).setDepth(25);
    this.killFeed.push({ text, timer: 3000 });
  }

  checkWin() {
    this.playerStates.forEach(ps => {
      if (ps.kills >= 10) this.endGame(ps.playerName);
    });

    if (this.gameTimer <= 0) {
      let best: PlayerState | null = null;
      this.playerStates.forEach(ps => {
        if (!best || ps.kills > best.kills) best = ps;
      });
      this.endGame(best?.playerName || 'Nobody');
    }

    const withLives = Array.from(this.playerStates.values()).filter(ps => ps.lives > 0 || ps.alive);
    if (withLives.length === 1) {
      this.endGame(withLives[0].playerName);
    }
  }

  endGame(winner: string) {
    if (this.finished) return;
    this.finished = true;
    playVictory();
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);

    this.add.rectangle(w / 2, h / 2, w, h, 0x080810, 0.5).setDepth(50);
    this.add.text(w / 2, h / 2, `🏆 ${winner} wins!`, {
      fontSize: '26px', fontFamily: 'Syne', color: '#6c63ff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(51);

    const scores: Record<string, number> = {};
    this.playerStates.forEach(ps => { scores[ps.playerName] = ps.kills; });
    this.time.delayedCall(3000, () => this.onGameOver(winner, scores));
  }
}
