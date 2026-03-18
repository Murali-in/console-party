import Phaser from 'phaser';
import type { RoomPlayer } from '@/contexts/RealtimeContext';

interface SiegeConfig {
  players: RoomPlayer[];
  onGameOver: (winner: string, scores: Record<string, number>) => void;
  inputMap: Record<string, { x: number; y: number; buttonA: boolean; buttonB: boolean }>;
}

interface Block {
  rect: Phaser.GameObjects.Rectangle;
  vy: number;
  hp: number;
}

export default class SiegeBattleScene extends Phaser.Scene {
  private roomPlayers: RoomPlayer[];
  private onGameOver: SiegeConfig['onGameOver'];
  private inputMap: SiegeConfig['inputMap'];
  private leftTower: Block[] = [];
  private rightTower: Block[] = [];
  private currentTurn = 0; // index into roomPlayers (0 or 1)
  private aimAngle = 45;
  private power = 0;
  private charging = false;
  private projectile: Phaser.GameObjects.Arc | null = null;
  private projVx = 0;
  private projVy = 0;
  private aimLine!: Phaser.GameObjects.Graphics;
  private turnText!: Phaser.GameObjects.Text;
  private powerBar!: Phaser.GameObjects.Graphics;
  private finished = false;
  private waitingForShot = true;
  private groundY = 0;

  constructor(config: SiegeConfig) {
    super({ key: 'SiegeBattle' });
    this.roomPlayers = config.players.slice(0, 2); // 2 players only
    this.onGameOver = config.onGameOver;
    this.inputMap = config.inputMap;
  }

  create() {
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);
    this.groundY = h - 60;

    // Ground
    this.add.rectangle(w / 2, this.groundY + 30, w, 60, 0x16162a).setStrokeStyle(1, 0x6c63ff, 0.2);

    // Build towers
    this.leftTower = this.buildTower(120, 'left');
    this.rightTower = this.buildTower(w - 120, 'right');

    // Threshold lines
    const g = this.add.graphics();
    g.lineStyle(1, 0xf87171, 0.3);
    g.lineBetween(80, this.groundY - 20, 160, this.groundY - 20);
    g.lineBetween(w - 160, this.groundY - 20, w - 80, this.groundY - 20);

    this.aimLine = this.add.graphics();
    this.powerBar = this.add.graphics();

    this.turnText = this.add.text(w / 2, 20, '', {
      fontSize: '14px', fontFamily: 'Syne', color: '#6c63ff', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Player labels
    if (this.roomPlayers[0]) {
      this.add.text(120, 20, this.roomPlayers[0].name, {
        fontSize: '11px', fontFamily: 'JetBrains Mono', color: this.roomPlayers[0].color,
      }).setOrigin(0.5, 0);
    }
    if (this.roomPlayers[1]) {
      this.add.text(w - 120, 20, this.roomPlayers[1].name, {
        fontSize: '11px', fontFamily: 'JetBrains Mono', color: this.roomPlayers[1].color,
      }).setOrigin(0.5, 0);
    }

    this.updateTurnText();
  }

  buildTower(x: number, _side: string): Block[] {
    const blocks: Block[] = [];
    for (let i = 0; i < 8; i++) {
      const bx = x + (Math.random() - 0.5) * 4;
      const by = this.groundY - i * 32 - 16;
      const rect = this.add.rectangle(bx, by, 50, 28, 0x8B7355).setStrokeStyle(1, 0x6c63ff, 0.2);
      blocks.push({ rect, vy: 0, hp: 2 });
    }
    return blocks;
  }

  updateTurnText() {
    const player = this.roomPlayers[this.currentTurn];
    if (player) {
      this.turnText.setText(`${player.name}'s turn — Aim & Fire!`);
    }
  }

  update(_time: number, delta: number) {
    if (this.finished) return;

    const w = Number(this.game.config.width);
    const dt = delta / 1000;
    const activePlayer = this.roomPlayers[this.currentTurn];
    if (!activePlayer) return;

    const inp = this.inputMap[activePlayer.id] || { x: 0, y: 0, buttonA: false, buttonB: false };

    if (this.waitingForShot && !this.projectile) {
      // Aiming
      this.aimAngle = Phaser.Math.Clamp(this.aimAngle + inp.x * 60 * dt, 10, 80);

      // Charging
      if (inp.buttonA) {
        if (!this.charging) { this.charging = true; this.power = 0; }
        this.power = Math.min(this.power + dt * 0.6, 1);
      } else if (this.charging) {
        // Fire!
        this.charging = false;
        this.fireProjectile();
      }

      // Draw aim line
      this.aimLine.clear();
      const isLeft = this.currentTurn === 0;
      const ox = isLeft ? 150 : w - 150;
      const oy = this.groundY - 100;
      const dir = isLeft ? 1 : -1;
      const rad = Phaser.Math.DegToRad(-this.aimAngle);
      const len = 60 + this.power * 80;
      this.aimLine.lineStyle(2, 0x6c63ff, 0.6);
      this.aimLine.lineBetween(ox, oy, ox + Math.cos(rad) * len * dir, oy + Math.sin(rad) * len);

      // Power bar
      this.powerBar.clear();
      this.powerBar.fillStyle(0xfbbf24, 0.8);
      this.powerBar.fillRect(w / 2 - 60, 50, 120 * this.power, 8);
      this.powerBar.lineStyle(1, 0xffffff, 0.3);
      this.powerBar.strokeRect(w / 2 - 60, 50, 120, 8);
    }

    // Projectile physics
    if (this.projectile) {
      this.projVy += 400 * dt; // gravity
      this.projectile.x += this.projVx * dt;
      this.projectile.y += this.projVy * dt;

      // Hit ground
      if (this.projectile.y >= this.groundY) {
        this.projectile.destroy();
        this.projectile = null;
        this.nextTurn();
        return;
      }

      // Off screen
      if (this.projectile.x < 0 || this.projectile.x > w || this.projectile.y < -100) {
        this.projectile.destroy();
        this.projectile = null;
        this.nextTurn();
        return;
      }

      // Hit blocks
      const targetTower = this.currentTurn === 0 ? this.rightTower : this.leftTower;
      targetTower.forEach(block => {
        if (block.hp <= 0) return;
        const dist = Phaser.Math.Distance.Between(
          this.projectile!.x, this.projectile!.y, block.rect.x, block.rect.y
        );
        if (dist < 30) {
          block.hp--;
          if (block.hp <= 0) {
            block.rect.setAlpha(0.15);
          } else {
            block.rect.setFillStyle(0x654321);
          }
          this.projectile?.destroy();
          this.projectile = null;

          // Apply "physics" - blocks above fall
          this.applyBlockGravity(targetTower);
          this.nextTurn();
        }
      });
    }

    // Simple block gravity
    [this.leftTower, this.rightTower].forEach(tower => {
      tower.forEach(block => {
        if (block.hp <= 0) return;
        if (block.rect.y < this.groundY - 14) {
          // Check support
          const hasSupport = tower.some(other =>
            other !== block && other.hp > 0 &&
            Math.abs(other.rect.x - block.rect.x) < 35 &&
            other.rect.y > block.rect.y &&
            other.rect.y - block.rect.y < 40
          );
          if (!hasSupport && block.rect.y < this.groundY - 16) {
            block.vy += 300 * dt;
            block.rect.y = Math.min(block.rect.y + block.vy * dt, this.groundY - 14);
          } else {
            block.vy = 0;
          }
        }
      });
    });

    // Win check
    this.checkWin();
  }

  fireProjectile() {
    const w = Number(this.game.config.width);
    const isLeft = this.currentTurn === 0;
    const ox = isLeft ? 150 : w - 150;
    const oy = this.groundY - 100;
    const dir = isLeft ? 1 : -1;
    const rad = Phaser.Math.DegToRad(-this.aimAngle);
    const spd = 300 + this.power * 500;

    this.projectile = this.add.circle(ox, oy, 8, 0xf87171);
    this.projVx = Math.cos(rad) * spd * dir;
    this.projVy = Math.sin(rad) * spd;
    this.waitingForShot = false;
    this.aimLine.clear();
    this.powerBar.clear();
  }

  applyBlockGravity(tower: Block[]) {
    // Mark unsupported blocks
    tower.forEach(block => {
      if (block.hp <= 0) return;
      block.vy = 50;
    });
  }

  nextTurn() {
    this.currentTurn = (this.currentTurn + 1) % this.roomPlayers.length;
    this.waitingForShot = true;
    this.power = 0;
    this.charging = false;
    this.aimAngle = 45;
    this.updateTurnText();
  }

  checkWin() {
    const leftAlive = this.leftTower.filter(b => b.hp > 0).length;
    const rightAlive = this.rightTower.filter(b => b.hp > 0).length;

    if (leftAlive <= 2) {
      this.endGame(this.roomPlayers[1]?.name || 'Player 2');
    } else if (rightAlive <= 2) {
      this.endGame(this.roomPlayers[0]?.name || 'Player 1');
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
    this.roomPlayers.forEach(p => {
      const tower = p.id === this.roomPlayers[0]?.id ? this.leftTower : this.rightTower;
      scores[p.name] = tower.filter(b => b.hp > 0).length;
    });
    this.time.delayedCall(3000, () => this.onGameOver(winner, scores));
  }
}
