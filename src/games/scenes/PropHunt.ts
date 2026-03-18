import Phaser from 'phaser';
import type { RoomPlayer } from '@/contexts/RealtimeContext';
import { playTransform, playEliminate, playVictory } from '@/games/SoundFX';

interface PropHuntConfig {
  players: RoomPlayer[];
  onGameOver: (winner: string, scores: Record<string, number>) => void;
  inputMap: Record<string, { x: number; y: number; buttonA: boolean; buttonB: boolean }>;
}

const PROP_EMOJIS = ['🪑', '📦', '🪴', '🛢️', '🧸', '📚'];

export default class PropHuntScene extends Phaser.Scene {
  private roomPlayers: RoomPlayer[];
  private onGameOver: PropHuntConfig['onGameOver'];
  private inputMap: PropHuntConfig['inputMap'];
  private hunterId: string = '';
  private propIds: string[] = [];
  private playerSprites: Map<string, Phaser.GameObjects.Arc> = new Map();
  private playerLabels: Map<string, Phaser.GameObjects.Text> = new Map();
  private propEmojis: Map<string, Phaser.GameObjects.Text> = new Map();
  private transformed: Map<string, boolean> = new Map();
  private eliminated: Set<string> = new Set();
  private phase: 'hiding' | 'seeking' = 'hiding';
  private phaseTimer = 30000;
  private seekTimer = 90000;
  private hunterBlind!: Phaser.GameObjects.Rectangle;
  private hunterBlindText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private finished = false;
  private checkCooldown = 0;
  private hunterCheckRadius!: Phaser.GameObjects.Arc;
  private scanPulse = 0;

  constructor(config: PropHuntConfig) {
    super({ key: 'PropHunt' });
    this.roomPlayers = config.players;
    this.onGameOver = config.onGameOver;
    this.inputMap = config.inputMap;
  }

  create() {
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);

    // Room background with furniture-like patterns
    const bg = this.add.graphics();
    bg.fillStyle(0x120a00, 0.15);
    bg.fillRect(40, 40, w - 80, h - 80);
    bg.lineStyle(1, 0x6c63ff, 0.1);
    bg.strokeRect(40, 40, w - 80, h - 80);

    // Floor tiles
    bg.lineStyle(1, 0xffffff, 0.02);
    for (let x = 40; x < w - 40; x += 60) bg.lineBetween(x, 40, x, h - 40);
    for (let y = 40; y < h - 40; y += 60) bg.lineBetween(40, y, w - 40, y);

    // Scatter decoy props (more of them, varied sizes)
    const decoyCount = 25;
    for (let i = 0; i < decoyCount; i++) {
      const dx = 70 + Math.random() * (w - 140);
      const dy = 70 + Math.random() * (h - 140);
      const emoji = PROP_EMOJIS[Math.floor(Math.random() * PROP_EMOJIS.length)];
      const size = 22 + Math.random() * 12;
      this.add.text(dx, dy, emoji, { fontSize: `${size}px` }).setOrigin(0.5).setAlpha(0.9);
    }

    // Assign roles
    this.hunterId = this.roomPlayers[0].id;
    this.propIds = this.roomPlayers.slice(1).map(p => p.id);
    if (this.propIds.length === 0 && this.roomPlayers.length >= 2) {
      this.propIds = [this.roomPlayers[1].id];
    }

    // Spawn players
    this.roomPlayers.forEach((p, i) => {
      const px = 100 + (i * (w - 200)) / Math.max(1, this.roomPlayers.length - 1);
      const py = h / 2;
      const color = Phaser.Display.Color.HexStringToColor(p.color).color;
      const isHunter = p.id === this.hunterId;
      const sprite = this.add.circle(px, py, isHunter ? 16 : 13, color)
        .setStrokeStyle(isHunter ? 2 : 1, 0xffffff, isHunter ? 0.4 : 0.15)
        .setDepth(5);
      this.playerSprites.set(p.id, sprite);

      const label = this.add.text(px, py - 26, isHunter ? `🔍 ${p.name}` : p.name, {
        fontSize: '9px', fontFamily: 'JetBrains Mono', color: '#f0f0f5',
      }).setOrigin(0.5).setDepth(10);
      this.playerLabels.set(p.id, label);

      this.transformed.set(p.id, false);
    });

    // Hunter search radius indicator
    this.hunterCheckRadius = this.add.circle(0, 0, 50, 0xf87171, 0)
      .setStrokeStyle(1, 0xf87171, 0).setDepth(4);

    // Hunter blind screen
    this.hunterBlind = this.add.rectangle(w / 2, h / 2, w, h, 0x080810, 0.94).setDepth(100);
    this.hunterBlindText = this.add.text(w / 2, h / 2, '', {
      fontSize: '18px', fontFamily: 'Syne', color: '#6c63ff', align: 'center',
    }).setOrigin(0.5).setDepth(101);

    this.statusText = this.add.text(w / 2, 24, '', {
      fontSize: '12px', fontFamily: 'JetBrains Mono', color: '#fbbf24',
    }).setOrigin(0.5).setDepth(20);

    this.phase = 'hiding';
    this.phaseTimer = 30000;
  }

  update(_time: number, delta: number) {
    if (this.finished) return;

    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);
    const dt = delta / 1000;

    if (this.phase === 'hiding') {
      this.phaseTimer -= delta;
      const secs = Math.ceil(this.phaseTimer / 1000);
      this.statusText.setText(`HIDING PHASE — ${secs}s`);
      this.hunterBlindText.setText(`🔍 Hunter is blindfolded\nProps are hiding...\n\n${secs}s remaining`);

      // Props can move and transform
      this.propIds.forEach(id => {
        if (this.eliminated.has(id)) return;
        const inp = this.inputMap[id] || { x: 0, y: 0, buttonA: false, buttonB: false };
        const sprite = this.playerSprites.get(id)!;
        sprite.x = Phaser.Math.Clamp(sprite.x + inp.x * 180 * dt, 55, w - 55);
        sprite.y = Phaser.Math.Clamp(sprite.y + inp.y * 180 * dt, 55, h - 55);
        this.playerLabels.get(id)?.setPosition(sprite.x, sprite.y - 26);

        if (inp.buttonB && !this.transformed.get(id)) {
          this.transformed.set(id, true);
          sprite.setAlpha(0);
          playTransform();
          const emoji = PROP_EMOJIS[Math.floor(Math.random() * PROP_EMOJIS.length)];
          const propText = this.add.text(sprite.x, sprite.y, emoji, {
            fontSize: `${24 + Math.random() * 8}px`,
          }).setOrigin(0.5).setDepth(3);
          this.propEmojis.set(id, propText);
          this.playerLabels.get(id)?.setVisible(false);
        }
      });

      if (this.phaseTimer <= 0) {
        this.phase = 'seeking';
        this.seekTimer = 90000;
        this.hunterBlind.setVisible(false);
        this.hunterBlindText.setVisible(false);
        this.statusText.setColor('#f87171');
      }
    } else {
      // Seeking phase
      this.seekTimer -= delta;
      const aliveProps = this.propIds.filter(id => !this.eliminated.has(id));
      const secs = Math.ceil(this.seekTimer / 1000);
      this.statusText.setText(`SEEKING — ${secs}s — ${aliveProps.length} prop${aliveProps.length !== 1 ? 's' : ''} remaining`);

      // Hunter moves
      const hInp = this.inputMap[this.hunterId] || { x: 0, y: 0, buttonA: false, buttonB: false };
      const hs = this.playerSprites.get(this.hunterId)!;
      hs.x = Phaser.Math.Clamp(hs.x + hInp.x * 220 * dt, 55, w - 55);
      hs.y = Phaser.Math.Clamp(hs.y + hInp.y * 220 * dt, 55, h - 55);
      this.playerLabels.get(this.hunterId)?.setPosition(hs.x, hs.y - 26);

      // Hunter scan radius visual
      this.hunterCheckRadius.setPosition(hs.x, hs.y);

      // Props waddle
      this.propIds.forEach(id => {
        if (this.eliminated.has(id)) return;
        const inp = this.inputMap[id] || { x: 0, y: 0 };
        const sprite = this.playerSprites.get(id)!;
        const spd = this.transformed.get(id) ? 40 : 160;
        sprite.x = Phaser.Math.Clamp(sprite.x + inp.x * spd * dt, 55, w - 55);
        sprite.y = Phaser.Math.Clamp(sprite.y + inp.y * spd * dt, 55, h - 55);
        this.playerLabels.get(id)?.setPosition(sprite.x, sprite.y - 26);
        this.propEmojis.get(id)?.setPosition(sprite.x, sprite.y);
      });

      // Hunter check
      this.checkCooldown -= delta;
      if (hInp.buttonA && this.checkCooldown <= 0) {
        this.checkCooldown = 600;

        // Scan pulse
        this.hunterCheckRadius.setStrokeStyle(2, 0xf87171, 0.5);
        this.hunterCheckRadius.setFillStyle(0xf87171, 0.05);
        this.scanPulse = 300;

        let foundAny = false;
        this.propIds.forEach(id => {
          if (this.eliminated.has(id)) return;
          const ps = this.playerSprites.get(id)!;
          const dist = Phaser.Math.Distance.Between(hs.x, hs.y, ps.x, ps.y);
          if (dist < 50) {
            this.eliminated.add(id);
            ps.setAlpha(0);
            this.propEmojis.get(id)?.setAlpha(0.15);
            playEliminate();
            this.cameras.main.shake(100, 0.005);
            foundAny = true;

            // Elimination effect
            const fx = this.add.text(ps.x, ps.y, '❌', { fontSize: '28px' }).setOrigin(0.5).setDepth(15);
            this.tweens.add({ targets: fx, alpha: 0, y: ps.y - 30, duration: 800 });
          }
        });

        if (!foundAny) {
          // Miss indicator
          const miss = this.add.text(hs.x, hs.y - 30, 'MISS', {
            fontSize: '10px', fontFamily: 'JetBrains Mono', color: '#f87171',
          }).setOrigin(0.5).setDepth(15);
          this.tweens.add({ targets: miss, alpha: 0, y: hs.y - 50, duration: 600 });
        }
      }

      // Fade scan pulse
      if (this.scanPulse > 0) {
        this.scanPulse -= delta;
        if (this.scanPulse <= 0) {
          this.hunterCheckRadius.setStrokeStyle(1, 0xf87171, 0);
          this.hunterCheckRadius.setFillStyle(0xf87171, 0);
        }
      }

      // Win checks
      if (aliveProps.length === 0) {
        this.endGame(this.roomPlayers.find(p => p.id === this.hunterId)?.name || 'Hunter', 'hunter');
      } else if (this.seekTimer <= 0) {
        this.endGame('Props', 'props');
      }
    }
  }

  endGame(winner: string, _side: string) {
    this.finished = true;
    playVictory();
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);

    this.add.rectangle(w / 2, h / 2, w, h, 0x080810, 0.5).setDepth(50);
    this.add.text(w / 2, h / 2, `${winner} win${winner === 'Props' ? '' : 's'}! 🏆`, {
      fontSize: '24px', fontFamily: 'Syne', color: '#6c63ff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(51);

    const scores: Record<string, number> = {};
    this.roomPlayers.forEach(p => { scores[p.name] = this.eliminated.has(p.id) ? 0 : 1; });
    this.time.delayedCall(3000, () => this.onGameOver(winner, scores));
  }
}
