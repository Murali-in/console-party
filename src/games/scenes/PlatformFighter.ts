import Phaser from 'phaser';
import type { RoomPlayer } from '@/contexts/RealtimeContext';

interface FighterConfig {
  players: RoomPlayer[];
  onGameOver: (winner: string, scores: Record<string, number>) => void;
  inputMap: Record<string, { x: number; y: number; buttonA: boolean; buttonB: boolean }>;
}

interface Fighter {
  sprite: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  hpBg: Phaser.GameObjects.Rectangle;
  hpFill: Phaser.GameObjects.Rectangle;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  score: number;
  color: number;
  name: string;
  alive: boolean;
  facingRight: boolean;
  grounded: boolean;
  attackCooldown: number;
  hitCooldown: number;
  jumpCount: number;
  respawnTimer: number;
}

export default class PlatformFighterScene extends Phaser.Scene {
  private fighters: Map<string, Fighter> = new Map();
  private platforms: { x: number; y: number; w: number; h: number }[] = [];
  private gfx!: Phaser.GameObjects.Graphics;
  private inputMap: FighterConfig['inputMap'];
  private onGameOver: FighterConfig['onGameOver'];
  private roomPlayers: RoomPlayer[];
  private gameEnded = false;
  private W = 0;
  private H = 0;
  private GRAVITY = 600;
  private JUMP_VEL = -320;
  private MOVE_SPEED = 200;
  private KILL_TARGET = 5;
  private hudText!: Phaser.GameObjects.Text;

  constructor(config: FighterConfig) {
    super({ key: 'PlatformFighter' });
    this.roomPlayers = config.players;
    this.onGameOver = config.onGameOver;
    this.inputMap = config.inputMap;
  }

  create() {
    this.W = Number(this.game.config.width);
    this.H = Number(this.game.config.height);
    this.gfx = this.add.graphics();

    // Create platforms
    const floorY = this.H - 30;
    this.platforms = [
      { x: 0, y: floorY, w: this.W, h: 30 },
      { x: this.W * 0.15, y: this.H * 0.65, w: this.W * 0.25, h: 12 },
      { x: this.W * 0.6, y: this.H * 0.65, w: this.W * 0.25, h: 12 },
      { x: this.W * 0.35, y: this.H * 0.4, w: this.W * 0.3, h: 12 },
      { x: this.W * 0.05, y: this.H * 0.3, w: this.W * 0.15, h: 12 },
      { x: this.W * 0.8, y: this.H * 0.3, w: this.W * 0.15, h: 12 },
    ];

    // Spawn fighters
    const spawns = [
      { x: this.W * 0.2, y: floorY - 30 },
      { x: this.W * 0.8, y: floorY - 30 },
      { x: this.W * 0.4, y: this.H * 0.35 },
      { x: this.W * 0.6, y: this.H * 0.35 },
    ];

    this.roomPlayers.forEach((p, i) => {
      const sp = spawns[i];
      const color = parseInt(p.color.replace('#', ''), 16);
      const SIZE = 20;

      const sprite = this.add.rectangle(sp.x, sp.y, SIZE, SIZE * 1.4, color);
      const label = this.add.text(sp.x, sp.y - 24, p.name, {
        fontFamily: 'JetBrains Mono', fontSize: '9px', color: '#ffffff',
      }).setOrigin(0.5);
      const hpBg = this.add.rectangle(sp.x, sp.y - 16, 30, 3, 0x333333);
      const hpFill = this.add.rectangle(sp.x, sp.y - 16, 30, 3, 0x66ff66);

      this.fighters.set(p.id, {
        sprite, label, hpBg, hpFill,
        x: sp.x, y: sp.y,
        vx: 0, vy: 0,
        hp: 100, maxHp: 100,
        score: 0, color, name: p.name,
        alive: true, facingRight: true, grounded: false,
        attackCooldown: 0, hitCooldown: 0, jumpCount: 0,
        respawnTimer: 0,
      });
    });

    this.hudText = this.add.text(this.W / 2, 8, '', {
      fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#ffffff',
    }).setOrigin(0.5, 0);
  }

  update(_time: number, delta: number) {
    if (this.gameEnded) return;
    const dt = delta / 1000;

    this.fighters.forEach((f, pid) => {
      if (f.respawnTimer > 0) {
        f.respawnTimer -= dt;
        if (f.respawnTimer <= 0) {
          f.alive = true;
          f.hp = f.maxHp;
          f.x = this.W * 0.5;
          f.y = this.H * 0.3;
          f.vx = 0;
          f.vy = 0;
          f.sprite.setAlpha(1);
        }
        return;
      }
      if (!f.alive) return;

      const inp = this.inputMap[pid] ?? { x: 0, y: 0, buttonA: false, buttonB: false };

      // CPU AI
      if (pid.startsWith('demo-cpu') || pid.startsWith('cpu-')) {
        const target = this.findNearestFighter(pid);
        if (target) {
          const dx = target.x - f.x;
          const dy = target.y - f.y;
          inp.x = dx > 10 ? 1 : dx < -10 ? -1 : 0;
          inp.buttonA = Math.abs(dx) < 50 && Math.abs(dy) < 40;
          inp.buttonB = dy < -30 && f.grounded;
        }
      }

      // Movement
      f.vx = inp.x * this.MOVE_SPEED;
      if (inp.x > 0.3) f.facingRight = true;
      if (inp.x < -0.3) f.facingRight = false;

      // Jump (buttonB or joystick up)
      if ((inp.buttonB || inp.y < -0.5) && f.jumpCount < 2) {
        f.vy = this.JUMP_VEL;
        f.jumpCount++;
        f.grounded = false;
      }

      // Gravity
      f.vy += this.GRAVITY * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;

      // Platform collision
      f.grounded = false;
      for (const plat of this.platforms) {
        if (f.vy >= 0 &&
          f.x > plat.x && f.x < plat.x + plat.w &&
          f.y >= plat.y - 14 && f.y <= plat.y + 4) {
          f.y = plat.y - 14;
          f.vy = 0;
          f.grounded = true;
          f.jumpCount = 0;
        }
      }

      // World bounds
      if (f.x < 10) f.x = 10;
      if (f.x > this.W - 10) f.x = this.W - 10;

      // Fall death
      if (f.y > this.H + 50) {
        this.killFighter(f, pid);
      }

      // Attack (buttonA)
      if (inp.buttonA && f.attackCooldown <= 0) {
        f.attackCooldown = 0.35;
        this.doAttack(f, pid);
      }
      f.attackCooldown -= dt;
      f.hitCooldown -= dt;

      // Update visuals
      f.sprite.setPosition(f.x, f.y);
      f.label.setPosition(f.x, f.y - 24);
      f.hpBg.setPosition(f.x, f.y - 16);
      const hpRatio = f.hp / f.maxHp;
      f.hpFill.setPosition(f.x - 15 * (1 - hpRatio), f.y - 16);
      f.hpFill.setSize(30 * hpRatio, 3);
    });

    // Check win
    const scores: Record<string, number> = {};
    let winner: string | null = null;
    this.fighters.forEach(f => {
      scores[f.name] = f.score;
      if (f.score >= this.KILL_TARGET) winner = f.name;
    });
    if (winner) {
      this.gameEnded = true;
      this.onGameOver(winner, scores);
    }

    this.drawPlatforms();
    this.updateHud();
  }

  private findNearestFighter(excludeId: string): Fighter | null {
    let nearest: Fighter | null = null;
    let minDist = Infinity;
    this.fighters.forEach((f, id) => {
      if (id === excludeId || !f.alive) return;
      const d = Math.abs(f.x) + Math.abs(f.y);
      if (d < minDist) { minDist = d; nearest = f; }
    });
    return nearest;
  }

  private doAttack(attacker: Fighter, attackerId: string) {
    const reach = 45;
    const dir = attacker.facingRight ? 1 : -1;
    const hitX = attacker.x + dir * 25;

    this.fighters.forEach((f, id) => {
      if (id === attackerId || !f.alive || f.hitCooldown > 0) return;
      const dx = Math.abs(f.x - hitX);
      const dy = Math.abs(f.y - attacker.y);
      if (dx < reach && dy < 30) {
        f.hp -= 25;
        f.hitCooldown = 0.3;
        f.vx = dir * 250;
        f.vy = -150;
        if (f.hp <= 0) {
          this.killFighter(f, id);
          attacker.score++;
        }
      }
    });

    // Visual slash
    this.gfx.lineStyle(2, attacker.color, 0.8);
    this.gfx.strokeCircle(hitX, attacker.y, reach * 0.6);
  }

  private killFighter(f: Fighter, _id: string) {
    f.alive = false;
    f.sprite.setAlpha(0.2);
    f.respawnTimer = 2;
  }

  private drawPlatforms() {
    this.gfx.clear();
    this.gfx.fillStyle(0xffffff, 0.15);
    for (const p of this.platforms) {
      this.gfx.fillRect(p.x, p.y, p.w, p.h);
    }
    // Border
    this.gfx.lineStyle(1, 0xffffff, 0.05);
    this.gfx.strokeRect(0, 0, this.W, this.H);
  }

  private updateHud() {
    const info = Array.from(this.fighters.values())
      .map(f => `${f.name}: ${f.score}/${this.KILL_TARGET}`)
      .join('  ');
    this.hudText.setText(info);
  }
}
