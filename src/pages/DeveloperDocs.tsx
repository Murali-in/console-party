import Navbar from '@/components/Navbar';
import { Link } from 'react-router-dom';

const ENGINES = [
  {
    id: 'html5',
    name: 'HTML5 / Phaser',
    icon: '🌐',
    desc: 'Build with any HTML5 game framework — Phaser, PixiJS, Three.js, or vanilla Canvas/WebGL.',
    steps: [
      'Build your game as a standard web page (index.html + assets)',
      'Include the Eternity SDK script in your HTML',
      'Use EC.onMessage() to receive controller inputs',
      'Use EC.broadcast() to send game state to controllers',
      'Zip your build folder and upload to the developer portal',
    ],
    code: `<script src="https://sdk.eternityconsole.com/v1/eternity-sdk.js"></script>
<script>
  const ec = new EternitySDK();
  
  ec.onReady((roomCode, players) => {
    console.log('Game ready! Room:', roomCode);
    startGame(players);
  });
  
  ec.onMessage((playerId, data) => {
    // data = { up, down, left, right, btnA, btnB }
    handleInput(playerId, data);
  });
  
  ec.broadcast({ type: 'score-update', scores });
</script>`,
  },
  {
    id: 'unity',
    name: 'Unity WebGL',
    icon: '🎮',
    desc: 'Export your Unity project as WebGL and integrate with Eternity Console using our .jslib plugin.',
    steps: [
      'Download EternitySDK.jslib from the developer portal',
      'Place it in Assets/Plugins/WebGL/ in your Unity project',
      'Create an EternityManager MonoBehaviour on a GameObject',
      'Build your project: File → Build Settings → WebGL',
      'Zip the WebGL output folder and upload to the portal',
    ],
    code: `// EternityManager.cs
using UnityEngine;
using System.Runtime.InteropServices;

public class EternityManager : MonoBehaviour {
    [DllImport("__Internal")]
    private static extern void Eternity_Init();
    
    void Start() {
        #if UNITY_WEBGL && !UNITY_EDITOR
        Eternity_Init();
        #endif
    }
    
    // Called by JS bridge
    void OnPlayerJoin(string playerJson) {
        var player = JsonUtility.FromJson<PlayerData>(playerJson);
        SpawnPlayer(player);
    }
    
    void OnMessage(string msgJson) {
        // Parse controller input
        var msg = JsonUtility.FromJson<InputData>(msgJson);
        ApplyInput(msg.from, msg.data);
    }
}`,
  },
  {
    id: 'godot',
    name: 'Godot Engine',
    icon: '🤖',
    desc: 'Godot exports to HTML5/WebAssembly natively. Add our SDK as an autoload singleton.',
    steps: [
      'Export your Godot project: Export → HTML5 → Export Project',
      'Download EternitySdk.gd from the developer portal',
      'Add it as an Autoload in Project → Project Settings → Autoload',
      'Call EternitySdk.set_ready() in your main scene _ready()',
      'Zip the exported folder and upload to the portal',
    ],
    code: `# eternity_sdk.gd — Autoload singleton
extends Node

signal player_joined(player_data)
signal message_received(from_id, data)

func _ready():
    # Bridge to JavaScript SDK
    JavaScript.eval("""
        window.addEventListener('message', function(e) {
            if (e.data.type === 'EC_MESSAGE') {
                Module.ccall('handle_message', null,
                    ['string'], [JSON.stringify(e.data)]);
            }
        });
        window.parent.postMessage({type:'EC_SDK_LOADED'}, '*');
    """)

func broadcast(data: Dictionary):
    var json = JSON.stringify(data)
    JavaScript.eval(
        "window.parent.postMessage({type:'EC_BROADCAST',data:" + json + "},'*')"
    )`,
  },
  {
    id: 'unreal',
    name: 'Unreal Engine',
    icon: '⚙️',
    desc: 'Use Pixel Streaming or HTML5 export with our JavaScript bridge for Unreal integration.',
    steps: [
      'Install the HTML5 platform plugin (community fork)',
      'Package your project for HTML5',
      'Download eternity-unreal-bridge.js from the portal',
      'Add the bridge script to the generated index.html',
      'Zip the packaged output and upload to the portal',
    ],
    code: `// eternity-unreal-bridge.js
// Add to your generated HTML5 index.html before </body>

window.addEventListener('message', function(event) {
    var msg = event.data;
    if (!msg || !msg.type || !msg.type.startsWith('EC_')) return;
    if (window.ue && window.ue.interface) {
        window.ue.interface.broadcast(
            'EternityMessage', JSON.stringify(msg)
        );
    }
});

window.parent.postMessage({ type: 'EC_SDK_LOADED' }, '*');

function EternitySend(to, dataJson) {
    window.parent.postMessage({
        type: 'EC_MESSAGE', to: to,
        data: JSON.parse(dataJson)
    }, '*');
}`,
  },
];

export default function DeveloperDocs() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-6 max-w-4xl mx-auto">
        <div className="space-y-2 mb-12">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">Developer Platform</p>
          <h1 className="font-heading text-3xl font-bold text-foreground">Build for Eternity Console</h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Publish your game on Eternity Console. Players use their phones as controllers —
            you just handle the game logic. We handle rooms, connections, and input delivery.
          </p>
        </div>

        {/* How it works */}
        <div className="p-6 rounded-[10px] border border-border bg-card mb-12 space-y-4">
          <h2 className="font-heading text-lg font-semibold text-foreground">How Integration Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="text-primary font-mono text-xs">01</div>
              <h3 className="font-heading text-sm font-semibold text-foreground">Build your game</h3>
              <p className="text-xs text-muted-foreground">Use any engine that exports to HTML5/WebGL. Your game runs in an iframe on the host screen.</p>
            </div>
            <div className="space-y-2">
              <div className="text-primary font-mono text-xs">02</div>
              <h3 className="font-heading text-sm font-semibold text-foreground">Add our SDK</h3>
              <p className="text-xs text-muted-foreground">Include the Eternity SDK to receive player joins, controller inputs, and send game state updates.</p>
            </div>
            <div className="space-y-2">
              <div className="text-primary font-mono text-xs">03</div>
              <h3 className="font-heading text-sm font-semibold text-foreground">Upload & publish</h3>
              <p className="text-xs text-muted-foreground">Zip your build, upload to our portal. After review, your game goes live to all Eternity players.</p>
            </div>
          </div>
        </div>

        {/* Engine guides */}
        <div className="space-y-8">
          {ENGINES.map(engine => (
            <div key={engine.id} className="rounded-[10px] border border-border bg-card overflow-hidden">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{engine.icon}</span>
                  <div>
                    <h2 className="font-heading text-lg font-semibold text-foreground">{engine.name}</h2>
                    <p className="text-xs text-muted-foreground">{engine.desc}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-mono text-xs text-primary uppercase tracking-wider">Steps</h3>
                  <ol className="space-y-1.5">
                    {engine.steps.map((step, i) => (
                      <li key={i} className="flex gap-3 text-xs text-muted-foreground">
                        <span className="text-primary font-mono font-bold shrink-0">{i + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="space-y-2">
                  <h3 className="font-mono text-xs text-primary uppercase tracking-wider">Example Code</h3>
                  <pre className="bg-background rounded-lg p-4 overflow-x-auto text-[11px] font-mono text-foreground/80 border border-border">
                    {engine.code}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 p-6 rounded-[10px] border border-primary/20 bg-primary/5 text-center space-y-3">
          <h2 className="font-heading text-xl font-semibold text-foreground">Ready to publish?</h2>
          <p className="text-sm text-muted-foreground">Submit your game for review. Once approved, it goes live to all Eternity Console players.</p>
          <Link
            to="/contribute"
            className="inline-block bg-primary text-primary-foreground font-heading font-semibold px-6 py-2.5 rounded-lg text-sm hover:opacity-90 transition-opacity"
          >
            Submit Your Game →
          </Link>
        </div>
      </div>
    </div>
  );
}
