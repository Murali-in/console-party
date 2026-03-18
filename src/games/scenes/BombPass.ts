import Phaser from 'phaser';
import type { RoomPlayer } from '@/contexts/RealtimeContext';

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

  constructor(config: BombPassConfig) {
    super({ key: 'BombPass' });
    this.roomPlayers = config.players;
    this.onGameOver = config.onGameOver;
    this.inputMap = config.inputMap;
  }

  create() {
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);

    // Arena border
    const border = this.add.graphics();
    border.lineStyle(2, 0x6c63ff, 0.3);
    border.strokeRect(40, 40, w - 80, h - 80);

    // Init round wins
    this.roomPlayers.forEach(p => { this.roundWins[p.id] = 0; });

    this.startRound();
  }

  startRound() {
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);

    // Clear old sprites
    this.playerSprites.forEach(s => s.destroy());
    this.playerTexts.forEach(t => t.destroy());
    this.hudTexts.forEach(t => t.destroy());
    this.playerSprites.clear();
    this.playerTexts.clear();
    this.hudTexts.clear();
    this.bombArc?.destroy();
    this.bombEmoji?.destroy();

    this.alivePlayers = new Set(this.roomPlayers.map(p => p.id));
    this.isRoundActive = true;

    // Spawn players in circle
    this.roomPlayers.forEach((p, i) => {
      const angle = (i / this.roomPlayers.length) * Math.PI * 2;
      const cx = w / 2 + Math.cos(angle) * 150;
      const cy = h / 2 + Math.sin(angle) * 100;

      const circle = this.add.circle(cx, cy, 20, Phaser.Display.Color.HexStringToColor(p.color).color);
      this.playerSprites.set(p.id, circle);

      const label = this.add.text(cx, cy - 30, p.name, {
        fontSize: '11px', fontFamily: 'JetBrains Mono', color: '#f0f0f5',
      }).setOrigin(0.5);
      this.playerTexts.set(p.id, label);
    });

    // Pick random bomb holder
    const aliveArr = Array.from(this.alivePlayers);
    this.bombHolderId = aliveArr[Math.floor(Math.random() * aliveArr.length)];
    this.bombTimer = 8000;

    this.bombArc = this.add.graphics();
    this.bombEmoji = this.add.text(0, 0, '💣', { fontSize: '24px' }).setOrigin(0.5);

    // HUD
    this.roomPlayers.forEach((p, i) => {
      const ht = this.add.text(16, 16 + i * 20, `${p.name}: ${this.roundWins[p.id]}W`, {
        fontSize: '11px', fontFamily: 'JetBrains Mono', color: p.color,
      });
      this.hudTexts.set(p.id, ht);
    });

    // Round indicator
    this.add.text(w - 16, 16, `Round ${this.currentRound}/${this.maxRounds}`, {
      fontSize: '12px', fontFamily: 'JetBrains Mono', color: '#6c63ff',
    }).setOrigin(1, 0);
  }

  update(_time: number, delta: number) {
    if (!this.isRoundActive) {
      this.roundOverTimer -= delta;
      if (this.roundOverTimer <= 0) {
        if (this.currentRound >= this.maxRounds) {
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
    const speed = 200;

    // Move players
    this.playerSprites.forEach((sprite, id) => {
      if (!this.alivePlayers.has(id)) return;
      const inp = this.inputMap[id] || { x: 0, y: 0 };
      let nx = sprite.x + inp.x * speed * (delta / 1000);
      let ny = sprite.y + inp.y * speed * (delta / 1000);
      nx = Phaser.Math.Clamp(nx, 60, w - 60);
      ny = Phaser.Math.Clamp(ny, 60, h - 60);
      sprite.setPosition(nx, ny);
      this.playerTexts.get(id)?.setPosition(nx, ny - 30);
    });

    // Check collisions (bomb transfer)
    if (this.bombHolderId) {
      const holderSprite = this.playerSprites.get(this.bombHolderId);
      if (holderSprite) {
        this.playerSprites.forEach((sprite, id) => {
          if (id === this.bombHolderId || !this.alivePlayers.has(id)) return;
          const dist = Phaser.Math.Distance.Between(holderSprite.x, holderSprite.y, sprite.x, sprite.y);
          if (dist < 44) {
            this.bombHolderId = id;
            this.bombTimer = 8000;
          }
        });
      }
    }

    // Bomb timer
    if (this.bombHolderId) {
      this.bombTimer -= delta;
      if (this.bombTimer <= 0) {
        this.eliminatePlayer(this.bombHolderId);
      }

      // Draw bomb visuals
      const hs = this.playerSprites.get(this.bombHolderId);
      if (hs) {
        this.bombEmoji.setPosition(hs.x, hs.y - 48);
        this.bombArc.clear();
        this.bombArc.lineStyle(3, 0xf87171, 1);
        const frac = Math.max(0, this.bombTimer / 8000);
        this.bombArc.beginPath();
        this.bombArc.arc(hs.x, hs.y, 28, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2, false);
        this.bombArc.strokePath();
      }
    }
  }

  eliminatePlayer(id: string) {
    this.alivePlayers.delete(id);
    const sprite = this.playerSprites.get(id);
    if (sprite) sprite.setAlpha(0.2);

    // Transfer bomb to nearest alive
    const alive = Array.from(this.alivePlayers);
    if (alive.length <= 1) {
      // Round over
      const winnerId = alive[0];
      if (winnerId) this.roundWins[winnerId]++;
      this.isRoundActive = false;
      this.roundOverTimer = 2000;
      this.bombArc?.clear();
      this.bombEmoji?.setVisible(false);

      const winnerName = this.roomPlayers.find(p => p.id === winnerId)?.name || 'Unknown';
      const w = Number(this.game.config.width);
      const h = Number(this.game.config.height);
      this.add.text(w / 2, h / 2, `${winnerName} wins round ${this.currentRound}!`, {
        fontSize: '24px', fontFamily: 'Syne', color: '#6c63ff', fontStyle: 'bold',
      }).setOrigin(0.5);
      return;
    }

    // Find nearest alive to eliminated player
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
  }
}
