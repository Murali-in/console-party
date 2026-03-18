import Phaser from 'phaser';
import type { RoomPlayer } from '@/contexts/RealtimeContext';
import { playExplosion, playBombTransfer, playBombTick, playVictory, playEliminate } from '@/games/SoundFX';

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
  private playerTrails: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private playerTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private bombHolderId: string | null = null;
  private bombTimer = 8000;
  private bombArc!: Phaser.GameObjects.Graphics;
  private bombEmoji!: Phaser.GameObjects.Text;
  private alivePlayers: Set<string> = new Set();
  private hudTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private roundWins: Record<string, number> = {};
  private currentRound = 1;
  private maxRounds = 3;
  private roundOverTimer = 0;
  private isRoundActive = true;
  private tickTimer = 0;
  private arenaGraphics!: Phaser.GameObjects.Graphics;
  private dashCooldowns: Map<string, number> = new Map();
  private shakeTimer = 0;

  constructor(config: BombPassConfig) {
    super({ key: 'BombPass' });
    this.roomPlayers = config.players;
    this.onGameOver = config.onGameOver;
    this.inputMap = config.inputMap;
  }

  create() {
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);

    // Arena with double border
    this.arenaGraphics = this.add.graphics();
    this.arenaGraphics.lineStyle(2, 0x6c63ff, 0.4);
    this.arenaGraphics.strokeRect(40, 40, w - 80, h - 80);
    this.arenaGraphics.lineStyle(1, 0x6c63ff, 0.1);
    this.arenaGraphics.strokeRect(44, 44, w - 88, h - 88);

    // Grid lines on floor
    const gridG = this.add.graphics();
    gridG.lineStyle(1, 0x6c63ff, 0.04);
    for (let x = 40; x < w - 40; x += 50) {
      gridG.lineBetween(x, 40, x, h - 40);
    }
    for (let y = 40; y < h - 40; y += 50) {
      gridG.lineBetween(40, y, w - 40, y);
    }

    this.roomPlayers.forEach(p => {
      this.roundWins[p.id] = 0;
      this.dashCooldowns.set(p.id, 0);
    });

    this.startRound();
  }

  startRound() {
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);

    // Clear old
    this.playerSprites.forEach(s => s.destroy());
    this.playerTexts.forEach(t => t.destroy());
    this.playerTrails.forEach(g => g.destroy());
    this.hudTexts.forEach(t => t.destroy());
    this.playerSprites.clear();
    this.playerTexts.clear();
    this.playerTrails.clear();
    this.hudTexts.clear();
    this.bombArc?.destroy();
    this.bombEmoji?.destroy();

    this.alivePlayers = new Set(this.roomPlayers.map(p => p.id));
    this.isRoundActive = true;

    // Spawn players in circle
    this.roomPlayers.forEach((p, i) => {
      const angle = (i / this.roomPlayers.length) * Math.PI * 2 - Math.PI / 2;
      const cx = w / 2 + Math.cos(angle) * Math.min(w * 0.25, 180);
      const cy = h / 2 + Math.sin(angle) * Math.min(h * 0.25, 120);

      const trail = this.add.graphics();
      this.playerTrails.set(p.id, trail);

      const color = Phaser.Display.Color.HexStringToColor(p.color).color;
      const circle = this.add.circle(cx, cy, 18, color);
      circle.setStrokeStyle(2, 0xffffff, 0.2);
      this.playerSprites.set(p.id, circle);

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

    this.bombArc = this.add.graphics().setDepth(5);
    this.bombEmoji = this.add.text(0, 0, '💣', { fontSize: '22px' }).setOrigin(0.5).setDepth(10);

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

    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);
    const baseSpeed = 220;
    const dt = delta / 1000;

    // Move players
    this.playerSprites.forEach((sprite, id) => {
      if (!this.alivePlayers.has(id)) return;
      const inp = this.inputMap[id] || { x: 0, y: 0, buttonA: false, buttonB: false };

      // Dash on button B (bomb-pass specific)
      let speed = baseSpeed;
      const cd = this.dashCooldowns.get(id) || 0;
      if (inp.buttonB && cd <= 0) {
        speed = 550;
        this.dashCooldowns.set(id, 1500);
      }
      if (cd > 0) this.dashCooldowns.set(id, cd - delta);

      const prevX = sprite.x;
      const prevY = sprite.y;
      let nx = sprite.x + inp.x * speed * dt;
      let ny = sprite.y + inp.y * speed * dt;
      nx = Phaser.Math.Clamp(nx, 60, w - 60);
      ny = Phaser.Math.Clamp(ny, 60, h - 60);
      sprite.setPosition(nx, ny);
      this.playerTexts.get(id)?.setPosition(nx, ny - 28);

      // Trail effect
      const trail = this.playerTrails.get(id);
      if (trail && (Math.abs(nx - prevX) > 0.5 || Math.abs(ny - prevY) > 0.5)) {
        trail.clear();
        const playerColor = Phaser.Display.Color.HexStringToColor(
          this.roomPlayers.find(p => p.id === id)?.color || '#ffffff'
        ).color;
        trail.fillStyle(playerColor, 0.15);
        trail.fillCircle(prevX, prevY, 10);
      }
    });

    // Collision detection for bomb transfer
    if (this.bombHolderId) {
      const holderSprite = this.playerSprites.get(this.bombHolderId);
      if (holderSprite) {
        this.playerSprites.forEach((sprite, id) => {
          if (id === this.bombHolderId || !this.alivePlayers.has(id)) return;
          const dist = Phaser.Math.Distance.Between(holderSprite.x, holderSprite.y, sprite.x, sprite.y);
          if (dist < 40) {
            const oldHolder = this.bombHolderId;
            this.bombHolderId = id;
            this.bombTimer = Math.max(3000, this.bombTimer); // min 3s after transfer
            playBombTransfer();

            // Push back effect on old holder
            const oldSprite = this.playerSprites.get(oldHolder!);
            if (oldSprite) {
              const angle = Math.atan2(oldSprite.y - sprite.y, oldSprite.x - sprite.x);
              oldSprite.x += Math.cos(angle) * 30;
              oldSprite.y += Math.sin(angle) * 30;
            }
          }
        });
      }

      // Bomb timer
      this.bombTimer -= delta;

      // Tick sound accelerates as timer decreases
      this.tickTimer -= delta;
      const tickInterval = Math.max(100, (this.bombTimer / 8000) * 500);
      if (this.tickTimer <= 0) {
        playBombTick();
        this.tickTimer = tickInterval;
      }

      if (this.bombTimer <= 0) {
        this.eliminatePlayer(this.bombHolderId);
      }

      // Bomb visuals
      const hs = this.playerSprites.get(this.bombHolderId);
      if (hs) {
        this.bombEmoji.setPosition(hs.x, hs.y - 44);
        // Pulse the bomb holder
        const pulse = 1 + Math.sin(_time * 0.01) * 0.08;
        hs.setScale(pulse);

        // Timer arc
        this.bombArc.clear();
        const frac = Math.max(0, this.bombTimer / 8000);
        // Color changes from green to red
        const r = Math.min(255, Math.floor(255 * (1 - frac)));
        const g = Math.min(255, Math.floor(255 * frac));
        const arcColor = Phaser.Display.Color.GetColor(r, g, 0);
        this.bombArc.lineStyle(4, arcColor, 0.9);
        this.bombArc.beginPath();
        this.bombArc.arc(hs.x, hs.y, 26, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2, false);
        this.bombArc.strokePath();

        // Danger ring when low
        if (frac < 0.25) {
          this.bombArc.lineStyle(2, 0xf87171, 0.3 + Math.sin(_time * 0.02) * 0.2);
          this.bombArc.strokeCircle(hs.x, hs.y, 34);
        }
      }
    }

    // Screen shake when bomb is low
    if (this.bombTimer < 2000 && this.bombTimer > 0) {
      this.cameras.main.shake(50, 0.002);
    }

    // Update HUD
    this.hudTexts.forEach((ht, id) => {
      const p = this.roomPlayers.find(pl => pl.id === id);
      if (p) {
        const alive = this.alivePlayers.has(id) ? '' : ' ☠';
        const bomb = id === this.bombHolderId ? ' 💣' : '';
        ht.setText(`${p.name}: ${this.roundWins[id]}W${bomb}${alive}`);
      }
    });
  }

  eliminatePlayer(id: string) {
    this.alivePlayers.delete(id);
    const sprite = this.playerSprites.get(id);
    if (sprite) {
      sprite.setAlpha(0.15);
      sprite.setScale(1);
      playExplosion();

      // Explosion particles
      const particles = this.add.graphics();
      const color = Phaser.Display.Color.HexStringToColor(
        this.roomPlayers.find(p => p.id === id)?.color || '#ff0000'
      ).color;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const dist = 20 + Math.random() * 40;
        const px = sprite.x + Math.cos(angle) * dist;
        const py = sprite.y + Math.sin(angle) * dist;
        particles.fillStyle(color, 0.6);
        particles.fillCircle(px, py, 3 + Math.random() * 4);
      }
      this.time.delayedCall(500, () => particles.destroy());
    }

    // Camera shake
    this.cameras.main.shake(200, 0.01);

    const alive = Array.from(this.alivePlayers);
    if (alive.length <= 1) {
      const winnerId = alive[0];
      if (winnerId) this.roundWins[winnerId]++;
      this.isRoundActive = false;
      this.roundOverTimer = 2500;
      this.bombArc?.clear();
      this.bombEmoji?.setVisible(false);

      const winnerName = this.roomPlayers.find(p => p.id === winnerId)?.name || 'Unknown';
      const w = Number(this.game.config.width);
      const h = Number(this.game.config.height);

      // Background dim
      this.add.rectangle(w / 2, h / 2, w, h, 0x080810, 0.5).setDepth(50);
      this.add.text(w / 2, h / 2, `${winnerName} wins round ${this.currentRound}!`, {
        fontSize: '22px', fontFamily: 'Syne', color: '#6c63ff', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(51);
      return;
    }

    // Transfer to nearest alive
    const elimSprite = this.playerSprites.get(id);
    if (!elimSprite) { this.bombHolderId = alive[0]; this.bombTimer = 8000; return; }

    let closest = alive[0];
    let minDist = Infinity;
    alive.forEach(pid => {
      const s = this.playerSprites.get(pid);
      if (s) {
        const d = Phaser.Math.Distance.Between(elimSprite.x, elimSprite.y, s.x, s.y);
        if (d < minDist) { minDist = d; closest = pid; }
      }
    });
    this.bombHolderId = closest;
    this.bombTimer = 8000;
    playBombTransfer();
  }
}
