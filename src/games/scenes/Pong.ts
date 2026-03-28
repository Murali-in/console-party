import Phaser from 'phaser';
import type { RoomPlayer } from '@/contexts/RealtimeContext';
import { playHit, playVictory } from '@/games/SoundFX';

interface PongConfig {
  players: RoomPlayer[];
  onGameOver: (winner: string, scores: Record<string, number>) => void;
  inputMap: Record<string, { x: number; y: number; buttonA: boolean; buttonB: boolean; buttonX: boolean; buttonY: boolean; holdTime: number }>;
}

interface PowerUp {
  active: boolean;
  type: 'speed' | 'grow' | 'shrink' | 'fire';
  color: number;
  timer: number;
  duration: number;
}

const POWER_UP_THRESHOLDS = [3, 5, 6]; // score thresholds that trigger power-ups
const POWER_UP_TYPES: { type: PowerUp['type']; color: number; label: string }[] = [
  { type: 'speed', color: 0xfbbf24, label: 'TURBO' },
  { type: 'grow', color: 0x34d399, label: 'GROW' },
  { type: 'shrink', color: 0xf87171, label: 'SHRINK' },
  { type: 'fire', color: 0xf97316, label: 'FIRE' },
];

export default class PongScene extends Phaser.Scene {
  private roomPlayers: RoomPlayer[];
  private onGameOver: PongConfig['onGameOver'];
  private inputMap: PongConfig['inputMap'];
  private paddles: Map<string, { x: number; y: number; color: number; height: number }> = new Map();
  private ball = { x: 0, y: 0, vx: 0, vy: 0, trail: [] as { x: number; y: number; alpha: number; color: number }[] };
  private scores: Record<string, number> = {};
  private PADDLE_SPEED = 400;
  private BALL_SPEED = 320;
  private MAX_SCORE = 7;
  private serveCooldown = 0;
  private gfx!: Phaser.GameObjects.Graphics;
  private scoreTexts: Phaser.GameObjects.Text[] = [];
  private particles: { x: number; y: number; vx: number; vy: number; life: number; size: number; color: number }[] = [];
  private p1Name = '';
  private p2Name = '';
  private ballColor = 0xffffff;
  private ballGlowColor = 0x8b5cf6;
  private powerUp: PowerUp = { active: false, type: 'speed', color: 0xffffff, timer: 0, duration: 5000 };
  private powerUpLabel: Phaser.GameObjects.Text | null = null;
  private totalScore = 0;
  private triggeredThresholds: Set<number> = new Set();

  constructor(config: PongConfig) {
    super({ key: 'Pong' });
    this.roomPlayers = config.players.slice(0, 2);
    this.onGameOver = config.onGameOver;
    this.inputMap = config.inputMap;
  }

  create() {
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);
    this.gfx = this.add.graphics();

    const p1 = this.roomPlayers[0];
    const p2 = this.roomPlayers[1] || { id: 'cpu', name: 'CPU', color: '#f87171', index: 1 };
    this.p1Name = p1.name;
    this.p2Name = p2.name;

    const c1 = Phaser.Display.Color.HexStringToColor(p1.color).color;
    const c2 = Phaser.Display.Color.HexStringToColor(p2.color).color;

    this.paddles.set(p1.id, { x: 40, y: h / 2, color: c1, height: 80 });
    this.paddles.set(p2.id, { x: w - 40, y: h / 2, color: c2, height: 80 });
    this.scores[p1.name] = 0;
    this.scores[p2.name] = 0;

    const st1 = this.add.text(w / 2 - 60, 30, '0', {
      fontFamily: 'Syne', fontSize: '48px', color: p1.color, fontStyle: 'bold',
    }).setOrigin(0.5, 0).setAlpha(0.4).setDepth(1);
    const st2 = this.add.text(w / 2 + 60, 30, '0', {
      fontFamily: 'Syne', fontSize: '48px', color: p2.color, fontStyle: 'bold',
    }).setOrigin(0.5, 0).setAlpha(0.4).setDepth(1);
    this.scoreTexts = [st1, st2];

    this.add.text(40, h - 20, p1.name, {
      fontFamily: 'JetBrains Mono', fontSize: '9px', color: p1.color,
    }).setOrigin(0.5).setAlpha(0.5).setDepth(1);
    this.add.text(w - 40, h - 20, p2.name, {
      fontFamily: 'JetBrains Mono', fontSize: '9px', color: p2.color,
    }).setOrigin(0.5).setAlpha(0.5).setDepth(1);

    this.add.text(w / 2, 8, 'PONG · First to 7', {
      fontSize: '9px', fontFamily: 'JetBrains Mono', color: 'rgba(255,255,255,0.15)',
    }).setOrigin(0.5, 0).setDepth(1);

    this.powerUpLabel = this.add.text(w / 2, h / 2 + 70, '', {
      fontSize: '12px', fontFamily: 'JetBrains Mono', color: '#fbbf24',
    }).setOrigin(0.5).setAlpha(0).setDepth(2);

    this.ball.x = w / 2;
    this.ball.y = h / 2;
    this.serveBall();
  }

  private serveBall() {
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);
    this.ball.x = w / 2;
    this.ball.y = h / 2;
    this.ball.trail = [];
    const angle = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.5 + 0.2);
    const speed = this.powerUp.active && this.powerUp.type === 'speed' ? this.BALL_SPEED * 1.5 : this.BALL_SPEED;
    this.ball.vx = Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1);
    this.ball.vy = Math.sin(angle) * speed;
    this.serveCooldown = 600;
  }

  private activatePowerUp() {
    const pu = POWER_UP_TYPES[Math.floor(Math.random() * POWER_UP_TYPES.length)];
    this.powerUp = { active: true, type: pu.type, color: pu.color, timer: 5000, duration: 5000 };
    this.ballColor = pu.color;
    this.ballGlowColor = pu.color;

    if (this.powerUpLabel) {
      this.powerUpLabel.setText(`⚡ ${pu.label} ⚡`).setColor(`#${pu.color.toString(16).padStart(6, '0')}`).setAlpha(1);
      this.tweens.add({ targets: this.powerUpLabel, alpha: 0, duration: 2000, delay: 1000 });
    }

    // Apply instant effects
    if (pu.type === 'grow') {
      this.paddles.forEach(p => { p.height = 110; });
    } else if (pu.type === 'shrink') {
      this.paddles.forEach(p => { p.height = 50; });
    } else if (pu.type === 'speed') {
      const spd = Math.sqrt(this.ball.vx ** 2 + this.ball.vy ** 2);
      if (spd > 0) {
        this.ball.vx = (this.ball.vx / spd) * this.BALL_SPEED * 1.5;
        this.ball.vy = (this.ball.vy / spd) * this.BALL_SPEED * 1.5;
      }
    }

    this.cameras.main.flash(200, (pu.color >> 16) & 0xff, (pu.color >> 8) & 0xff, pu.color & 0xff, true);
  }

  private deactivatePowerUp() {
    this.powerUp.active = false;
    this.ballColor = 0xffffff;
    this.ballGlowColor = 0x8b5cf6;
    this.paddles.forEach(p => { p.height = 80; });
  }

  private scorePoint(scorerIndex: number) {
    const names = Object.keys(this.scores);
    const name = names[scorerIndex];
    if (!name) return;
    this.scores[name]++;
    this.totalScore = Object.values(this.scores).reduce((a, b) => a + b, 0);
    this.scoreTexts[scorerIndex]?.setText(String(this.scores[name]));
    playHit();
    this.cameras.main.flash(150, 107, 95, 255, true);

    // Check power-up thresholds
    for (const threshold of POWER_UP_THRESHOLDS) {
      if (this.totalScore >= threshold && !this.triggeredThresholds.has(threshold)) {
        this.triggeredThresholds.add(threshold);
        this.activatePowerUp();
        break;
      }
    }

    if (this.scores[name] >= this.MAX_SCORE) {
      playVictory();
      this.onGameOver(name, this.scores);
      return;
    }
    this.serveBall();
  }

  update(_time: number, delta: number) {
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);
    const dt = delta / 1000;

    this.gfx.clear();

    // Power-up timer
    if (this.powerUp.active) {
      this.powerUp.timer -= delta;
      if (this.powerUp.timer <= 0) this.deactivatePowerUp();
    }

    // Draw court
    this.gfx.lineStyle(1, 0xffffff, 0.05);
    this.gfx.strokeRect(20, 20, w - 40, h - 40);
    for (let y = 24; y < h - 24; y += 18) {
      this.gfx.fillStyle(0xffffff, 0.06);
      this.gfx.fillRect(w / 2 - 1, y, 2, 10);
    }
    this.gfx.lineStyle(1, 0xffffff, 0.04);
    this.gfx.strokeCircle(w / 2, h / 2, 50);

    if (this.serveCooldown > 0) {
      this.serveCooldown -= delta;
      const alpha = 1 - (this.serveCooldown / 600);
      this.gfx.fillStyle(this.ballColor, alpha * 0.5);
      this.gfx.fillCircle(this.ball.x, this.ball.y, 8);
      this.drawPaddles();
      return;
    }

    // Move paddles
    const playerIds = Array.from(this.paddles.keys());
    playerIds.forEach((pid) => {
      const paddle = this.paddles.get(pid)!;
      const inp = this.inputMap[pid] ?? { x: 0, y: 0, buttonA: false, buttonB: false };

      if (pid === 'cpu') {
        const diff = this.ball.y - paddle.y;
        const cpuSpeed = this.PADDLE_SPEED * 0.75;
        if (Math.abs(diff) > 12) paddle.y += Math.sign(diff) * cpuSpeed * dt;
      } else {
        paddle.y += inp.y * this.PADDLE_SPEED * dt;
        if (inp.buttonA) {
          const diff = this.ball.y - paddle.y;
          paddle.y += Math.sign(diff) * this.PADDLE_SPEED * 2.5 * dt;
        }
      }
      paddle.y = Phaser.Math.Clamp(paddle.y, 60, h - 60);
    });

    // Ball trail with color
    this.ball.trail.push({ x: this.ball.x, y: this.ball.y, alpha: 0.5, color: this.ballColor });
    if (this.ball.trail.length > 16) this.ball.trail.shift();

    // Move ball
    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;

    // Top/bottom bounce
    if (this.ball.y <= 28 || this.ball.y >= h - 28) {
      this.ball.vy *= -1;
      this.ball.y = Phaser.Math.Clamp(this.ball.y, 28, h - 28);
      for (let i = 0; i < 4; i++) {
        this.particles.push({
          x: this.ball.x, y: this.ball.y,
          vx: (Math.random() - 0.5) * 80, vy: -this.ball.vy * 0.3 * Math.random(),
          life: 300, size: 2, color: this.ballColor,
        });
      }
    }

    // Paddle collisions
    this.paddles.forEach((paddle) => {
      const pw = 12, ph = paddle.height;
      if (
        this.ball.x - 8 < paddle.x + pw / 2 && this.ball.x + 8 > paddle.x - pw / 2 &&
        this.ball.y > paddle.y - ph / 2 && this.ball.y < paddle.y + ph / 2
      ) {
        playHit();
        this.ball.vx *= -1.06;
        const hitPos = (this.ball.y - paddle.y) / (ph / 2);
        this.ball.vy = hitPos * this.BALL_SPEED * 0.9;
        if (this.ball.x < w / 2) this.ball.x = paddle.x + pw / 2 + 9;
        else this.ball.x = paddle.x - pw / 2 - 9;
        this.cameras.main.shake(50, 0.002);

        // Fire power-up: extra particles on hit
        const particleCount = this.powerUp.active && this.powerUp.type === 'fire' ? 14 : 6;
        for (let i = 0; i < particleCount; i++) {
          this.particles.push({
            x: this.ball.x, y: this.ball.y,
            vx: -this.ball.vx * 0.2 + (Math.random() - 0.5) * 80,
            vy: (Math.random() - 0.5) * 120,
            life: 350, size: this.powerUp.active ? 4 : 3, color: this.ballColor,
          });
        }
      }
    });

    // Score
    if (this.ball.x < 10) this.scorePoint(1);
    else if (this.ball.x > w - 10) this.scorePoint(0);

    // Cap speed
    const maxSpd = this.powerUp.active && this.powerUp.type === 'speed' ? 850 : 650;
    const spd = Math.sqrt(this.ball.vx ** 2 + this.ball.vy ** 2);
    if (spd > maxSpd) {
      this.ball.vx = (this.ball.vx / spd) * maxSpd;
      this.ball.vy = (this.ball.vy / spd) * maxSpd;
    }

    // Draw paddles
    this.drawPaddles();

    // Ball trail with glow
    this.ball.trail.forEach((t, i) => {
      const progress = i / this.ball.trail.length;
      const a = progress * 0.25;
      const glowSize = 14 * progress;
      // Outer glow
      this.gfx.fillStyle(t.color, a * 0.3);
      this.gfx.fillCircle(t.x, t.y, glowSize + 6);
      // Inner trail
      this.gfx.fillStyle(t.color, a * 0.8);
      this.gfx.fillCircle(t.x, t.y, 6 * progress);
    });

    // Ball outer glow (large, soft)
    this.gfx.fillStyle(this.ballGlowColor, 0.06);
    this.gfx.fillCircle(this.ball.x, this.ball.y, 28);
    this.gfx.fillStyle(this.ballGlowColor, 0.1);
    this.gfx.fillCircle(this.ball.x, this.ball.y, 18);
    // Ball body
    this.gfx.fillStyle(this.ballColor, 1);
    this.gfx.fillCircle(this.ball.x, this.ball.y, 7);
    // Ball highlight
    this.gfx.fillStyle(0xffffff, 0.5);
    this.gfx.fillCircle(this.ball.x - 2, this.ball.y - 2, 3);

    // Power-up indicator bar
    if (this.powerUp.active) {
      const barW = 60;
      const barH = 3;
      const barX = w / 2 - barW / 2;
      const barY = h - 14;
      const fill = this.powerUp.timer / this.powerUp.duration;
      this.gfx.fillStyle(0xffffff, 0.1);
      this.gfx.fillRect(barX, barY, barW, barH);
      this.gfx.fillStyle(this.powerUp.color, 0.7);
      this.gfx.fillRect(barX, barY, barW * fill, barH);
    }

    // Particles
    this.particles = this.particles.filter(p => {
      p.life -= delta;
      if (p.life <= 0) return false;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const a = p.life / 350;
      this.gfx.fillStyle(p.color, a * 0.6);
      this.gfx.fillCircle(p.x, p.y, p.size * a);
      return true;
    });
  }

  private drawPaddles() {
    this.paddles.forEach(paddle => {
      const ph = paddle.height;
      // Paddle shadow
      this.gfx.fillStyle(0x000000, 0.2);
      this.gfx.fillRoundedRect(paddle.x - 5 + 2, paddle.y - ph / 2 + 3, 14, ph, 6);
      // Paddle body
      this.gfx.fillStyle(paddle.color, 0.9);
      this.gfx.fillRoundedRect(paddle.x - 6, paddle.y - ph / 2, 12, ph, 5);
      // Paddle highlight
      this.gfx.fillStyle(0xffffff, 0.15);
      this.gfx.fillRoundedRect(paddle.x - 4, paddle.y - ph / 2 + 2, 8, ph * 0.25, 3);
    });
  }
}
