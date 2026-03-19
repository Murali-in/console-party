import Phaser from 'phaser';
import type { RoomPlayer } from '@/contexts/RealtimeContext';

interface PongConfig {
  players: RoomPlayer[];
  onGameOver: (winner: string, scores: Record<string, number>) => void;
  inputMap: Record<string, { x: number; y: number; buttonA: boolean; buttonB: boolean }>;
}

export default class PongScene extends Phaser.Scene {
  private roomPlayers: RoomPlayer[];
  private onGameOver: PongConfig['onGameOver'];
  private inputMap: PongConfig['inputMap'];
  private paddles: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private ball!: Phaser.GameObjects.Arc;
  private ballVx = 0;
  private ballVy = 0;
  private scores: Record<string, number> = {};
  private scoreTexts: Phaser.GameObjects.Text[] = [];
  private PADDLE_SPEED = 380;
  private BALL_SPEED = 300;
  private MAX_SCORE = 7;
  private serveCooldown = 0;
  private gfx!: Phaser.GameObjects.Graphics;

  constructor(config: PongConfig) {
    super({ key: 'Pong' });
    this.roomPlayers = config.players.slice(0, 2); // Max 2 players
    this.onGameOver = config.onGameOver;
    this.inputMap = config.inputMap;
  }

  create() {
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);

    this.gfx = this.add.graphics();

    // Draw court
    this.gfx.lineStyle(1, 0xffffff, 0.07);
    this.gfx.strokeRect(20, 20, w - 40, h - 40);
    // Center line (dashed)
    for (let y = 30; y < h - 30; y += 20) {
      this.gfx.fillStyle(0xffffff, 0.07);
      this.gfx.fillRect(w / 2 - 1, y, 2, 10);
    }

    // Paddles
    const paddleW = 12, paddleH = 80;
    const p1 = this.roomPlayers[0];
    const p2 = this.roomPlayers[1] || { id: 'cpu', name: 'CPU', color: '#f87171', index: 1 };

    const paddle1 = this.add.rectangle(40, h / 2, paddleW, paddleH, parseInt(p1.color.replace('#', ''), 16));
    this.paddles.set(p1.id, paddle1);
    this.scores[p1.name] = 0;

    const paddle2 = this.add.rectangle(w - 40, h / 2, paddleW, paddleH, parseInt(p2.color.replace('#', ''), 16));
    this.paddles.set(p2.id, paddle2);
    this.scores[p2.name] = 0;

    // Ball
    this.ball = this.add.circle(w / 2, h / 2, 8, 0xededf5);

    // Score texts
    const st1 = this.add.text(w / 2 - 60, 40, '0', {
      fontFamily: 'JetBrains Mono', fontSize: '36px', color: p1.color,
    }).setOrigin(0.5, 0);
    const st2 = this.add.text(w / 2 + 60, 40, '0', {
      fontFamily: 'JetBrains Mono', fontSize: '36px', color: p2.color,
    }).setOrigin(0.5, 0);
    this.scoreTexts = [st1, st2];

    this.serveBall();
  }

  private serveBall() {
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);
    this.ball.x = w / 2;
    this.ball.y = h / 2;
    const angle = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.6 + 0.2);
    this.ballVx = Math.cos(angle) * this.BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
    this.ballVy = Math.sin(angle) * this.BALL_SPEED;
    this.serveCooldown = 500;
  }

  private scorePoint(scorerIndex: number) {
    const names = Object.keys(this.scores);
    const name = names[scorerIndex];
    if (!name) return;
    this.scores[name]++;
    this.scoreTexts[scorerIndex]?.setText(String(this.scores[name]));

    if (this.scores[name] >= this.MAX_SCORE) {
      this.onGameOver(name, this.scores);
      return;
    }

    // Flash effect
    this.cameras.main.flash(200, 107, 95, 255, true);
    this.serveBall();
  }

  update(_time: number, delta: number) {
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);
    const dt = delta / 1000;

    if (this.serveCooldown > 0) {
      this.serveCooldown -= delta;
      return;
    }

    // Move paddles
    const playerIds = Array.from(this.paddles.keys());
    playerIds.forEach((pid, idx) => {
      const paddle = this.paddles.get(pid)!;
      const inp = this.inputMap[pid] ?? { x: 0, y: 0, buttonA: false, buttonB: false };

      // CPU for single player
      if (pid === 'cpu') {
        const diff = this.ball.y - paddle.y;
        const cpuSpeed = this.PADDLE_SPEED * 0.7;
        if (Math.abs(diff) > 10) {
          paddle.y += Math.sign(diff) * cpuSpeed * dt;
        }
      } else {
        paddle.y += inp.y * this.PADDLE_SPEED * dt;
      }

      // Lunge (button A) - quick burst toward ball
      if (inp.buttonA && pid !== 'cpu') {
        const diff = this.ball.y - paddle.y;
        paddle.y += Math.sign(diff) * this.PADDLE_SPEED * 2 * dt;
      }

      paddle.y = Phaser.Math.Clamp(paddle.y, 60, h - 60);
    });

    // Move ball
    this.ball.x += this.ballVx * dt;
    this.ball.y += this.ballVy * dt;

    // Top/bottom bounce
    if (this.ball.y <= 28 || this.ball.y >= h - 28) {
      this.ballVy *= -1;
      this.ball.y = Phaser.Math.Clamp(this.ball.y, 28, h - 28);
    }

    // Paddle collisions
    this.paddles.forEach((paddle, pid) => {
      const px = paddle.x, py = paddle.y;
      const pw = 12, ph = 80;
      if (
        this.ball.x - 8 < px + pw / 2 &&
        this.ball.x + 8 > px - pw / 2 &&
        this.ball.y > py - ph / 2 &&
        this.ball.y < py + ph / 2
      ) {
        // Reflect
        this.ballVx *= -1.05; // Speed up slightly
        const hitPos = (this.ball.y - py) / (ph / 2); // -1 to 1
        this.ballVy = hitPos * this.BALL_SPEED * 0.8;
        // Push ball out
        if (this.ball.x < w / 2) this.ball.x = px + pw / 2 + 9;
        else this.ball.x = px - pw / 2 - 9;
      }
    });

    // Score
    if (this.ball.x < 10) {
      this.scorePoint(1); // Right player scores
    } else if (this.ball.x > w - 10) {
      this.scorePoint(0); // Left player scores
    }

    // Cap ball speed
    const spd = Math.sqrt(this.ballVx * this.ballVx + this.ballVy * this.ballVy);
    if (spd > 600) {
      this.ballVx = (this.ballVx / spd) * 600;
      this.ballVy = (this.ballVy / spd) * 600;
    }
  }
}
