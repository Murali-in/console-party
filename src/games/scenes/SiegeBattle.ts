import Phaser from 'phaser';
import type { RoomPlayer } from '@/contexts/RealtimeContext';
import { playBlockHit, playExplosion, playVictory } from '@/games/SoundFX';

interface SiegeConfig {
  players: RoomPlayer[];
  onGameOver: (winner: string, scores: Record<string, number>) => void;
  inputMap: Record<string, { x: number; y: number; buttonA: boolean; buttonB: boolean }>;
}

interface Block {
  rect: Phaser.GameObjects.Rectangle;
  vy: number;
  hp: number;
  maxHp: number;
  falling: boolean;
}

export default class SiegeBattleScene extends Phaser.Scene {
  private roomPlayers: RoomPlayer[];
  private onGameOver: SiegeConfig['onGameOver'];
  private inputMap: SiegeConfig['inputMap'];
  private leftTower: Block[] = [];
  private rightTower: Block[] = [];
  private currentTurn = 0;
  private aimAngle = 45;
  private power = 0;
  private charging = false;
  private projectile: Phaser.GameObjects.Arc | null = null;
  private projVx = 0;
  private projVy = 0;
  private projTrail: { x: number; y: number; age: number }[] = [];
  private aimLine!: Phaser.GameObjects.Graphics;
  private trailGraphics!: Phaser.GameObjects.Graphics;
  private turnText!: Phaser.GameObjects.Text;
  private powerBar!: Phaser.GameObjects.Graphics;
  private finished = false;
  private waitingForShot = true;
  private groundY = 0;
  private turnCount = 0;
  private windForce = 0;
  private windText!: Phaser.GameObjects.Text;

  constructor(config: SiegeConfig) {
    super({ key: 'SiegeBattle' });
    this.roomPlayers = config.players.slice(0, 2);
    this.onGameOver = config.onGameOver;
    this.inputMap = config.inputMap;
  }

  create() {
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);
    this.groundY = h - 50;

    // Sky gradient
    const skyG = this.add.graphics();
    for (let y = 0; y < this.groundY; y++) {
      const t = y / this.groundY;
      const r = Math.floor(8 + t * 8);
      const g = Math.floor(8 + t * 6);
      const b = Math.floor(16 + t * 10);
      skyG.fillStyle(Phaser.Display.Color.GetColor(r, g, b), 1);
      skyG.fillRect(0, y, w, 1);
    }

    // Ground
    this.add.rectangle(w / 2, this.groundY + 25, w, 50, 0x1a1510).setStrokeStyle(1, 0x6c63ff, 0.15);
    const groundG = this.add.graphics();
    groundG.lineStyle(1, 0x6c63ff, 0.05);
    for (let x = 0; x < w; x += 30) groundG.lineBetween(x, this.groundY, x, h);

    // Build towers
    this.leftTower = this.buildTower(100);
    this.rightTower = this.buildTower(w - 100);

    this.aimLine = this.add.graphics().setDepth(10);
    this.powerBar = this.add.graphics().setDepth(10);
    this.trailGraphics = this.add.graphics().setDepth(3);

    this.turnText = this.add.text(w / 2, 20, '', {
      fontSize: '13px', fontFamily: 'Syne', color: '#6c63ff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(20);

    // Wind indicator
    this.windForce = (Math.random() - 0.5) * 80;
    this.windText = this.add.text(w / 2, 38, '', {
      fontSize: '9px', fontFamily: 'JetBrains Mono', color: '#34d399',
    }).setOrigin(0.5).setDepth(20);
    this.updateWindText();

    // Player labels
    if (this.roomPlayers[0]) {
      this.add.text(100, 16, this.roomPlayers[0].name, {
        fontSize: '10px', fontFamily: 'JetBrains Mono', color: this.roomPlayers[0].color,
      }).setOrigin(0.5, 0).setDepth(20);
    }
    if (this.roomPlayers[1]) {
      this.add.text(w - 100, 16, this.roomPlayers[1].name, {
        fontSize: '10px', fontFamily: 'JetBrains Mono', color: this.roomPlayers[1].color,
      }).setOrigin(0.5, 0).setDepth(20);
    }

    // Tower HP
    this.add.text(100, h - 16, '', { fontSize: '9px', fontFamily: 'JetBrains Mono', color: '#34d399' })
      .setOrigin(0.5, 1).setDepth(20).setName('leftHP');
    this.add.text(w - 100, h - 16, '', { fontSize: '9px', fontFamily: 'JetBrains Mono', color: '#34d399' })
      .setOrigin(0.5, 1).setDepth(20).setName('rightHP');

    this.updateTurnText();
  }

  buildTower(x: number): Block[] {
    const blocks: Block[] = [];
    const cols = 2;
    const rows = 5;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const bx = x + (col - 0.5) * 28;
        const by = this.groundY - row * 26 - 13;
        const hp = row < 2 ? 3 : 2;
        const brightness = 0x7B6B45 + row * 0x080808;
        const rect = this.add.rectangle(bx, by, 24, 22, brightness)
          .setStrokeStyle(1, 0x6c63ff, 0.15).setDepth(2);
        blocks.push({ rect, vy: 0, hp, maxHp: hp, falling: false });
      }
    }
    return blocks;
  }

  updateTurnText() {
    const player = this.roomPlayers[this.currentTurn];
    if (player) {
      this.turnText.setText(`${player.name}'s turn`);
      this.turnText.setColor(player.color);
    }
  }

  updateWindText() {
    const dir = this.windForce > 0 ? '→' : '←';
    const strength = Math.abs(this.windForce);
    this.windText.setText(`Wind: ${dir} ${strength.toFixed(0)}`);
  }

  update(_time: number, delta: number) {
    if (this.finished) return;

    const w = Number(this.game.config.width);
    const dt = delta / 1000;
    const activePlayer = this.roomPlayers[this.currentTurn];
    if (!activePlayer) return;

    const inp = this.inputMap[activePlayer.id] || { x: 0, y: 0, buttonA: false, buttonB: false };

    // Tower HP displays
    const leftHP = this.children.getByName('leftHP') as Phaser.GameObjects.Text;
    const rightHP = this.children.getByName('rightHP') as Phaser.GameObjects.Text;
    const leftAlive = this.leftTower.filter(b => b.hp > 0).length;
    const rightAlive = this.rightTower.filter(b => b.hp > 0).length;
    if (leftHP) leftHP.setText(`Tower: ${leftAlive}/${this.leftTower.length}`);
    if (rightHP) rightHP.setText(`Tower: ${rightAlive}/${this.rightTower.length}`);

    if (this.waitingForShot && !this.projectile) {
      // Aiming
      this.aimAngle = Phaser.Math.Clamp(this.aimAngle + inp.x * 50 * dt, 5, 85);

      // Charging
      if (inp.buttonA) {
        if (!this.charging) { this.charging = true; this.power = 0; }
        this.power = Math.min(this.power + dt * 0.5, 1);
      } else if (this.charging) {
        this.charging = false;
        this.fireProjectile();
      }

      // Aim line + trajectory preview
      this.aimLine.clear();
      const isLeft = this.currentTurn === 0;
      const ox = isLeft ? 130 : w - 130;
      const oy = this.groundY - 80;
      const dir = isLeft ? 1 : -1;
      const rad = Phaser.Math.DegToRad(-this.aimAngle);
      const spd = 300 + this.power * 500;

      // Trajectory dots (accounting for wind)
      this.aimLine.fillStyle(0x6c63ff, 0.2);
      for (let t = 0; t < 20; t++) {
        const tt = t * 0.035;
        const px = ox + (Math.cos(rad) * spd * dir + this.windForce) * tt;
        const py = oy + Math.sin(rad) * spd * tt + 0.5 * 400 * tt * tt;
        if (py > this.groundY) break;
        this.aimLine.fillCircle(px, py, 2);
      }

      // Aim direction line
      const len = 50 + this.power * 60;
      this.aimLine.lineStyle(2, 0x6c63ff, 0.7);
      this.aimLine.lineBetween(ox, oy, ox + Math.cos(rad) * len * dir, oy + Math.sin(rad) * len);

      // Power bar
      this.powerBar.clear();
      const barW = 100;
      this.powerBar.fillStyle(0x333333, 0.5);
      this.powerBar.fillRect(w / 2 - barW / 2, 52, barW, 8);
      const powerColor = this.power > 0.8 ? 0xf87171 : this.power > 0.5 ? 0xfbbf24 : 0x34d399;
      this.powerBar.fillStyle(powerColor, 0.9);
      this.powerBar.fillRect(w / 2 - barW / 2, 52, barW * this.power, 8);
      this.powerBar.lineStyle(1, 0xffffff, 0.15);
      this.powerBar.strokeRect(w / 2 - barW / 2, 52, barW, 8);
    }

    // Projectile physics
    if (this.projectile) {
      this.projVx += this.windForce * dt; // Wind affects projectile
      this.projVy += 400 * dt;
      this.projectile.x += this.projVx * dt;
      this.projectile.y += this.projVy * dt;

      // Trail
      this.projTrail.push({ x: this.projectile.x, y: this.projectile.y, age: 0 });
      this.trailGraphics.clear();
      this.projTrail = this.projTrail.filter(pt => {
        pt.age += delta;
        if (pt.age > 600) return false;
        const alpha = 1 - pt.age / 600;
        this.trailGraphics.fillStyle(0xf87171, alpha * 0.4);
        this.trailGraphics.fillCircle(pt.x, pt.y, 3);
        return true;
      });

      // Hit ground
      if (this.projectile.y >= this.groundY) {
        this.impactEffect(this.projectile.x, this.groundY);
        this.projectile.destroy();
        this.projectile = null;
        this.nextTurn();
        return;
      }

      // Off screen
      if (this.projectile.x < -50 || this.projectile.x > w + 50 || this.projectile.y < -200) {
        this.projectile.destroy();
        this.projectile = null;
        this.nextTurn();
        return;
      }

      // Hit blocks (splash damage to nearby blocks)
      const targetTower = this.currentTurn === 0 ? this.rightTower : this.leftTower;
      for (const block of targetTower) {
        if (block.hp <= 0) continue;
        const dist = Phaser.Math.Distance.Between(this.projectile!.x, this.projectile!.y, block.rect.x, block.rect.y);
        if (dist < 22) {
          block.hp--;
          playBlockHit();
          this.cameras.main.shake(100, 0.005);

          // Splash damage to adjacent blocks
          targetTower.forEach(adj => {
            if (adj === block || adj.hp <= 0) return;
            const adjDist = Phaser.Math.Distance.Between(block.rect.x, block.rect.y, adj.rect.x, adj.rect.y);
            if (adjDist < 35) {
              adj.hp = Math.max(0, adj.hp - 1);
              if (adj.hp <= 0) {
                adj.rect.setAlpha(0.1);
                playExplosion();
              } else {
                this.updateBlockVisual(adj);
              }
            }
          });

          if (block.hp <= 0) {
            block.rect.setAlpha(0.1);
            playExplosion();
            this.impactEffect(block.rect.x, block.rect.y);
          } else {
            this.updateBlockVisual(block);
          }

          this.projectile?.destroy();
          this.projectile = null;
          this.applyBlockGravity(targetTower);

          if (!this.checkWin()) this.nextTurn();
          return;
        }
      }
    }

    // Block gravity for both towers
    [this.leftTower, this.rightTower].forEach(tower => {
      tower.forEach(block => {
        if (block.hp <= 0) return;
        if (block.rect.y < this.groundY - 11) {
          const hasSupport = tower.some(other =>
            other !== block && other.hp > 0 &&
            Math.abs(other.rect.x - block.rect.x) < 30 &&
            other.rect.y > block.rect.y &&
            other.rect.y - block.rect.y < 30
          ) || block.rect.y >= this.groundY - 13;

          if (!hasSupport) {
            block.vy += 400 * dt;
            block.rect.y = Math.min(block.rect.y + block.vy * dt, this.groundY - 11);
            block.falling = true;
          } else {
            if (block.falling && block.vy > 50) {
              playBlockHit();
            }
            block.vy = 0;
            block.falling = false;
          }
        }
      });
    });
  }

  updateBlockVisual(block: Block) {
    const dmgRatio = block.hp / block.maxHp;
    const r = Math.floor(123 + (1 - dmgRatio) * 80);
    const g = Math.floor(107 - (1 - dmgRatio) * 50);
    const b = Math.floor(69 - (1 - dmgRatio) * 30);
    block.rect.setFillStyle(Phaser.Display.Color.GetColor(r, g, b));
    // Add cracks
    if (dmgRatio <= 0.5) {
      block.rect.setStrokeStyle(1, 0xf87171, 0.3);
    }
  }

  impactEffect(x: number, y: number) {
    // Expanding ring
    const ring = this.add.circle(x, y, 5, 0xf87171, 0.3).setDepth(8);
    this.tweens.add({
      targets: ring,
      radius: 40,
      alpha: 0,
      duration: 350,
      onComplete: () => ring.destroy(),
    });

    // Debris particles
    const particles = this.add.graphics().setDepth(8);
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const dist = 8 + Math.random() * 22;
      particles.fillStyle(0xf87171, 0.4);
      particles.fillCircle(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, 2 + Math.random() * 2);
    }
    this.time.delayedCall(400, () => particles.destroy());
  }

  fireProjectile() {
    const w = Number(this.game.config.width);
    const isLeft = this.currentTurn === 0;
    const ox = isLeft ? 130 : w - 130;
    const oy = this.groundY - 80;
    const dir = isLeft ? 1 : -1;
    const rad = Phaser.Math.DegToRad(-this.aimAngle);
    const spd = 300 + this.power * 500;

    this.projectile = this.add.circle(ox, oy, 7, 0xf87171).setDepth(6);
    this.projVx = Math.cos(rad) * spd * dir;
    this.projVy = Math.sin(rad) * spd;
    this.projTrail = [];
    this.waitingForShot = false;
    this.aimLine.clear();
    this.powerBar.clear();
  }

  applyBlockGravity(tower: Block[]) {
    tower.forEach(block => {
      if (block.hp <= 0) return;
      block.vy = 20;
      block.falling = true;
    });
  }

  nextTurn() {
    this.turnCount++;
    this.currentTurn = (this.currentTurn + 1) % this.roomPlayers.length;
    this.waitingForShot = true;
    this.power = 0;
    this.charging = false;
    this.aimAngle = 45;
    this.trailGraphics.clear();
    this.projTrail = [];
    // New wind each turn
    this.windForce = (Math.random() - 0.5) * 100;
    this.updateWindText();
    this.updateTurnText();
  }

  checkWin(): boolean {
    const leftAlive = this.leftTower.filter(b => b.hp > 0).length;
    const rightAlive = this.rightTower.filter(b => b.hp > 0).length;

    if (leftAlive <= 2 || rightAlive <= 2) {
      const winner = leftAlive <= 2
        ? (this.roomPlayers[1]?.name || 'Player 2')
        : (this.roomPlayers[0]?.name || 'Player 1');
      this.endGame(winner);
      return true;
    }
    return false;
  }

  endGame(winner: string) {
    if (this.finished) return;
    this.finished = true;
    playVictory();
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);

    this.add.rectangle(w / 2, h / 2, w, h, 0x080810, 0.5).setDepth(50);
    this.add.text(w / 2, h / 2 - 16, `${winner} wins!`, {
      fontSize: '24px', fontFamily: 'Syne', color: '#6c63ff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(51);
    this.add.text(w / 2, h / 2 + 16, `${this.turnCount} turns`, {
      fontSize: '11px', fontFamily: 'JetBrains Mono', color: 'rgba(240,240,245,0.5)',
    }).setOrigin(0.5).setDepth(51);

    const scores: Record<string, number> = {};
    this.roomPlayers.forEach(p => {
      const tower = p.id === this.roomPlayers[0]?.id ? this.leftTower : this.rightTower;
      scores[p.name] = tower.filter(b => b.hp > 0).length;
    });
    this.time.delayedCall(3000, () => this.onGameOver(winner, scores));
  }
}
