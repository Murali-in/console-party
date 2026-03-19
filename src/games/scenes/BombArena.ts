import Phaser from 'phaser';
import type { RoomPlayer } from '@/contexts/RealtimeContext';
import { playExplosion, playBombTransfer, playBombTick, playVictory } from '@/games/SoundFX';

interface BombArenaConfig {
  players: RoomPlayer[];
  onGameOver: (winner: string, scores: Record<string, number>) => void;
  inputMap: Record<string, { x: number; y: number; buttonA: boolean; buttonB: boolean }>;
}

export default class BombArenaScene extends Phaser.Scene {
  private roomPlayers: RoomPlayer[];
  private onGameOver: BombArenaConfig['onGameOver'];
  private inputMap: BombArenaConfig['inputMap'];
  private playerSprites: Map<string, Phaser.GameObjects.Arc> = new Map();
  private playerNames: Map<string, Phaser.GameObjects.Text> = new Map();
  private bombHolderId: string | null = null;
  private bombTimer = 8000;
  private gfx!: Phaser.GameObjects.Graphics;
  private alivePlayers: Set<string> = new Set();
  private roundWins: Record<string, number> = {};
  private currentRound = 1;
  private maxRounds = 3;
  private roundOverTimer = 0;
  private isRoundActive = true;
  private tickTimer = 0;
  private dashCooldowns: Map<string, number> = new Map();
  private hudText!: Phaser.GameObjects.Text;

  private SPEED = 220;
  private DASH_SPEED = 480;
  private DASH_DURATION = 180;
  private DASH_COOLDOWN = 1200;
  private dashTimers: Map<string, number> = new Map();

  constructor(config: BombArenaConfig) {
    super({ key: 'BombArena' });
    this.roomPlayers = config.players;
    this.onGameOver = config.onGameOver;
    this.inputMap = config.inputMap;
  }

  create() {
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);

    // Arena walls
    this.gfx = this.add.graphics();

    // Draw arena border
    this.gfx.lineStyle(1, 0x6b5fff, 0.2);
    this.gfx.strokeRect(40, 40, w - 80, h - 80);

    // HUD
    this.hudText = this.add.text(w / 2, 20, '', {
      fontFamily: 'JetBrains Mono',
      fontSize: '11px',
      color: '#ededf5',
      align: 'center',
    }).setOrigin(0.5, 0);

    this.startRound();
  }

  private startRound() {
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);

    // Clear old sprites
    this.playerSprites.forEach(s => s.destroy());
    this.playerNames.forEach(t => t.destroy());
    this.playerSprites.clear();
    this.playerNames.clear();
    this.alivePlayers.clear();
    this.dashCooldowns.clear();
    this.dashTimers.clear();

    // Spawn players in circle
    const cx = w / 2, cy = h / 2;
    this.roomPlayers.forEach((p, i) => {
      const angle = (i / this.roomPlayers.length) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(angle) * 160;
      const y = cy + Math.sin(angle) * 120;
      const color = parseInt(p.color.replace('#', ''), 16);
      const sprite = this.add.circle(x, y, 22, color);
      sprite.setData('playerId', p.id);
      this.playerSprites.set(p.id, sprite);
      this.alivePlayers.add(p.id);
      this.dashCooldowns.set(p.id, 0);
      this.dashTimers.set(p.id, 0);

      const nameText = this.add.text(x, y - 34, p.name, {
        fontFamily: 'Syne',
        fontSize: '10px',
        color: '#ededf5',
        align: 'center',
      }).setOrigin(0.5, 1);
      this.playerNames.set(p.id, nameText);

      if (!this.roundWins[p.name]) this.roundWins[p.name] = 0;
    });

    // Random bomb holder
    const aliveArr = Array.from(this.alivePlayers);
    this.bombHolderId = aliveArr[Math.floor(Math.random() * aliveArr.length)];
    this.bombTimer = 8000;
    this.isRoundActive = true;
    this.tickTimer = 0;
  }

  private transferBomb(newId: string) {
    if (newId === this.bombHolderId || !this.alivePlayers.has(newId)) return;
    this.bombHolderId = newId;
    this.bombTimer = 8000;
    playBombTransfer();
  }

  private eliminatePlayer(id: string) {
    this.alivePlayers.delete(id);
    const sprite = this.playerSprites.get(id);
    if (sprite) sprite.setAlpha(0.2);
    playExplosion();

    const alive = Array.from(this.alivePlayers);
    if (alive.length <= 1) {
      this.isRoundActive = false;
      if (alive.length === 1) {
        const winnerPlayer = this.roomPlayers.find(p => p.id === alive[0]);
        if (winnerPlayer) this.roundWins[winnerPlayer.name] = (this.roundWins[winnerPlayer.name] || 0) + 1;
      }

      // Check for overall winner
      const maxWins = Math.max(...Object.values(this.roundWins));
      if (this.currentRound >= this.maxRounds || maxWins >= 2) {
        playVictory();
        const winner = Object.entries(this.roundWins).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Nobody';
        this.time.delayedCall(1500, () => this.onGameOver(winner, this.roundWins));
      } else {
        this.currentRound++;
        this.time.delayedCall(2000, () => this.startRound());
      }
      return;
    }

    // Transfer bomb to random alive player
    this.bombHolderId = alive[Math.floor(Math.random() * alive.length)];
    this.bombTimer = 8000;
  }

  update(_time: number, delta: number) {
    if (!this.isRoundActive) return;

    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);
    const pad = 50;

    // Move players
    this.playerSprites.forEach((sprite, id) => {
      if (!this.alivePlayers.has(id)) return;
      const inp = this.inputMap[id] ?? { x: 0, y: 0, buttonA: false, buttonB: false };

      // Dash
      let speed = this.SPEED;
      const dashTimer = this.dashTimers.get(id) || 0;
      const dashCd = this.dashCooldowns.get(id) || 0;

      if (inp.buttonB && dashCd <= 0 && dashTimer <= 0 && (Math.abs(inp.x) > 0.1 || Math.abs(inp.y) > 0.1)) {
        this.dashTimers.set(id, this.DASH_DURATION);
        this.dashCooldowns.set(id, this.DASH_COOLDOWN);
      }

      if (dashTimer > 0) {
        speed = this.DASH_SPEED;
        this.dashTimers.set(id, dashTimer - delta);
      }
      if (dashCd > 0) {
        this.dashCooldowns.set(id, dashCd - delta);
      }

      const dx = inp.x * speed * (delta / 1000);
      const dy = inp.y * speed * (delta / 1000);
      sprite.x = Phaser.Math.Clamp(sprite.x + dx, pad + 22, w - pad - 22);
      sprite.y = Phaser.Math.Clamp(sprite.y + dy, pad + 22, h - pad - 22);

      // Update name position
      const nameText = this.playerNames.get(id);
      if (nameText) {
        nameText.x = sprite.x;
        nameText.y = sprite.y - 34;
      }
    });

    // Check collisions (circle overlap → bomb transfer)
    const aliveArr = Array.from(this.alivePlayers);
    for (let i = 0; i < aliveArr.length; i++) {
      for (let j = i + 1; j < aliveArr.length; j++) {
        const a = this.playerSprites.get(aliveArr[i]);
        const b = this.playerSprites.get(aliveArr[j]);
        if (!a || !b) continue;
        const dist = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
        if (dist < 44) {
          // Push apart
          const angle = Math.atan2(b.y - a.y, b.x - a.x);
          const overlap = 44 - dist;
          a.x -= Math.cos(angle) * overlap * 0.5;
          a.y -= Math.sin(angle) * overlap * 0.5;
          b.x += Math.cos(angle) * overlap * 0.5;
          b.y += Math.sin(angle) * overlap * 0.5;

          // Transfer bomb
          if (aliveArr[i] === this.bombHolderId) this.transferBomb(aliveArr[j]);
          else if (aliveArr[j] === this.bombHolderId) this.transferBomb(aliveArr[i]);
        }
      }
    }

    // Bomb countdown
    if (this.bombHolderId && this.alivePlayers.has(this.bombHolderId)) {
      this.bombTimer -= delta;
      this.tickTimer += delta;
      if (this.tickTimer >= 500) {
        this.tickTimer = 0;
        playBombTick();
      }
      if (this.bombTimer <= 0) {
        this.eliminatePlayer(this.bombHolderId);
      }
    }

    // Draw bomb visuals
    this.gfx.clear();
    // Redraw arena border
    this.gfx.lineStyle(1, 0x6b5fff, 0.15);
    this.gfx.strokeRect(40, 40, w - 80, h - 80);

    if (this.bombHolderId && this.alivePlayers.has(this.bombHolderId)) {
      const holder = this.playerSprites.get(this.bombHolderId);
      if (holder) {
        const pulse = 26 + Math.sin(Date.now() * 0.008) * 6;
        const pct = Math.max(0, this.bombTimer / 8000);
        const color = pct > 0.6 ? 0x34d399 : pct > 0.3 ? 0xfbbf24 : 0xf87171;

        // Pulsing ring
        this.gfx.lineStyle(3, color, 0.9);
        this.gfx.strokeCircle(holder.x, holder.y, pulse);

        // Timer arc
        this.gfx.lineStyle(4, color, 1);
        this.gfx.beginPath();
        this.gfx.arc(holder.x, holder.y - 35, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
        this.gfx.strokePath();
      }
    }

    // HUD
    const roundInfo = `Round ${this.currentRound}/${this.maxRounds}`;
    const winsInfo = Object.entries(this.roundWins).map(([n, w2]) => `${n}: ${w2}`).join('  ');
    this.hudText.setText(`${roundInfo}  |  ${winsInfo}`);
  }
}
