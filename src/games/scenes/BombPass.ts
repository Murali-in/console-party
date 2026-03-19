import Phaser from 'phaser';
import type { RoomPlayer } from '@/contexts/RealtimeContext';
import { playExplosion, playBombTransfer, playBombTick, playVictory } from '@/games/SoundFX';

interface BombPassConfig {
  players: RoomPlayer[];
  onGameOver: (winner: string, scores: Record<string, number>) => void;
  inputMap: Record<string, { x: number; y: number; buttonA: boolean; buttonB: boolean }>;
}

export default class BombPassScene extends Phaser.Scene {
  private roomPlayers: RoomPlayer[];
  private onGameOver: BombPassConfig['onGameOver'];
  private inputMap: BombPassConfig['inputMap'];
  private playerSprites: Map<string, Phaser.GameObjects.Arc> = new Map();
  private playerTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private playerVelocities: Map<string, { vx: number; vy: number }> = new Map();
  private bombHolderId: string | null = null;
  private bombTimer = 8000;
  private bombArc!: Phaser.GameObjects.Graphics;
  private bombIndicator!: Phaser.GameObjects.Arc;
  private alivePlayers: Set<string> = new Set();
  private hudTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private roundWins: Record<string, number> = {};
  private currentRound = 1;
  private maxRounds = 3;
  private roundOverTimer = 0;
  private isRoundActive = true;
  private tickTimer = 0;
  private dashCooldowns: Map<string, number> = new Map();

  // Arena bounds
  private arenaLeft = 0;
  private arenaRight = 0;
  private arenaTop = 0;
  private arenaBottom = 0;

  constructor(config: BombPassConfig) {
    super({ key: 'BombPass' });
    this.roomPlayers = config.players;
    this.onGameOver = config.onGameOver;
    this.inputMap = config.inputMap;
  }

  create() {
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);

    this.arenaLeft = 50;
    this.arenaRight = w - 50;
    this.arenaTop = 50;
    this.arenaBottom = h - 50;

    // Arena walls
    const g = this.add.graphics();
    g.lineStyle(2, 0x6c63ff, 0.35);
    g.strokeRect(this.arenaLeft, this.arenaTop, this.arenaRight - this.arenaLeft, this.arenaBottom - this.arenaTop);
    g.lineStyle(1, 0x6c63ff, 0.08);
    g.strokeRect(this.arenaLeft + 4, this.arenaTop + 4, this.arenaRight - this.arenaLeft - 8, this.arenaBottom - this.arenaTop - 8);

    // Floor grid
    const gridG = this.add.graphics();
    gridG.lineStyle(1, 0x6c63ff, 0.03);
    for (let x = this.arenaLeft; x <= this.arenaRight; x += 50) gridG.lineBetween(x, this.arenaTop, x, this.arenaBottom);
    for (let y = this.arenaTop; y <= this.arenaBottom; y += 50) gridG.lineBetween(this.arenaLeft, y, this.arenaRight, y);

    this.roomPlayers.forEach(p => {
      this.roundWins[p.id] = 0;
      this.dashCooldowns.set(p.id, 0);
      this.playerVelocities.set(p.id, { vx: 0, vy: 0 });
    });

    this.startRound();
  }

  startRound() {
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);

    // Clear old
    this.playerSprites.forEach(s => s.destroy());
    this.playerTexts.forEach(t => t.destroy());
    this.hudTexts.forEach(t => t.destroy());
    this.playerSprites.clear();
    this.playerTexts.clear();
    this.hudTexts.clear();
    this.bombArc?.destroy();
    this.bombIndicator?.destroy();

    this.alivePlayers = new Set(this.roomPlayers.map(p => p.id));
    this.isRoundActive = true;

    // Spawn players in circle
    this.roomPlayers.forEach((p, i) => {
      const angle = (i / this.roomPlayers.length) * Math.PI * 2 - Math.PI / 2;
      const cx = w / 2 + Math.cos(angle) * Math.min(w * 0.22, 160);
      const cy = h / 2 + Math.sin(angle) * Math.min(h * 0.22, 110);

      const color = Phaser.Display.Color.HexStringToColor(p.color).color;
      const circle = this.add.circle(cx, cy, 18, color).setStrokeStyle(2, 0xffffff, 0.15).setDepth(5);
      this.playerSprites.set(p.id, circle);
      this.playerVelocities.set(p.id, { vx: 0, vy: 0 });

      const label = this.add.text(cx, cy - 28, p.name, {
        fontSize: '10px', fontFamily: 'JetBrains Mono', color: '#f0f0f5',
      }).setOrigin(0.5).setDepth(10);
      this.playerTexts.set(p.id, label);
    });

    // Random bomb holder
    const aliveArr = Array.from(this.alivePlayers);
    this.bombHolderId = aliveArr[Math.floor(Math.random() * aliveArr.length)];
    this.bombTimer = 8000;
    this.tickTimer = 0;

    this.bombArc = this.add.graphics().setDepth(6);
    this.bombIndicator = this.add.circle(0, 0, 28, 0xf87171, 0).setStrokeStyle(3, 0xf87171, 0.6).setDepth(4);

    // HUD
    this.roomPlayers.forEach((p, i) => {
      const ht = this.add.text(16, 16 + i * 20, '', {
        fontSize: '10px', fontFamily: 'JetBrains Mono', color: p.color,
      }).setDepth(20);
      this.hudTexts.set(p.id, ht);
    });

    this.add.text(w - 16, 16, `Round ${this.currentRound}/${this.maxRounds}`, {
      fontSize: '11px', fontFamily: 'JetBrains Mono', color: '#6c63ff',
    }).setOrigin(1, 0).setDepth(20);
  }

  update(_time: number, delta: number) {
    if (!this.isRoundActive) {
      this.roundOverTimer -= delta;
      if (this.roundOverTimer <= 0) {
        if (this.currentRound >= this.maxRounds) {
          playVictory();
          const scores: Record<string, number> = {};
          let maxWins = 0;
          let winnerId = '';
          this.roomPlayers.forEach(p => {
            scores[p.name] = this.roundWins[p.id];
            if (this.roundWins[p.id] > maxWins) {
              maxWins = this.roundWins[p.id];
              winnerId = p.name;
            }
          });
          this.onGameOver(winnerId, scores);
        } else {
          this.currentRound++;
          this.startRound();
        }
      }
      return;
    }

    const dt = delta / 1000;
    const baseSpeed = 240;
    const friction = 0.88;

    // Move players with proper physics (velocity + friction)
    this.playerSprites.forEach((sprite, id) => {
      if (!this.alivePlayers.has(id)) return;
      const inp = this.inputMap[id] || { x: 0, y: 0, buttonA: false, buttonB: false };
      const vel = this.playerVelocities.get(id)!;

      // Dash on button B
      let speed = baseSpeed;
      const cd = this.dashCooldowns.get(id) || 0;
      if (inp.buttonB && cd <= 0 && (Math.abs(inp.x) > 0.1 || Math.abs(inp.y) > 0.1)) {
        speed = 600;
        this.dashCooldowns.set(id, 1200);
      }
      if (cd > 0) this.dashCooldowns.set(id, cd - delta);

      // Apply input as acceleration
      vel.vx += inp.x * speed * dt;
      vel.vy += inp.y * speed * dt;

      // Friction
      vel.vx *= friction;
      vel.vy *= friction;

      // Clamp max speed
      const maxSpd = speed * 1.2;
      const spd = Math.sqrt(vel.vx * vel.vx + vel.vy * vel.vy);
      if (spd > maxSpd) {
        vel.vx = (vel.vx / spd) * maxSpd;
        vel.vy = (vel.vy / spd) * maxSpd;
      }

      let nx = sprite.x + vel.vx * dt;
      let ny = sprite.y + vel.vy * dt;

      // Wall bounce
      if (nx < this.arenaLeft + 20) { nx = this.arenaLeft + 20; vel.vx *= -0.5; }
      if (nx > this.arenaRight - 20) { nx = this.arenaRight - 20; vel.vx *= -0.5; }
      if (ny < this.arenaTop + 20) { ny = this.arenaTop + 20; vel.vy *= -0.5; }
      if (ny > this.arenaBottom - 20) { ny = this.arenaBottom - 20; vel.vy *= -0.5; }

      sprite.setPosition(nx, ny);
      this.playerTexts.get(id)?.setPosition(nx, ny - 28);
    });

    // Player-to-player collision (circle overlap resolution + bomb transfer)
    const aliveIds = Array.from(this.alivePlayers);
    for (let i = 0; i < aliveIds.length; i++) {
      for (let j = i + 1; j < aliveIds.length; j++) {
        const a = this.playerSprites.get(aliveIds[i])!;
        const b = this.playerSprites.get(aliveIds[j])!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = 38; // radius * 2 + gap

        if (dist < minDist && dist > 0) {
          // Separate overlapping players
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;

          // Bounce velocities
          const velA = this.playerVelocities.get(aliveIds[i])!;
          const velB = this.playerVelocities.get(aliveIds[j])!;
          const pushForce = 120;
          velA.vx -= nx * pushForce;
          velA.vy -= ny * pushForce;
          velB.vx += nx * pushForce;
          velB.vy += ny * pushForce;

          // Bomb transfer
          if (aliveIds[i] === this.bombHolderId) {
            this.bombHolderId = aliveIds[j];
            this.bombTimer = Math.max(3000, this.bombTimer);
            playBombTransfer();
          } else if (aliveIds[j] === this.bombHolderId) {
            this.bombHolderId = aliveIds[i];
            this.bombTimer = Math.max(3000, this.bombTimer);
            playBombTransfer();
          }
        }
      }
    }

    // Bomb timer
    if (this.bombHolderId) {
      this.bombTimer -= delta;

      // Accelerating tick
      this.tickTimer -= delta;
      const tickInterval = Math.max(80, (this.bombTimer / 8000) * 500);
      if (this.tickTimer <= 0) {
        playBombTick();
        this.tickTimer = tickInterval;
      }

      if (this.bombTimer <= 0) {
        this.eliminatePlayer(this.bombHolderId);
        return;
      }

      // Bomb visuals
      const hs = this.playerSprites.get(this.bombHolderId);
      if (hs) {
        // Pulsing indicator ring
        const pulse = 28 + Math.sin(_time * 0.008) * 4;
        this.bombIndicator.setPosition(hs.x, hs.y);
        this.bombIndicator.setRadius(pulse);
        this.bombIndicator.setVisible(true);

        // Pulse holder sprite
        const scalePulse = 1 + Math.sin(_time * 0.01) * 0.06;
        hs.setScale(scalePulse);

        // Timer arc (green → yellow → red)
        this.bombArc.clear();
        const frac = Math.max(0, this.bombTimer / 8000);
        const r = Math.min(255, Math.floor(255 * (1 - frac)));
        const g = Math.min(255, Math.floor(255 * frac));
        const arcColor = Phaser.Display.Color.GetColor(r, g, 0);
        this.bombArc.lineStyle(4, arcColor, 0.9);
        this.bombArc.beginPath();
        this.bombArc.arc(hs.x, hs.y, 30, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2, false);
        this.bombArc.strokePath();

        // Danger shake when low
        if (frac < 0.2) {
          this.cameras.main.shake(30, 0.003);
          this.bombArc.lineStyle(2, 0xf87171, 0.2 + Math.sin(_time * 0.02) * 0.15);
          this.bombArc.strokeCircle(hs.x, hs.y, 36);
        }
      }
    }

    // HUD
    this.hudTexts.forEach((ht, id) => {
      const p = this.roomPlayers.find(pl => pl.id === id);
      if (p) {
        const alive = this.alivePlayers.has(id) ? '' : ' [OUT]';
        const bomb = id === this.bombHolderId ? ' [BOMB]' : '';
        ht.setText(`${p.name}: ${this.roundWins[id]}W${bomb}${alive}`);
      }
    });
  }

  eliminatePlayer(id: string) {
    this.alivePlayers.delete(id);
    const sprite = this.playerSprites.get(id);
    if (sprite) {
      sprite.setAlpha(0.12);
      sprite.setScale(1);
      playExplosion();

      // Explosion ring effect
      const ring = this.add.circle(sprite.x, sprite.y, 5, 0xf87171, 0.4).setDepth(8);
      this.tweens.add({
        targets: ring,
        radius: 60,
        alpha: 0,
        duration: 400,
        onComplete: () => ring.destroy(),
      });

      // Particle burst
      const color = Phaser.Display.Color.HexStringToColor(
        this.roomPlayers.find(p => p.id === id)?.color || '#ff0000'
      ).color;
      const particles = this.add.graphics().setDepth(8);
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        const dist = 15 + Math.random() * 40;
        particles.fillStyle(color, 0.5);
        particles.fillCircle(sprite.x + Math.cos(angle) * dist, sprite.y + Math.sin(angle) * dist, 2 + Math.random() * 3);
      }
      this.time.delayedCall(600, () => particles.destroy());
    }

    this.cameras.main.shake(250, 0.012);
    this.bombIndicator.setVisible(false);

    const alive = Array.from(this.alivePlayers);
    if (alive.length <= 1) {
      const winnerId = alive[0];
      if (winnerId) this.roundWins[winnerId]++;
      this.isRoundActive = false;
      this.roundOverTimer = 2500;
      this.bombArc?.clear();

      const winnerName = this.roomPlayers.find(p => p.id === winnerId)?.name || 'Unknown';
      const w = Number(this.game.config.width);
      const h = Number(this.game.config.height);

      this.add.rectangle(w / 2, h / 2, w, h, 0x080810, 0.5).setDepth(50);
      this.add.text(w / 2, h / 2, `${winnerName} wins round ${this.currentRound}!`, {
        fontSize: '22px', fontFamily: 'Syne', color: '#6c63ff', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(51);
      return;
    }

    // Transfer bomb to random alive player
    this.bombHolderId = alive[Math.floor(Math.random() * alive.length)];
    this.bombTimer = 8000;
    playBombTransfer();
  }
}
