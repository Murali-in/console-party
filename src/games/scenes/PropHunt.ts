import Phaser from 'phaser';
import type { RoomPlayer } from '@/contexts/RealtimeContext';

interface PropHuntConfig {
  players: RoomPlayer[];
  onGameOver: (winner: string, scores: Record<string, number>) => void;
  inputMap: Record<string, { x: number; y: number; buttonA: boolean; buttonB: boolean }>;
}

const PROP_EMOJIS = ['🪑', '📦', '🪴', '🛢️'];
const PROP_COLORS = [0x8B4513, 0x654321, 0x2d5a27, 0x555555];

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
  private statusText!: Phaser.GameObjects.Text;
  private finished = false;
  private checkCooldown: Map<string, number> = new Map();

  // Scattered decoy props
  private decoyPositions: { x: number; y: number; emoji: string }[] = [];

  constructor(config: PropHuntConfig) {
    super({ key: 'PropHunt' });
    this.roomPlayers = config.players;
    this.onGameOver = config.onGameOver;
    this.inputMap = config.inputMap;
  }

  create() {
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);

    // Room background
    this.add.rectangle(w / 2, h / 2, w - 60, h - 60, 0x120a00, 0.3).setStrokeStyle(1, 0x6c63ff, 0.15);

    // Scatter decoy props around
    for (let i = 0; i < 20; i++) {
      const dx = 60 + Math.random() * (w - 120);
      const dy = 60 + Math.random() * (h - 120);
      const emoji = PROP_EMOJIS[Math.floor(Math.random() * PROP_EMOJIS.length)];
      this.decoyPositions.push({ x: dx, y: dy, emoji });
      this.add.text(dx, dy, emoji, { fontSize: '28px' }).setOrigin(0.5);
    }

    // Assign roles: first player = hunter
    this.hunterId = this.roomPlayers[0].id;
    this.propIds = this.roomPlayers.slice(1).map(p => p.id);

    // Spawn
    this.roomPlayers.forEach((p, i) => {
      const px = 100 + (i * (w - 200)) / Math.max(1, this.roomPlayers.length - 1);
      const py = h / 2;
      const color = Phaser.Display.Color.HexStringToColor(p.color).color;
      const sprite = this.add.circle(px, py, p.id === this.hunterId ? 16 : 14, color);
      this.playerSprites.set(p.id, sprite);

      const label = this.add.text(px, py - 26, p.id === this.hunterId ? `🔍 ${p.name}` : p.name, {
        fontSize: '10px', fontFamily: 'JetBrains Mono', color: '#f0f0f5',
      }).setOrigin(0.5);
      this.playerLabels.set(p.id, label);

      this.transformed.set(p.id, false);
    });

    // Hunter blind screen
    this.hunterBlind = this.add.rectangle(w / 2, h / 2, w, h, 0x080810, 0.92).setDepth(100);
    const blindTxt = this.add.text(w / 2, h / 2, '🔍 Hunter is blindfolded\nProps are hiding...', {
      fontSize: '20px', fontFamily: 'Syne', color: '#6c63ff', align: 'center',
    }).setOrigin(0.5).setDepth(101).setName('blindText');

    this.statusText = this.add.text(w / 2, 20, 'HIDING PHASE — 30s', {
      fontSize: '13px', fontFamily: 'JetBrains Mono', color: '#fbbf24',
    }).setOrigin(0.5);

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
      this.statusText.setText(`HIDING PHASE — ${Math.ceil(this.phaseTimer / 1000)}s`);

      // Props can move and transform
      this.propIds.forEach(id => {
        if (this.eliminated.has(id)) return;
        const inp = this.inputMap[id] || { x: 0, y: 0, buttonA: false, buttonB: false };
        const sprite = this.playerSprites.get(id)!;
        const speed = 160;
        sprite.x = Phaser.Math.Clamp(sprite.x + inp.x * speed * dt, 50, w - 50);
        sprite.y = Phaser.Math.Clamp(sprite.y + inp.y * speed * dt, 50, h - 50);
        this.playerLabels.get(id)?.setPosition(sprite.x, sprite.y - 26);

        // Transform on button B
        if (inp.buttonB && !this.transformed.get(id)) {
          this.transformed.set(id, true);
          sprite.setAlpha(0);
          const emoji = PROP_EMOJIS[Math.floor(Math.random() * PROP_EMOJIS.length)];
          const propText = this.add.text(sprite.x, sprite.y, emoji, { fontSize: '28px' }).setOrigin(0.5);
          this.propEmojis.set(id, propText);
          this.playerLabels.get(id)?.setVisible(false);
        }
      });

      if (this.phaseTimer <= 0) {
        this.phase = 'seeking';
        this.seekTimer = 90000;
        this.hunterBlind.setVisible(false);
        const bt = this.children.getByName('blindText') as Phaser.GameObjects.Text;
        bt?.setVisible(false);
        this.statusText.setColor('#f87171');
      }
    } else {
      // Seeking phase
      this.seekTimer -= delta;
      const aliveProps = this.propIds.filter(id => !this.eliminated.has(id));
      this.statusText.setText(`SEEKING — ${Math.ceil(this.seekTimer / 1000)}s — ${aliveProps.length} props left`);

      // Hunter moves
      const hInp = this.inputMap[this.hunterId] || { x: 0, y: 0, buttonA: false, buttonB: false };
      const hs = this.playerSprites.get(this.hunterId)!;
      hs.x = Phaser.Math.Clamp(hs.x + hInp.x * 200 * dt, 50, w - 50);
      hs.y = Phaser.Math.Clamp(hs.y + hInp.y * 200 * dt, 50, h - 50);
      this.playerLabels.get(this.hunterId)?.setPosition(hs.x, hs.y - 26);

      // Props can waddle slowly
      this.propIds.forEach(id => {
        if (this.eliminated.has(id)) return;
        const inp = this.inputMap[id] || { x: 0, y: 0 };
        const sprite = this.playerSprites.get(id)!;
        const spd = this.transformed.get(id) ? 48 : 160;
        sprite.x = Phaser.Math.Clamp(sprite.x + inp.x * spd * dt, 50, w - 50);
        sprite.y = Phaser.Math.Clamp(sprite.y + inp.y * spd * dt, 50, h - 50);
        this.playerLabels.get(id)?.setPosition(sprite.x, sprite.y - 26);
        this.propEmojis.get(id)?.setPosition(sprite.x, sprite.y);
      });

      // Hunter checks (button A near prop)
      const cd = this.checkCooldown.get(this.hunterId) || 0;
      if (hInp.buttonA && cd <= 0) {
        this.checkCooldown.set(this.hunterId, 500);
        this.propIds.forEach(id => {
          if (this.eliminated.has(id)) return;
          const ps = this.playerSprites.get(id)!;
          const dist = Phaser.Math.Distance.Between(hs.x, hs.y, ps.x, ps.y);
          if (dist < 50) {
            this.eliminated.add(id);
            ps.setAlpha(0);
            this.propEmojis.get(id)?.setAlpha(0.2);
            this.playerLabels.get(id)?.setText('❌').setVisible(true).setAlpha(0.5);
          }
        });
      }
      if (cd > 0) this.checkCooldown.set(this.hunterId, cd - delta);

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
    const w = Number(this.game.config.width);
    const h = Number(this.game.config.height);
    this.add.text(w / 2, h / 2, `${winner} win${winner === 'Props' ? '' : 's'}!`, {
      fontSize: '28px', fontFamily: 'Syne', color: '#6c63ff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(200);

    const scores: Record<string, number> = {};
    this.roomPlayers.forEach(p => { scores[p.name] = this.eliminated.has(p.id) ? 0 : 1; });
    this.time.delayedCall(3000, () => this.onGameOver(winner, scores));
  }
}
