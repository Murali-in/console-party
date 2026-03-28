import Phaser from 'phaser';
import type { RoomPlayer } from '@/contexts/RealtimeContext';

interface TankConfig {
  players: RoomPlayer[];
  onGameOver: (winner: string, scores: Record<string, number>) => void;
  inputMap: Record<string, { x: number; y: number; buttonA: boolean; buttonB: boolean; buttonX: boolean; buttonY: boolean; holdTime: number }>;
}

interface TankData {
  sprite: Phaser.GameObjects.Rectangle;
  turret: Phaser.GameObjects.Rectangle;
  angle: number;
  turretAngle: number;
  speed: number;
  hp: number;
  maxHp: number;
  lastShot: number;
  name: string;
  color: number;
}

export default class TankBattleScene extends Phaser.Scene {
  private roomPlayers: RoomPlayer[];
  private onGameOver: TankConfig['onGameOver'];
  private inputMap: TankConfig['inputMap'];
  private tanks: Map<string, TankData> = new Map();
  private nameLabels: Map<string, Phaser.GameObjects.Text> = new Map();
  private bullets: Phaser.GameObjects.Arc[] = [];
  private bulletData: { owner: string; vx: number; vy: number; life: number }[] = [];
  private obstacles: Phaser.GameObjects.Rectangle[] = [];
  private gfx!: Phaser.GameObjects.Graphics;
  private scores: Record<string, number> = {};
  private TANK_SPEED = 120;
  private TURN_SPEED = 150;
  private BULLET_SPEED = 350;
  private SHOOT_COOLDOWN = 600;
  private hudText!: Phaser.GameObjects.Text;

  constructor(config: TankConfig) {
    super({ key: 'TankBattle' });
    this.roomPlayers = config.players.slice(0, 4);
    this.onGameOver = config.onGameOver;
    this.inputMap = config.inputMap;
  }

  create() {
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);

    this.gfx = this.add.graphics();

    // Arena border
    this.gfx.lineStyle(1, 0x6b5fff, 0.15);
    this.gfx.strokeRect(20, 20, w - 40, h - 40);

    // Obstacles
    const obsPositions = [
      [w * 0.25, h * 0.25, 60, 60],
      [w * 0.75, h * 0.25, 60, 60],
      [w * 0.5, h * 0.5, 80, 40],
      [w * 0.25, h * 0.75, 60, 60],
      [w * 0.75, h * 0.75, 60, 60],
    ];
    obsPositions.forEach(([x, y, ow, oh]) => {
      const obs = this.add.rectangle(x, y, ow, oh, 0x151528);
      obs.setStrokeStyle(1, 0x6b5fff, 0.2);
      this.obstacles.push(obs);
    });

    // Spawn tanks
    const spawns = [
      [80, 80], [w - 80, h - 80], [w - 80, 80], [80, h - 80]
    ];
    this.roomPlayers.forEach((p, i) => {
      const [sx, sy] = spawns[i];
      const color = parseInt(p.color.replace('#', ''), 16);
      const body = this.add.rectangle(sx, sy, 32, 24, color);
      const turret = this.add.rectangle(sx, sy, 6, 20, 0xededf5);
      turret.setOrigin(0.5, 1);

      this.tanks.set(p.id, {
        sprite: body,
        turret,
        angle: i < 2 ? (i === 0 ? 135 : -45) : (i === 2 ? -135 : 45),
        turretAngle: 0,
        speed: 0,
        hp: 5,
        maxHp: 5,
        lastShot: 0,
        name: p.name,
        color,
      });
      this.scores[p.name] = 0;

      const label = this.add.text(sx, sy - 22, p.name.slice(0, 6), {
        fontFamily: 'JetBrains Mono', fontSize: '9px', color: p.color,
        backgroundColor: `${p.color}22`, padding: { x: 3, y: 1 },
      }).setOrigin(0.5, 1).setDepth(10);
      this.nameLabels.set(p.id, label);
    });

    this.hudText = this.add.text(w / 2, 8, '', {
      fontFamily: 'JetBrains Mono', fontSize: '10px', color: '#ededf5',
    }).setOrigin(0.5, 0);
  }

  update(_time: number, delta: number) {
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);
    const dt = delta / 1000;
    const now = Date.now();

    // Update tanks
    this.tanks.forEach((tank, pid) => {
      if (tank.hp <= 0) return;
      const inp = this.inputMap[pid] ?? { x: 0, y: 0, buttonA: false, buttonB: false };

      // Turn tank
      tank.angle += inp.x * this.TURN_SPEED * dt;

      // Move forward/backward
      if (Math.abs(inp.y) > 0.15) {
        tank.speed = -inp.y * this.TANK_SPEED; // Up = forward
      } else {
        tank.speed *= 0.9;
      }

      const rad = Phaser.Math.DegToRad(tank.angle);
      let nx = tank.sprite.x + Math.cos(rad) * tank.speed * dt;
      let ny = tank.sprite.y + Math.sin(rad) * tank.speed * dt;
      nx = Phaser.Math.Clamp(nx, 36, w - 36);
      ny = Phaser.Math.Clamp(ny, 36, h - 36);

      // Simple obstacle collision
      let blocked = false;
      for (const obs of this.obstacles) {
        if (Math.abs(nx - obs.x) < (obs.width / 2 + 16) && Math.abs(ny - obs.y) < (obs.height / 2 + 12)) {
          blocked = true;
          break;
        }
      }
      if (!blocked) {
        tank.sprite.x = nx;
        tank.sprite.y = ny;
      }

      tank.sprite.setAngle(tank.angle);

      // Turret follows movement or Button B rotates
      if (inp.buttonB) {
        tank.turretAngle += 180 * dt;
      } else {
        tank.turretAngle = tank.angle;
      }
      tank.turret.x = tank.sprite.x;
      tank.turret.y = tank.sprite.y;
      tank.turret.setAngle(tank.turretAngle);

      // Shoot
      if (inp.buttonA && now - tank.lastShot > this.SHOOT_COOLDOWN) {
        tank.lastShot = now;
        const bRad = Phaser.Math.DegToRad(tank.turretAngle);
        const bx = tank.sprite.x + Math.cos(bRad) * 20;
        const by = tank.sprite.y + Math.sin(bRad) * 20;
        const bullet = this.add.circle(bx, by, 4, 0xfbbf24);
        this.bullets.push(bullet);
        this.bulletData.push({
          owner: pid,
          vx: Math.cos(bRad) * this.BULLET_SPEED,
          vy: Math.sin(bRad) * this.BULLET_SPEED,
          life: 1500,
        });
      }
    });

    // Update bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      const bd = this.bulletData[i];
      b.x += bd.vx * dt;
      b.y += bd.vy * dt;
      bd.life -= delta;

      let hit = false;

      // Wall bounce
      if (b.x < 24 || b.x > w - 24) { bd.vx *= -1; b.x = Phaser.Math.Clamp(b.x, 24, w - 24); }
      if (b.y < 24 || b.y > h - 24) { bd.vy *= -1; b.y = Phaser.Math.Clamp(b.y, 24, h - 24); }

      // Obstacle collision → destroy bullet
      for (const obs of this.obstacles) {
        if (Math.abs(b.x - obs.x) < obs.width / 2 + 4 && Math.abs(b.y - obs.y) < obs.height / 2 + 4) {
          hit = true;
          break;
        }
      }

      // Tank collision
      if (!hit) {
        this.tanks.forEach((tank, tid) => {
          if (tid === bd.owner || tank.hp <= 0) return;
          const dist = Phaser.Math.Distance.Between(b.x, b.y, tank.sprite.x, tank.sprite.y);
          if (dist < 20) {
            hit = true;
            tank.hp--;
            if (tank.hp <= 0) {
              tank.sprite.setAlpha(0.2);
              tank.turret.setAlpha(0.2);
              const ownerTank = this.tanks.get(bd.owner);
              if (ownerTank) {
                this.scores[ownerTank.name]++;
              }
              // Check win
              const alive = Array.from(this.tanks.values()).filter(t => t.hp > 0);
              if (alive.length <= 1) {
                const winner = alive[0]?.name || 'Draw';
                this.onGameOver(winner, this.scores);
              }
            }
          }
        });
      }

      if (hit || bd.life <= 0) {
        b.destroy();
        this.bullets.splice(i, 1);
        this.bulletData.splice(i, 1);
      }
    }

    // Draw HP bars
    this.gfx.clear();
    this.gfx.lineStyle(1, 0x6b5fff, 0.15);
    this.gfx.strokeRect(20, 20, w - 40, h - 40);

    this.tanks.forEach((tank, pid) => {
      if (tank.hp <= 0) return;
      const bx = tank.sprite.x - 16;
      const by = tank.sprite.y - 22;
      this.gfx.fillStyle(0x151528, 1);
      this.gfx.fillRect(bx, by, 32, 4);
      const pct = tank.hp / tank.maxHp;
      const col = pct > 0.5 ? 0x34d399 : pct > 0.25 ? 0xfbbf24 : 0xf87171;
      this.gfx.fillStyle(col, 1);
      this.gfx.fillRect(bx, by, 32 * pct, 4);
      // Update name label position
      const label = this.nameLabels.get(pid);
      if (label) { label.x = tank.sprite.x; label.y = tank.sprite.y - 28; }
    });

    // HUD
    const info = Object.entries(this.scores).map(([n, s]) => `${n}: ${s}`).join('  ');
    this.hudText.setText(info);
  }
}
