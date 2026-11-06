import { useEffect, useRef, useSyncExternalStore } from "react";
import { Backpack, CircleHelp, Shield, Sparkles, UserRound, Volume2, VolumeX, X } from "lucide-react";
import { loadAll } from "@/game/assets";
import { setMusicOn, setTrack, sfxClick, tick, trackTitle, unlock } from "@/game/audio";
import {
  GEAR_SLOTS,
  HAIR_COLORS,
  ITEMS,
  JOBS,
  OUTFIT_STOCK,
  SKILLS,
  SLOT_LABEL,
  SMITH_STOCK,
  STYLES,
  SUPPLY_STOCK,
  TRIMS,
  MAX_BASE,
  MAX_JOB,
  MONSTERS,
  expNeed,
  getMap,
  itemStats,
  jobExpNeed,
  sellPrice,
} from "@/game/content";
import { drawItemIcon, drawPreview, renderFrame } from "@/game/draw";
import { castSkill, holdMove, installProbe, pickAt, pointerDown, step } from "@/game/sim";
import type { GearSlot, HotSlot, Player, SkillId } from "@/game/types";
import {
  addStat,
  advanceDialog,
  beginNew,
  bootClient,
  bump,
  buyPrice as priceOf,
  continueGame,
  derive,
  doAction,
  equipFromInventory,
  getRev,
  learnSkill,
  moveStorage,
  persist,
  setHotbar,
  stashToHotbar,
  subscribe,
  togglePanel,
  tryBuy,
  trySell,
  unequip,
  useStack,
  world,
  INV_CAP,
} from "@/game/world";

function typingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

function pressHotbar(index: number) {
  const p = world.player;
  if (!p) return;
  const slot = p.hotbar[index];
  if (!slot) return;
  if (slot.kind === "skill") castSkill(slot.id);
  else {
    const idx = p.inv.findIndex((s) => s.itemId === slot.id);
    if (idx >= 0) useStack(idx);
  }
  bump();
}

function Icon({ id }: { id: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const item = ITEMS[id];
    const ctx = canvas?.getContext("2d");
    if (!canvas || !item || !ctx) return;
    ctx.clearRect(0, 0, 64, 64);
    drawItemIcon(ctx, item, 0, 0, 64);
  }, [id]);
  return <canvas ref={ref} width={64} height={64} className="h-8 w-8" />;
}

function LookCanvas({ who }: { who: "draft" | "player" }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let frame = 0;
    const loop = () => {
      const canvas = ref.current;
      if (canvas) {
        const blank = {
          headUpper: null,
          headMid: null,
          headLower: null,
          armor: "cotton-shirt",
          weapon: "worn-knife",
          shield: null,
          garment: null,
          shoes: "worn-shoes",
          acc1: null,
          acc2: null,
        } as Player["eq"];
        if (who === "player" && world.player) drawPreview(canvas, world.player);
        else
          drawPreview(canvas, {
            ...world.draft,
            dir: 0,
            eq: blank,
          });
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [who]);
  return <canvas ref={ref} className="h-52 w-full" />;
}

function Swatches({
  colors,
  value,
  onPick,
}: {
  colors: readonly { id: string; label: string; hex: string }[];
  value: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((c) => (
        <button
          key={c.id}
          type="button"
          aria-label={c.label}
          title={c.label}
          onClick={() => onPick(c.id)}
          className={`h-11 w-11 rounded-full border-2 ${value === c.id ? "border-gold" : "border-line"}`}
          style={{ background: c.hex }}
        />
      ))}
    </div>
  );
}

export function GameApp() {
  const rev = useSyncExternalStore(subscribe, getRev, getRev);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const started = useRef(false);

  useEffect(() => {
    bootClient();
    installProbe();
    void loadAll()
      .then(() => {
        world.assetsReady = true;
        bump();
      })
      .catch(() => {
        world.loadError = "The plaza art failed to load.";
        bump();
      });

    let raf = 0;
    let last = performance.now();
    let ui = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const canvas = canvasRef.current;
      const parent = canvas?.parentElement;
      if (canvas && parent) {
        const cssW = parent.clientWidth;
        const cssH = parent.clientHeight;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        world.viewW = cssW;
        world.viewH = cssH;
        world.dpr = dpr;
        const bw = Math.floor(cssW * dpr);
        const bh = Math.floor(cssH * dpr);
        if (canvas.width !== bw || canvas.height !== bh) {
          canvas.width = bw;
          canvas.height = bh;
        }
        world.time += dt;
        if (world.screen === "play") step(dt);
        if (started.current) {
          const kind = world.screen === "play" && world.mapId !== "ambercross" ? "field" : "town";
          setTrack(kind);
          tick();
        }
        renderFrame(canvas, dt);
        ui += dt;
        world.saveAcc += world.screen === "play" ? dt : 0;
        if (ui > 0.25) {
          ui = 0;
          bump();
        }
        if (world.saveAcc > 8) {
          world.saveAcc = 0;
          persist();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const down = (e: KeyboardEvent) => {
      if (typingTarget(e.target)) return;
      world.keys.add(e.code);
      if (e.repeat) return;
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
      if (world.screen !== "play") return;
      if (e.code === "KeyI") togglePanel("inv");
      if (e.code === "KeyC") togglePanel("status");
      if (e.code === "KeyE") togglePanel("equip");
      if (e.code === "KeyK") togglePanel("skills");
      if (e.code === "KeyH") togglePanel("help");
      if (e.code === "KeyR" && world.player) {
        world.player.sit = !world.player.sit;
        world.player.sit && (world.path = []);
        bump();
      }
      if (e.code === "Escape") {
        world.dialog = null;
        world.shop = null;
        world.storageOpen = false;
        for (const key of Object.keys(world.panels) as (keyof typeof world.panels)[]) world.panels[key] = false;
        bump();
      }
      if (e.code === "Enter") {
        if (world.dialog) advanceDialog();
        else document.querySelector<HTMLInputElement>("[data-say='1']")?.focus();
      }
      if (e.code.startsWith("Digit")) {
        const n = Number(e.code.slice(5));
        if (n >= 1 && n <= 9) pressHotbar(n - 1);
      }
    };
    const up = (e: KeyboardEvent) => world.keys.delete(e.code);
    const blur = () => world.keys.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  const screen = world.screen;
  const player = world.player;
  const map = getMap(world.mapId);
  void rev;

  const wake = () => {
    unlock();
    started.current = true;
    setTrack("town");
    sfxClick();
  };

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <div className="absolute inset-0">
        <canvas
          ref={canvasRef}
          className="h-full w-full touch-none"
          onPointerDown={(e) => {
            wake();
            if (world.screen !== "play" || !canvasRef.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            pointerDown(e.clientX - rect.left + world.cam.x, e.clientY - rect.top + world.cam.y);
          }}
          onPointerMove={(e) => {
            if (!canvasRef.current || world.screen !== "play") return;
            const rect = canvasRef.current.getBoundingClientRect();
            if (e.buttons & 1) holdMove(e.clientX - rect.left + world.cam.x, e.clientY - rect.top + world.cam.y);
            const hit = pickAt(e.clientX - rect.left + world.cam.x, e.clientY - rect.top + world.cam.y);
            canvasRef.current.style.cursor = hit ? "pointer" : "default";
          }}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>

      {screen !== "play" && <div className="absolute inset-0 bg-bg/25" />}

      {screen === "title" && (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="panel w-full max-w-md p-6">
            <p className="text-xs tracking-[0.22em] text-gold uppercase">Capital plaza</p>
            <h1 className="font-display text-5xl text-gold">Ambercross</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              A small classic online RPG. Start as a Novice, then become a Swordman, Mage, or Archer. The plaza
              plays its own theme; the south field plays another.
            </p>
            <p className="mt-3 text-sm text-fg">Now playing, once you step in: {trackTitle("town")}.</p>
            {world.loadError && <p className="mt-2 text-sm text-hp">{world.loadError}</p>}
            <div className="mt-5 flex flex-col gap-2">
              {world.hasSave && (
                <button
                  type="button"
                  className="rounded-md border border-line bg-surface-2 px-4 py-3 font-medium"
                  onClick={() => {
                    wake();
                    continueGame();
                  }}
                >
                  Continue
                </button>
              )}
              <button
                type="button"
                className="rounded-md bg-gold px-4 py-3 font-medium text-ink"
                onClick={() => {
                  wake();
                  beginNew();
                }}
              >
                Start
              </button>
              <button
                type="button"
                className="rounded-md border border-line px-4 py-3 text-sm"
                onClick={() => {
                  wake();
                  world.screen = "create";
                  bump();
                }}
              >
                Change appearance first
              </button>
            </div>
          </div>
        </div>
      )}

      {screen === "create" && (
        <div className="absolute inset-0 flex items-center justify-center overflow-auto p-4">
          <div className="panel w-full max-w-lg p-4">
            <h2 className="font-display text-3xl text-gold">Appearance</h2>
            <LookCanvas who="draft" />
            <label className="mt-2 block text-sm text-muted">
              Name
              <input
                className="mt-1 w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-fg"
                maxLength={14}
                value={world.draft.name}
                onChange={(e) => {
                  world.draft.name = e.target.value;
                  bump();
                }}
              />
            </label>
            <p className="mt-3 text-sm text-muted">Hair style</p>
            <div className="mt-1 flex gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`rounded-md border px-3 py-2 text-sm ${world.draft.style === s.id ? "border-gold bg-surface-2" : "border-line"}`}
                  onClick={() => {
                    world.draft.style = s.id;
                    bump();
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted">Hair color</p>
            <Swatches
              colors={HAIR_COLORS}
              value={world.draft.hair}
              onPick={(id) => {
                world.draft.hair = id;
                bump();
              }}
            />
            <p className="mt-3 text-sm text-muted">Trim</p>
            <Swatches
              colors={TRIMS}
              value={world.draft.trim}
              onPick={(id) => {
                world.draft.trim = id;
                bump();
              }}
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="rounded-md border border-line px-3 py-2"
                onClick={() => {
                  world.screen = "title";
                  bump();
                }}
              >
                Back
              </button>
              <button
                type="button"
                className="flex-1 rounded-md bg-gold px-4 py-3 font-medium text-ink"
                onClick={() => {
                  wake();
                  beginNew();
                }}
              >
                Enter Ambercross
              </button>
            </div>
          </div>
        </div>
      )}

      {screen === "play" && player && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
            <div className="pointer-events-auto min-w-0 max-w-[46%] rounded-md bg-surface/90 px-3 py-2 sm:max-w-sm">
              <p className="truncate font-display text-xl leading-none text-gold">{map.name}</p>
              <p className="truncate text-xs text-muted">
                {map.subtitle}
                {map.levels ? ` · ${map.levels}` : ""}
              </p>
              <p className="truncate text-xs text-muted">
                {trackTitle(map.music)} · Base {player.baseLevel} {JOBS[player.job].name} {player.jobLevel}
              </p>
            </div>
            <div className="pointer-events-auto flex max-w-[52%] flex-wrap justify-end gap-1 sm:max-w-none">
              <IconBtn label="Status (C)" onClick={() => togglePanel("status")}>
                <UserRound />
              </IconBtn>
              <IconBtn label="Equipment (E)" onClick={() => togglePanel("equip")}>
                <Shield />
              </IconBtn>
              <IconBtn label="Bag (I)" onClick={() => togglePanel("inv")}>
                <Backpack />
              </IconBtn>
              <IconBtn label="Skills (K)" onClick={() => togglePanel("skills")}>
                <Sparkles />
              </IconBtn>
              <IconBtn label="Help (H)" onClick={() => togglePanel("help")}>
                <CircleHelp />
              </IconBtn>
              <IconBtn
                label="Music"
                onClick={() => {
                  world.musicOn = !world.musicOn;
                  setMusicOn(world.musicOn);
                  bump();
                }}
              >
                {world.musicOn ? <Volume2 /> : <VolumeX />}
              </IconBtn>
            </div>
          </div>

          <TargetCard />

          <div className="pointer-events-none absolute top-40 right-3 left-3 flex flex-col gap-1 sm:top-auto sm:bottom-28 sm:left-3 sm:max-w-xs">
            <Meter label="HP" value={player.hp} max={derive(player).maxHp} bar="bg-hp" track="bg-hp-deep" />
            <Meter label="SP" value={player.sp} max={derive(player).maxSp} bar="bg-sp" track="bg-sp-deep" />
            <Meter
              label={`Base Lv ${player.baseLevel}${player.baseLevel >= MAX_BASE ? " (max)" : ""}`}
              value={player.baseLevel >= MAX_BASE ? 1 : player.baseExp}
              max={player.baseLevel >= MAX_BASE ? 1 : expNeed(player.baseLevel)}
              bar="bg-exp"
              track="bg-surface-2"
            />
            <Meter
              label={`Job Lv ${player.jobLevel}${player.jobLevel >= MAX_JOB ? " (max)" : ""}`}
              value={player.jobLevel >= MAX_JOB ? 1 : player.jobExp}
              max={player.jobLevel >= MAX_JOB ? 1 : jobExpNeed(player.jobLevel)}
              bar="bg-sp"
              track="bg-surface-2"
            />
            <div className="flex justify-between text-xs text-muted">
              <span>{player.marks.toLocaleString()} z</span>
              <span>
                {player.quest === "active" ? `Dewdrops ${player.questCount}/6` : player.quest === "done" ? "Return to Maela" : ""}
              </span>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-16 flex justify-center px-2">
            <div className="pointer-events-auto max-w-[18rem] text-xs text-muted">
              {world.logs.slice(-3).map((line, i) => (
                <p key={`${line}-${i}`} className="truncate">
                  {line}
                </p>
              ))}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center gap-2 px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))]">
            <div className="pointer-events-auto flex max-w-full gap-1 overflow-x-auto">
              {player.hotbar.map((slot, i) => (
                <button
                  key={i}
                  type="button"
                  className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-md border border-line bg-surface text-[10px]"
                  onClick={() => pressHotbar(i)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setHotbar(i, null);
                  }}
                >
                  {slot ? <HotFace slot={slot} /> : <span className="text-muted">{i + 1}</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="touch-only pointer-events-auto absolute bottom-24 left-3 h-28 w-28 place-items-center rounded-full border border-line bg-surface/80">
            <Stick />
          </div>
          <button
            type="button"
            className="touch-only pointer-events-auto absolute right-3 bottom-28 h-16 w-16 place-items-center rounded-full bg-gold text-sm font-medium text-ink"
            onPointerDown={() => {
              world.touch.attack = true;
            }}
            onPointerUp={() => {
              world.touch.attack = false;
            }}
            onPointerLeave={() => {
              world.touch.attack = false;
            }}
          >
            Hit
          </button>

          <div className="pointer-events-none absolute inset-x-2 top-24 bottom-24 flex flex-wrap content-start justify-center gap-2 overflow-auto">
            {world.panels.status && player && <StatusWindow />}
            {world.panels.equip && <EquipWindow />}
            {world.panels.inv && <BagWindow />}
            {world.panels.skills && <SkillWindow />}
            {world.panels.help && <HelpWindow />}
            {world.shop && <ShopWindow />}
            {world.storageOpen && <StorageWindow />}
          </div>

          {world.dialog && (
            <div className="absolute inset-x-0 bottom-24 z-30 mx-auto w-full max-w-lg px-3">
              <div className="parchment pointer-events-auto p-4">
                <p className="font-display text-xl">{world.dialog.speaker}</p>
                <p className="mt-2 min-h-12 text-sm leading-relaxed">{world.dialog.lines[world.dialog.index]}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {world.dialog.index < world.dialog.lines.length - 1 || !world.dialog.choices ? (
                    <button type="button" className="rounded-md bg-ink px-3 py-2 text-sm text-parchment" onClick={() => advanceDialog()}>
                      Next
                    </button>
                  ) : (
                    world.dialog.choices.map((c) => (
                      <button
                        key={c.action + c.label}
                        type="button"
                        className="rounded-md bg-ink px-3 py-2 text-sm text-parchment"
                        onClick={() => doAction(c.action)}
                      >
                        {c.label}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          <form
            className="pointer-events-auto absolute top-20 left-3 hidden sm:block"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const text = String(data.get("say") ?? "").slice(0, 60);
              if (text) {
                world.say = text;
                world.sayUntil = world.time + 4;
              }
              e.currentTarget.reset();
            }}
          >
            <input
              name="say"
              data-say="1"
              placeholder="Say"
              className="w-40 rounded-md border border-line bg-surface px-2 py-1 text-sm"
            />
          </form>
        </>
      )}

      {world.bannerUntil > world.time && (
        <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 font-display text-4xl text-gold">
          {world.banner}
        </div>
      )}
    </main>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-11 w-11 place-items-center rounded-md border border-line bg-surface text-fg"
    >
      <span className="size-5">{children}</span>
    </button>
  );
}

function TargetCard() {
  const p = world.player;
  const m = world.monsters.find((x) => x.id === world.targetId && x.alive);
  if (!p || !m) return null;
  const st = MONSTERS[m.kind];
  if (!st) return null;
  const gap = st.level - p.baseLevel;
  const tone = gap >= 6 ? "text-hp" : gap >= 2 ? "text-gold" : "text-muted";
  return (
    <div className="pointer-events-none absolute top-16 left-1/2 w-60 -translate-x-1/2 rounded-md bg-surface/90 px-3 py-2 sm:top-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-display text-lg leading-none text-fg">{st.name}</span>
        <span className={`text-xs ${tone}`}>Lv {st.level}</span>
      </div>
      <p className="text-[10px] text-muted">{st.tag}</p>
      <div className="bar bg-hp-deep mt-1">
        <div className="h-full bg-hp" style={{ width: `${Math.max(0, (m.hp / m.maxHp) * 100)}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>
          {Math.ceil(m.hp)}/{m.maxHp} HP
        </span>
        <span>
          {st.exp} / {st.jexp} EXP
        </span>
      </div>
      <p className="mt-1 truncate text-[10px] text-muted">
        Drops: {st.drops.filter((d) => d.rate >= 1 && ITEMS[d.id]).slice(0, 4).map((d) => `${ITEMS[d.id]!.name} ${d.rate}%`).join(", ")}
      </p>
    </div>
  );
}

function Meter({ label, value, max, bar, track }: { label: string; value: number; max: number; bar: string; track: string }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className="pointer-events-none w-52">
      <div className="flex justify-between text-[11px] text-fg">
        <span>{label}</span>
        <span>
          {Math.ceil(value)}/{Math.ceil(max)}
        </span>
      </div>
      <div className={`bar ${track}`}>
        <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function HotFace({ slot }: { slot: HotSlot }) {
  if (slot.kind === "skill") {
    const sk = SKILLS[slot.id];
    const short: Record<string, string> = {
      firstAid: "Aid",
      playDead: "Dead",
      arcCut: "Bash",
      guard: "Endure",
      ringCut: "Magnum",
      spark: "Bolt",
      ember: "Ball",
      twin: "Strafe",
      focus: "Focus",
      crush: "Bowling",
      frost: "Cold",
      storm: "Storm",
      shower: "Shower",
    };
    return <span className="px-0.5 text-center leading-tight">{sk ? (short[slot.id] ?? sk.name) : slot.id}</span>;
  }
  return <Icon id={slot.id} />;
}

function Window({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <section className="panel pointer-events-auto flex max-h-full w-[min(100%,24rem)] flex-col">
      <header className="flex items-center justify-between border-b border-line px-3 py-2">
        <h2 className="font-display text-xl text-gold">{title}</h2>
        <button type="button" aria-label="Close" onClick={onClose}>
          <X className="size-5" />
        </button>
      </header>
      <div className="overflow-y-auto p-3">{children}</div>
    </section>
  );
}

function StatusWindow() {
  const p = world.player;
  if (!p) return null;
  const d = derive(p);
  const rows: { key: "str" | "agi" | "vit" | "int" | "dex" | "luk"; label: string; val: number }[] = [
    { key: "str", label: "STR", val: d.str },
    { key: "agi", label: "AGI", val: d.agi },
    { key: "vit", label: "VIT", val: d.vit },
    { key: "int", label: "INT", val: d.int },
    { key: "dex", label: "DEX", val: d.dex },
    { key: "luk", label: "LUK", val: d.luk },
  ];
  return (
    <Window title="Status" onClose={() => togglePanel("status")}>
      <p className="text-sm text-muted">
        {p.name} · {JOBS[p.job].name} · points {p.statPoints}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between rounded-md bg-surface-2 px-2 py-1">
            <span className="text-sm">
              {row.label} {row.val}
            </span>
            <button type="button" className="h-11 w-11 rounded-md bg-gold text-lg text-ink" disabled={p.statPoints <= 0} onClick={() => addStat(row.key)}>
              +
            </button>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        ATK {d.atk} · MATK {d.matk} · DEF {d.def} · HIT {d.hit} · FLEE {d.flee} · CRIT {d.crit.toFixed(0)}% · delay {d.aspd.toFixed(2)}s
      </p>
    </Window>
  );
}

function EquipWindow() {
  const p = world.player;
  if (!p) return null;
  const left: GearSlot[] = ["headUpper", "headMid", "headLower", "armor", "weapon", "shield"];
  const right: GearSlot[] = ["garment", "shoes", "acc1", "acc2"];
  return (
    <Window title="Equipment" onClose={() => togglePanel("equip")}>
      <div className="grid grid-cols-[5.5rem_1fr_5.5rem] gap-2">
        <div className="flex flex-col gap-1">
          {left.map((slot) => (
            <Slot key={slot} slot={slot} id={p.eq[slot]} />
          ))}
        </div>
        <LookCanvas who="player" />
        <div className="flex flex-col gap-1">
          {right.map((slot) => (
            <Slot key={slot} slot={slot} id={p.eq[slot]} />
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted">Click a worn piece to take it off. Two accessory slots sit on the right.</p>
      <p className="mt-3 text-sm text-muted">Hair</p>
      <div className="mt-1 flex gap-2">
        {STYLES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`rounded-md border px-2 py-1 text-xs ${p.style === s.id ? "border-gold" : "border-line"}`}
            onClick={() => {
              p.style = s.id;
              persist();
              bump();
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="mt-2">
        <Swatches
          colors={HAIR_COLORS}
          value={p.hair}
          onPick={(id) => {
            p.hair = id;
            persist();
            bump();
          }}
        />
      </div>
      <p className="mt-2 text-sm text-muted">Trim</p>
      <Swatches
        colors={TRIMS}
        value={p.trim}
        onPick={(id) => {
          p.trim = id;
          persist();
          bump();
        }}
      />
    </Window>
  );
}

function Slot({ slot, id }: { slot: GearSlot; id: string | null }) {
  const item = id ? ITEMS[id] : undefined;
  return (
    <button type="button" className="rounded-md border border-line bg-surface-2 p-1 text-left" onClick={() => unequip(slot)}>
      <span className="block text-[10px] text-muted">{SLOT_LABEL[slot]}</span>
      {item ? <Icon id={item.id} /> : <span className="block h-8" />}
    </button>
  );
}

function BagWindow() {
  const p = world.player;
  if (!p) return null;
  return (
    <Window title={`Bag ${p.inv.length}/${INV_CAP}`} onClose={() => togglePanel("inv")}>
      <div className="grid grid-cols-4 gap-2">
        {p.inv.map((stack, i) => {
          const item = ITEMS[stack.itemId];
          if (!item) return null;
          return (
            <button key={`${stack.itemId}-${i}`} type="button" title={`${item.name}: ${item.desc} ${itemStats(item)} · sells for ${sellPrice(item)}z`} className="rounded-md border border-line p-1 text-left" onClick={() => equipFromInventory(i)}>
              <Icon id={item.id} />
              <span className="block truncate text-[10px]">
                {item.name}
                {stack.qty > 1 ? ` ×${stack.qty}` : ""}
              </span>
            </button>
          );
        })}
      </div>
      {p.inv.length === 0 && <p className="text-sm text-muted">Empty. Defeat monsters and walk over their drops to collect them.</p>}
      <p className="mt-2 text-xs text-muted">Click gear to equip, a salve to drink. Right-click a hotbar slot to clear it.</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {p.inv
          .filter((s) => ITEMS[s.itemId]?.slot === "use")
          .map((s) => (
            <button key={s.itemId} type="button" className="rounded-md border border-line px-2 py-1 text-xs" onClick={() => stashToHotbar(s.itemId)}>
              Hotbar {ITEMS[s.itemId]?.name}
            </button>
          ))}
      </div>
    </Window>
  );
}

function SkillWindow() {
  const p = world.player;
  if (!p) return null;
  const list = (Object.keys(SKILLS) as SkillId[]).filter((id) => SKILLS[id].job === "novice" || SKILLS[id].job === p.job);
  return (
    <Window title="Skills" onClose={() => togglePanel("skills")}>
      <p className="text-sm text-muted">
        Points {p.skillPoints} · {JOBS[p.job].blurb}
      </p>
      <ul className="mt-2 flex flex-col gap-2">
        {list.map((id) => {
          const sk = SKILLS[id];
          const lv = p.skills[id] ?? 0;
          return (
            <li key={id} className="rounded-md bg-surface-2 p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {sk.name} {lv}/{sk.max}
                </span>
                <span className="flex gap-1">
                  {sk.target !== "passive" && lv > 0 && (
                    <button type="button" className="rounded-md border border-line px-2 py-1 text-xs" onClick={() => castSkill(id)}>
                      Use
                    </button>
                  )}
                  <button type="button" className="rounded-md bg-gold px-2 py-1 text-xs text-ink" disabled={lv >= sk.max || p.skillPoints <= 0} onClick={() => learnSkill(id)}>
                    Learn
                  </button>
                </span>
              </div>
              <p className="text-xs text-muted">{sk.blurb}</p>
            </li>
          );
        })}
      </ul>
    </Window>
  );
}

function HelpWindow() {
  return (
    <Window title="How to walk" onClose={() => togglePanel("help")}>
      <ul className="flex flex-col gap-2 text-sm leading-relaxed">
        <li>Click the ground to walk. WASD or arrows move too — A is left, D is right.</li>
        <li>Click a creature to fight. Click a person to talk. Space attacks your target.</li>
        <li>E opens equipment. Ten slots: upper, mid, and lower head, armor, weapon, shield, garment, shoes, and two accessories.</li>
        <li>Hair style, color, and trim can be changed any time in that window.</li>
        <li>Ambercross gates: south to Southmead (then Willow Woods), east to Poring Fields (then Culvert Crypt), west to Sograt Dunes.</li>
        <li>Defeated monsters drop items on the ground. Walk over them to pick them up. Rare drops glow gold. Sell loot to Maela's supply stall for zeny.</li>
        <li>Hold the mouse on the ground to keep walking. Fly Wing teleports on this map; Butterfly Wing returns to Ambercross.</li>
        <li>Seren witnesses a job at base level 4 and job level 4. Wanderers keep First Aid and Play Dead. R rests. 1–9 use the hotbar.</li>
        <li>Ambercross Day plays on the plaza. Southmead has its own tune. Both are original.</li>
      </ul>
    </Window>
  );
}

function ShopWindow() {
  const p = world.player;
  if (!p || !world.shop) return null;
  const stock = world.shop === "smith" ? SMITH_STOCK : world.shop === "outfit" ? OUTFIT_STOCK : SUPPLY_STOCK;
  const title = world.shop === "smith" ? "Calder" : world.shop === "outfit" ? "Nia" : "Supplies";
  return (
    <Window
      title={title}
      onClose={() => {
        world.shop = null;
        bump();
      }}
    >
      <p className="text-xs text-muted">{p.marks.toLocaleString()} zeny</p>
      <ul className="mt-2 flex max-h-72 flex-col gap-1 overflow-auto">
        {stock.map((id) => {
          const item = ITEMS[id];
          if (!item) return null;
          const cost = priceOf(item.price);
          return (
            <li key={id} className="flex items-center gap-2">
              <Icon id={id} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{item.name}</span>
                <span className="block truncate text-[10px] text-muted">{itemStats(item)}</span>
              </span>
              <button type="button" className="rounded-md bg-gold px-2 py-2 text-xs text-ink" onClick={() => tryBuy(id)}>
                {cost}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-sm">Sell</p>
      <ul className="mt-1 flex max-h-48 flex-col gap-1 overflow-auto">
        {p.inv.map((stack, i) => {
          const item = ITEMS[stack.itemId];
          if (!item) return null;
          return (
            <li key={`${stack.itemId}-${i}`} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">
                {item.name}
                {stack.qty > 1 ? ` ×${stack.qty}` : ""}
              </span>
              <button type="button" className="rounded-md border border-line px-2 py-1 text-xs" onClick={() => trySell(i)}>
                {sellPrice(item)}
              </button>
            </li>
          );
        })}
      </ul>
    </Window>
  );
}

function StorageWindow() {
  const p = world.player;
  if (!p) return null;
  return (
    <Window
      title="Storage"
      onClose={() => {
        world.storageOpen = false;
        bump();
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-muted">Bag</p>
          {p.inv.map((s, i) => (
            <button key={`i${i}`} type="button" className="mt-1 block w-full truncate rounded-md border border-line px-2 py-2 text-left text-xs" onClick={() => moveStorage("inv", i)}>
              {ITEMS[s.itemId]?.name} {s.qty > 1 ? `×${s.qty}` : ""}
            </button>
          ))}
        </div>
        <div>
          <p className="text-xs text-muted">Kept</p>
          {p.storage.map((s, i) => (
            <button key={`s${i}`} type="button" className="mt-1 block w-full truncate rounded-md border border-line px-2 py-2 text-left text-xs" onClick={() => moveStorage("storage", i)}>
              {ITEMS[s.itemId]?.name} {s.qty > 1 ? `×${s.qty}` : ""}
            </button>
          ))}
        </div>
      </div>
    </Window>
  );
}

function Stick() {
  const knob = useRef<HTMLSpanElement>(null);
  const move = (clientX: number, clientY: number, el: HTMLDivElement) => {
    const rect = el.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const max = rect.width / 2;
    const len = Math.hypot(dx, dy) || 1;
    const raw = Math.min(1, len / max);
    const mag = raw < 0.18 ? 0 : (raw - 0.18) / 0.82;
    world.touch.x = mag ? (dx / len) * mag : 0;
    world.touch.y = mag ? (dy / len) * mag : 0;
    if (knob.current) {
      knob.current.style.transform = `translate(calc(-50% + ${(dx / len) * mag * 28}px), calc(-50% + ${(dy / len) * mag * 28}px))`;
    }
  };
  return (
    <div
      className="relative h-full w-full"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e.clientX, e.clientY, e.currentTarget);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) move(e.clientX, e.clientY, e.currentTarget);
      }}
      onPointerUp={(e) => {
        world.touch.x = 0;
        world.touch.y = 0;
        if (knob.current) knob.current.style.transform = "translate(-50%, -50%)";
        e.currentTarget.releasePointerCapture(e.pointerId);
      }}
    >
      <span ref={knob} className="absolute top-1/2 left-1/2 h-10 w-10 rounded-full bg-gold" style={{ transform: "translate(-50%, -50%)" }} />
    </div>
  );
}

void priceOf;
void GEAR_SLOTS;
