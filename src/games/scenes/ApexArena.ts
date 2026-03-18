import Phaser from 'phaser';
import type { RoomPlayer } from '@/contexts/RealtimeContext';

interface ApexConfig {
  players: RoomPlayer[];
  onGameOver: (winner: string, scores: Record<string, number>) => void;
  inputMap: Record<string, { x: number; y: number; buttonA: boolean; buttonB: boolean }>;
}

interface PlayerState {
  sprite: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  hp: number;
  maxHp: number;
  lives: number;
  kills: number;
  lastAngle: number;
  respawnTimer: number;
  alive: boolean;
  shootCooldown: number;
  playerId: string;
  playerName: string;
  color: number;
}

interface Bullet {
  sprite: Phaser.GameObjects.Arc;
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
  private gameTimer = 180000; // 3 min
  private finished = false;

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
    g.lineStyle(2, 0x6c63ff, 0.2);
    g.strokeRect(30, 30, w - 60, h - 60);

    // Obstacles (crates)
    const cratePositions = [
      { x: w * 0.25, y: h * 0.3 }, { x: w * 0.75, y: h * 0.3 },
      { x: w * 0.5, y: h * 0.5 }, { x: w * 0.25, y: h * 0.7 },
      { x: w * 0.75, y: h * 0.7 }, { x: w * 0.4, y: h * 0.2 },
      { x: w * 0.6, y: h * 0.8 },
    ];
    cratePositions.forEach(pos => {
      const crate = this.add.rectangle(pos.x, pos.y, 40, 40, 0x16162a);
      crate.setStrokeStyle(1, 0x6c63ff, 0.3);
      this.obstacles.push(crate);
    });

    // Spawn players
    this.roomPlayers.forEach((p, i) => {
      const angle = (i / this.roomPlayers.length) * Math.PI * 2;
      const px = w / 2 + Math.cos(angle) * 180;
      const py = h / 2 + Math.sin(angle) * 120;
      const color = Phaser.Display.Color.HexStringToColor(p.color).color;

      const sprite = this.add.circle(px, py, 14, color);
      const label = this.add.text(px, py - 24, p.name, {
        fontSize: '10px', fontFamily: 'JetBrains Mono', color: '#f0f0f5',
      }).setOrigin(0.5);

      this.playerStates.set(p.id, {
        sprite, label, hp: 3, maxHp: 3, lives: 3, kills: 0,
        lastAngle: 0, respawnTimer: 0, alive: true, shootCooldown: 0,
        playerId: p.id, playerName: p.name, color,
      });

      // HUD
      const ht = this.add.text(16, 16 + i * 18, '', {
        fontSize: '11px', fontFamily: 'JetBrains Mono', color: p.color,
      });
      this.hudTexts.set(p.id, ht);
    });

    // Timer display
    this.add.text(w - 16, 16, '', { fontSize: '12px', fontFamily: 'JetBrains Mono', color: '#6c63ff' })
      .setOrigin(1, 0).setName('timer');
  }

  update(_time: number, delta: number) {
    if (this.finished) return;

    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);
    const dt = delta / 1000;
    const speed = 180;

    this.gameTimer -= delta;

    // Update timer text
    const timerTxt = this.children.getByName('timer') as Phaser.GameObjects.Text;
    if (timerTxt) {
      const secs = Math.max(0, Math.ceil(this.gameTimer / 1000));
      timerTxt.setText(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`);
    }

    // Move & shoot players
    this.playerStates.forEach((ps) => {
      if (!ps.alive) {
        ps.respawnTimer -= delta;
        if (ps.respawnTimer <= 0 && ps.lives > 0) {
          ps.alive = true;
          ps.hp = ps.maxHp;
          ps.sprite.setAlpha(1);
          ps.sprite.setPosition(w / 2 + (Math.random() - 0.5) * 200, h / 2 + (Math.random() - 0.5) * 150);
        }
        return;
      }

      const inp = this.inputMap[ps.playerId] || { x: 0, y: 0, buttonA: false, buttonB: false };

      // Movement
      let nx = ps.sprite.x + inp.x * speed * dt;
      let ny = ps.sprite.y + inp.y * speed * dt;
      nx = Phaser.Math.Clamp(nx, 44, w - 44);
      ny = Phaser.Math.Clamp(ny, 44, h - 44);

      // Simple obstacle collision
      let blocked = false;
      this.obstacles.forEach(obs => {
        if (Math.abs(nx - obs.x) < 34 && Math.abs(ny - obs.y) < 34) blocked = true;
      });
      if (!blocked) {
        ps.sprite.setPosition(nx, ny);
      }

      ps.label.setPosition(ps.sprite.x, ps.sprite.y - 24);

      // Face direction
      if (Math.abs(inp.x) > 0.1 || Math.abs(inp.y) > 0.1) {
        ps.lastAngle = Math.atan2(inp.y, inp.x);
      }

      // Shoot
      ps.shootCooldown -= delta;
      if (inp.buttonA && ps.shootCooldown <= 0) {
        ps.shootCooldown = 300;
        const bSpeed = 400;
        const bullet: Bullet = {
          sprite: this.add.circle(ps.sprite.x, ps.sprite.y, 4, 0xf0f0f5),
          vx: Math.cos(ps.lastAngle) * bSpeed,
          vy: Math.sin(ps.lastAngle) * bSpeed,
          ownerId: ps.playerId,
          life: 1500,
        };
        this.bullets.push(bullet);
      }
    });

    // Update bullets
    this.bullets = this.bullets.filter(b => {
      b.life -= delta;
      if (b.life <= 0) { b.sprite.destroy(); return false; }

      b.sprite.x += b.vx * dt;
      b.sprite.y += b.vy * dt;

      // Out of bounds
      if (b.sprite.x < 30 || b.sprite.x > w - 30 || b.sprite.y < 30 || b.sprite.y > h - 30) {
        b.sprite.destroy(); return false;
      }

      // Obstacle hit
      for (const obs of this.obstacles) {
        if (Math.abs(b.sprite.x - obs.x) < 24 && Math.abs(b.sprite.y - obs.y) < 24) {
          b.sprite.destroy(); return false;
        }
      }

      // Player hit
      let hit = false;
      this.playerStates.forEach(ps => {
        if (ps.playerId === b.ownerId || !ps.alive) return;
        const dist = Phaser.Math.Distance.Between(b.sprite.x, b.sprite.y, ps.sprite.x, ps.sprite.y);
        if (dist < 18) {
          ps.hp--;
          if (ps.hp <= 0) {
            ps.lives--;
            ps.alive = false;
            ps.respawnTimer = 3000;
            ps.sprite.setAlpha(0.15);
            const killer = this.playerStates.get(b.ownerId);
            if (killer) killer.kills++;
          }
          hit = true;
        }
      });
      if (hit) { b.sprite.destroy(); return false; }

      return true;
    });

    // Update HUD
    this.playerStates.forEach(ps => {
      const ht = this.hudTexts.get(ps.playerId);
      if (ht) {
        const hpStr = '■'.repeat(ps.hp) + '□'.repeat(Math.max(0, ps.maxHp - ps.hp));
        ht.setText(`${ps.playerName} K:${ps.kills} L:${ps.lives} ${hpStr}`);
      }
    });

    // Win check
    this.checkWin();
  }

  checkWin() {
    // First to 10 kills
    this.playerStates.forEach(ps => {
      if (ps.kills >= 10) this.endGame(ps.playerName);
    });

    // Time up
    if (this.gameTimer <= 0) {
      let best: PlayerState | null = null;
      this.playerStates.forEach(ps => {
        if (!best || ps.kills > best.kills) best = ps;
      });
      this.endGame(best?.playerName || 'Nobody');
    }

    // Last alive (all others out of lives)
    const withLives = Array.from(this.playerStates.values()).filter(ps => ps.lives > 0 || ps.alive);
    if (withLives.length === 1) {
      this.endGame(withLives[0].playerName);
    }
  }

  endGame(winner: string) {
    if (this.finished) return;
    this.finished = true;
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);
    this.add.text(w / 2, h / 2, `${winner} wins!`, {
      fontSize: '28px', fontFamily: 'Syne', color: '#6c63ff', fontStyle: 'bold',
    }).setOrigin(0.5);

    const scores: Record<string, number> = {};
    this.playerStates.forEach(ps => { scores[ps.playerName] = ps.kills; });
    this.time.delayedCall(3000, () => this.onGameOver(winner, scores));
  }
}
