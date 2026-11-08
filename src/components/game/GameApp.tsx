import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Backpack, Crown, CircleHelp, Compass, Shield, SlidersHorizontal, Sparkles, Swords, UserRound, Volume2, VolumeX, X } from "lucide-react";
import { loadAll } from "@/game/assets";
import { setMusicOn, setTrack, sfxClick, tick, trackTitle, unlock } from "@/game/audio";
import {
  GEAR_SLOTS,
  HAIR_COLORS,
  ITEMS,
  JOBS,
  canEquip,
  OUTFIT_STOCK,
  SKILLS,
  SLOT_LABEL,
  SMITH_STOCK,
  STYLES,
  JOB_ORDER,
  skillAvail,
  SUPPLY_STOCK,
  TRIMS,
  MAP_IDS,
  MAX_BASE,
  MAX_JOB,
  MONSTERS,
  expNeed,
  getMap,
  itemStats,
  jobExpNeed,
  sellPrice,
} from "@/game/content";
import { RARITY, rarityOf, weaponNote } from "@/game/gear";
import { drawItemIcon, drawPreview, renderFrame } from "@/game/draw";
import { cancelTravel, castSkill, holdMove, installProbe, pickAt, pointerDown, setAutoBattle, step, travelTo } from "@/game/sim";
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
  autoEquip,
  betaSetJob,
  betaSetLevel,
  resetSkills,
  resetStats,
  junkIndexes,
  sellJunk,
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
            job: "novice",
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
      if (e.code === "KeyB") setAutoBattle(!world.auto.battle);
      if (e.code === "KeyN") togglePanel("nav");
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
            pointerDown((e.clientX - rect.left) / world.zoom + world.cam.x, (e.clientY - rect.top) / world.zoom + world.cam.y);
          }}
          onPointerMove={(e) => {
            if (!canvasRef.current || world.screen !== "play") return;
            const rect = canvasRef.current.getBoundingClientRect();
            if (e.buttons & 1) holdMove((e.clientX - rect.left) / world.zoom + world.cam.x, (e.clientY - rect.top) / world.zoom + world.cam.y);
            const hit = pickAt((e.clientX - rect.left) / world.zoom + world.cam.x, (e.clientY - rect.top) / world.zoom + world.cam.y);
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
            <div className="mt-1 flex flex-wrap gap-2">
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
              <IconBtn label={world.auto.battle ? "Auto Battle ON (B)" : "Auto Battle (B)"} onClick={() => setAutoBattle(!world.auto.battle)} active={world.auto.battle}>
                <Swords />
              </IconBtn>
              <IconBtn label="Auto Battle settings" onClick={() => togglePanel("auto")} active={world.panels.auto}>
                <SlidersHorizontal />
              </IconBtn>
              <IconBtn label="Job change (Beta)" onClick={() => togglePanel("beta")} active={world.panels.beta}>
                <Crown />
              </IconBtn>
              <IconBtn label="Auto Navigation (N)" onClick={() => togglePanel("nav")} active={Boolean(world.auto.travel)}>
                <Compass />
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
          <AutoChip />

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
            {world.panels.nav && <NavWindow />}
            {world.panels.auto && <AutoWindow />}
            {world.panels.beta && <BetaWindow />}
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

function IconBtn({ label, onClick, children, active }: { label: string; onClick: () => void; children: React.ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid h-11 w-11 place-items-center rounded-md border border-line text-fg ${active ? "bg-job text-ink" : "bg-surface"}`}
    >
      <span className="size-5">{children}</span>
    </button>
  );
}

function BetaWindow() {
  const p = world.player;
  if (!p) return null;
  const groups: { title: string; tier: 0 | 1 | 2 }[] = [
    { title: "Novice", tier: 0 },
    { title: "First jobs", tier: 1 },
    { title: "Second jobs", tier: 2 },
  ];
  return (
    <Window title="Job change (Beta)" onClose={() => togglePanel("beta")}>
      <p className="text-xs text-muted">Beta test: switch to any job at any time. Stat points and skill points reset for free, and gear the new job cannot use goes back to your bag.</p>
      <div className="mt-2 max-h-72 overflow-auto">
        {groups.map((g) => (
          <div key={g.tier} className="mb-2">
            <p className="text-xs text-gold">{g.title}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {JOB_ORDER.filter((j) => JOBS[j].tier === g.tier).map((j) => (
                <button
                  key={j}
                  type="button"
                  title={`${JOBS[j].blurb}${JOBS[j].parent ? ` (from ${JOBS[JOBS[j].parent!].name})` : ""}`}
                  className={`rounded-md border px-2 py-1 text-xs ${p.job === j ? "border-gold bg-surface-2 text-gold" : "border-line"}`}
                  onClick={() => betaSetJob(j)}
                >
                  {JOBS[j].name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-1 text-xs">
        Now: <span className="text-gold">{JOBS[p.job].name}</span> · {JOBS[p.job].blurb}
      </p>
      <p className="mt-1 text-[10px] text-muted">Weapons: {JOBS[p.job].weapons.join(", ")}</p>
      <div className="mt-3 flex flex-wrap gap-1">
        <button type="button" className="rounded-md bg-gold px-2 py-1 text-xs text-ink" onClick={() => resetStats()}>
          Reset stat points
        </button>
        <button type="button" className="rounded-md bg-gold px-2 py-1 text-xs text-ink" onClick={() => resetSkills()}>
          Reset skill points
        </button>
      </div>
      <p className="mt-3 text-xs text-muted">Set base level (resets points)</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {[1, 10, 20, 30, 40, 50, 60].map((n) => (
          <button key={n} type="button" className={`rounded-md border px-2 py-1 text-xs ${p.baseLevel === n ? "border-gold" : "border-line"}`} onClick={() => betaSetLevel(n)}>
            {n}
          </button>
        ))}
      </div>
    </Window>
  );
}

function AutoWindow() {
  const p = world.player;
  if (!p) return null;
  const list = (Object.keys(SKILLS) as SkillId[]).filter((id) => skillAvail(p.job, SKILLS[id]) && SKILLS[id].target !== "passive" && (p.skills[id] ?? 0) > 0);
  return (
    <Window title="Auto Battle" onClose={() => togglePanel("auto")}>
      <button
        type="button"
        className={`w-full rounded-md px-3 py-2 text-sm ${world.auto.battle ? "bg-hp text-ink" : "bg-gold text-ink"}`}
        onClick={() => setAutoBattle(!world.auto.battle)}
      >
        {world.auto.battle ? "Stop Auto Battle (B)" : "Start Auto Battle (B)"}
      </button>
      <p className="mt-3 text-sm">Skills to use automatically</p>
      {list.length === 0 && <p className="text-xs text-muted">No active skills learned yet. Spend skill points in the Skills window.</p>}
      <ul className="mt-1 flex max-h-60 flex-col gap-1 overflow-auto">
        {list.map((id) => {
          const sk = SKILLS[id];
          const buff = sk.target === "self";
          const on = buff ? world.auto.skills[id] === true : world.auto.skills[id] !== false;
          return (
            <li key={id}>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => {
                    world.auto.skills[id] = e.target.checked;
                    bump();
                  }}
                />
                <span className="flex-1">{sk.name}</span>
                <span className="text-[10px] text-muted">
                  {sk.sp} SP{buff ? " · buff" : ""}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={world.auto.autoEquip}
          onChange={(e) => {
            world.auto.autoEquip = e.target.checked;
            bump();
          }}
        />
        Auto-equip the best gear for my job
      </label>
      <p className="mt-2 text-[10px] text-muted">Auto Battle fights nearby monsters, drinks potions when low, and collects every drop on the map.</p>
    </Window>
  );
}

function NavWindow() {
  const here = world.mapId;
  return (
    <Window title="Auto Navigation" onClose={() => togglePanel("nav")}>
      <p className="mb-2 text-xs text-muted">Pick a destination and your hero walks there through the gates by itself. Move manually to cancel.</p>
      <div className="grid gap-1">
        {MAP_IDS.map((id) => (
          <button
            key={id}
            type="button"
            disabled={id === here}
            className="flex items-center justify-between border border-line bg-surface-2 px-3 py-2 text-left text-sm"
            onClick={() => {
              travelTo(id);
              togglePanel("nav");
            }}
          >
            <span>{getMap(id).name}</span>
            <span className="text-xs text-muted">{id === here ? "you are here" : world.auto.travel === id ? "heading there…" : "Go"}</span>
          </button>
        ))}
      </div>
      {world.auto.travel && (
        <button type="button" className="mt-2 w-full border border-line bg-hp-deep px-3 py-2 text-sm" onClick={() => cancelTravel()}>
          Stop navigating
        </button>
      )}
    </Window>
  );
}

function AutoChip() {
  const au = world.auto;
  if (!au.battle && !au.travel) return null;
  return (
    <div className="pointer-events-none absolute top-16 left-1/2 flex -translate-x-1/2 gap-2">
      {au.travel && (
        <button type="button" className="pointer-events-auto border border-line bg-surface px-3 py-1 text-xs text-gold" onClick={() => cancelTravel()}>
          Navigating to {getMap(au.travel).name} — tap to stop
        </button>
      )}
      {au.battle && (
        <button type="button" className="pointer-events-auto border border-line bg-surface px-3 py-1 text-xs text-job" onClick={() => setAutoBattle(false)}>
          Auto Battle ON — tap to stop
        </button>
      )}
    </div>
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
      <div className="mt-1 flex flex-wrap gap-2">
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

function rcol(item: { id: string } | undefined) {
  const it = item ? ITEMS[item.id] : undefined;
  return it ? RARITY[rarityOf(it)].color : undefined;
}

function tip(item: NonNullable<(typeof ITEMS)[string]>) {
  const r = RARITY[rarityOf(item)].label;
  const wn = weaponNote(item);
  return `[${r}] ${item.name}: ${item.desc} ${itemStats(item)}${wn ? ` · ${wn}` : ""} · sells for ${sellPrice(item)}z`;
}

function Slot({ slot, id }: { slot: GearSlot; id: string | null }) {
  const item = id ? ITEMS[id] : undefined;
  return (
    <button type="button" title={item ? tip(item) : undefined} style={{ borderColor: rcol(item) }} className="rounded-md border border-line bg-surface-2 p-1 text-left" onClick={() => unequip(slot)}>
      <span className="block text-[10px] text-muted">{SLOT_LABEL[slot]}</span>
      {item ? <Icon id={item.id} /> : <span className="block h-8" />}
    </button>
  );
}

type Cat = "all" | "weapon" | "armor" | "top" | "mid" | "bottom" | "acc" | "potion" | "loot";
const CATS: { id: Cat; label: string }[] = [
  { id: "all", label: "All" },
  { id: "weapon", label: "Weapons" },
  { id: "armor", label: "Armor" },
  { id: "top", label: "Hat top" },
  { id: "mid", label: "Hat mid" },
  { id: "bottom", label: "Hat bottom" },
  { id: "acc", label: "Accessories" },
  { id: "potion", label: "Potions" },
  { id: "loot", label: "Loot & cards" },
];

function catOf(it: { slot: string }): Cat {
  switch (it.slot) {
    case "weapon":
      return "weapon";
    case "armor":
    case "shield":
    case "garment":
    case "shoes":
      return "armor";
    case "headUpper":
      return "top";
    case "headMid":
      return "mid";
    case "headLower":
      return "bottom";
    case "acc":
    case "acc1":
    case "acc2":
      return "acc";
    case "use":
      return "potion";
    default:
      return "loot";
  }
}

/** Category tab strip with live counts. */
function CatTabs({ cat, setCat, counts }: { cat: Cat; setCat: (c: Cat) => void; counts: Record<Cat, number> }) {
  return (
    <div className="mb-2 flex flex-wrap gap-1">
      {CATS.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`rounded-md border px-2 py-1 text-[11px] ${cat === c.id ? "border-gold bg-surface-2 text-gold" : "border-line"} ${counts[c.id] === 0 && c.id !== "all" ? "opacity-40" : ""}`}
          onClick={() => setCat(c.id)}
        >
          {c.label} {counts[c.id]}
        </button>
      ))}
    </div>
  );
}

function countCats(slots: string[]): Record<Cat, number> {
  const o: Record<Cat, number> = { all: slots.length, weapon: 0, armor: 0, top: 0, mid: 0, bottom: 0, acc: 0, potion: 0, loot: 0 };
  for (const s of slots) o[catOf({ slot: s })]++;
  return o;
}

/** Inventory indexes in a category, best rarity first. */
function sortedIdx(inv: { itemId: string }[], cat: Cat): number[] {
  const idx: number[] = [];
  inv.forEach((s, i) => {
    const it = ITEMS[s.itemId];
    if (it && (cat === "all" || catOf(it) === cat)) idx.push(i);
  });
  const rk = (i: number) => RARITY[rarityOf(ITEMS[inv[i]!.itemId]!)].rank;
  return idx.sort((a, b) => rk(b) - rk(a) || ITEMS[inv[a]!.itemId]!.name.localeCompare(ITEMS[inv[b]!.itemId]!.name));
}

function BagWindow() {
  const [cat, setCat] = useState<Cat>("all");
  const p = world.player;
  if (!p) return null;
  const counts = countCats(p.inv.map((s) => ITEMS[s.itemId]?.slot ?? "etc"));
  return (
    <Window title={`Bag · ${p.inv.length} items (no limit)`} onClose={() => togglePanel("inv")}>
      <CatTabs cat={cat} setCat={setCat} counts={counts} />
      <div className="grid max-h-80 grid-cols-4 gap-2 overflow-auto">
        {sortedIdx(p.inv, cat).map((i) => {
          const stack = p.inv[i]!;
          const item = ITEMS[stack.itemId];
          if (!item) return null;
          return (
            <button key={`${stack.itemId}-${i}`} type="button" title={tip(item)} style={{ borderColor: rcol(item) }} className="rounded-md border border-line p-1 text-left" onClick={() => equipFromInventory(i)}>
              <Icon id={item.id} />
              <span className="block truncate text-[10px]" style={{ color: rcol(item) }}>
                {item.name}
                {stack.qty > 1 ? ` ×${stack.qty}` : ""}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <button type="button" className="rounded-md bg-gold px-2 py-1 text-xs text-ink" onClick={() => autoEquip()}>
          Auto Equip best
        </button>
        <label className="flex items-center gap-1 px-1 text-xs text-muted">
          <input
            type="checkbox"
            checked={world.auto.autoEquip}
            onChange={(e) => {
              world.auto.autoEquip = e.target.checked;
              bump();
            }}
          />
          keep gear optimal during Auto Battle
        </label>
      </div>
      <p className="mt-1 text-[10px]">
        {(Object.keys(RARITY) as (keyof typeof RARITY)[]).map((k) => (
          <span key={k} className="mr-2" style={{ color: RARITY[k].color }}>
            ■ {RARITY[k].label}
          </span>
        ))}
      </p>
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
  const list = (Object.keys(SKILLS) as SkillId[]).filter((id) => skillAvail(p.job, SKILLS[id]));
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
  const [buyCat, setBuyCat] = useState<Cat>("all");
  const [sellCat, setSellCat] = useState<Cat>("all");
  const [showAll, setShowAll] = useState(false);
  const p = world.player;
  if (!p || !world.shop) return null;
  const stock0 = world.shop === "smith" ? SMITH_STOCK : world.shop === "outfit" ? OUTFIT_STOCK : SUPPLY_STOCK;
  const title = world.shop === "smith" ? "Calder" : world.shop === "outfit" ? "Nia" : "Supplies";
  const usable = (id: string) => {
    const it = ITEMS[id];
    return !!it && (showAll || canEquip(p.job, it));
  };
  const jobStock = stock0.filter(usable);
  const stockCounts = countCats(jobStock.map((id) => ITEMS[id]?.slot ?? "etc"));
  const stock = jobStock.filter((id) => buyCat === "all" || catOf(ITEMS[id]!) === buyCat);
  const sellCounts = countCats(p.inv.map((s) => ITEMS[s.itemId]?.slot ?? "etc"));
  return (
    <Window
      title={title}
      onClose={() => {
        world.shop = null;
        bump();
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted">{p.marks.toLocaleString()} zeny</p>
        <label className="flex items-center gap-1 text-[11px] text-muted">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          show items for other jobs
        </label>
      </div>
      <p className="mt-1 text-[11px] text-gold">Showing gear for {JOBS[p.job].name}</p>
      <div className="mt-1">
        <CatTabs cat={buyCat} setCat={setBuyCat} counts={stockCounts} />
      </div>
      <ul className="flex max-h-60 flex-col gap-1 overflow-auto">
        {stock.length === 0 && <li className="text-xs text-muted">Nothing here for your job.</li>}
        {stock.map((id) => {
          const item = ITEMS[id];
          if (!item) return null;
          const cost = priceOf(item.price);
          return (
            <li key={id} className="flex items-center gap-2">
              <Icon id={id} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm" style={{ color: rcol(item) }} title={tip(item)}>
                  {item.name}
                </span>
                <span className="block truncate text-[10px] text-muted">{itemStats(item)}</span>
              </span>
              <button type="button" className="rounded-md bg-gold px-2 py-2 text-xs text-ink" onClick={() => tryBuy(id)}>
                {cost}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-sm">Sell</p>
        <button
          type="button"
          className="rounded-md bg-gold px-2 py-1 text-xs text-ink disabled:opacity-40"
          disabled={junkIndexes().length === 0}
          onClick={() => sellJunk()}
          title="Sells every loot item that is not rare or better. Gear, potions and rare finds are kept."
        >
          Sell all junk ({junkIndexes().length})
        </button>
      </div>
      <div className="mt-1">
        <CatTabs cat={sellCat} setCat={setSellCat} counts={sellCounts} />
      </div>
      <ul className="flex max-h-48 flex-col gap-1 overflow-auto">
        {sortedIdx(p.inv, sellCat).map((i) => {
          const stack = p.inv[i]!;
          const item = ITEMS[stack.itemId];
          if (!item) return null;
          return (
            <li key={`${stack.itemId}-${i}`} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate" style={{ color: rcol(item) }} title={tip(item)}>
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
  const [cat, setCat] = useState<Cat>("all");
  const p = world.player;
  if (!p) return null;
  const counts = countCats([...p.inv, ...p.storage].map((s) => ITEMS[s.itemId]?.slot ?? "etc"));
  const row = (from: "inv" | "storage", i: number) => {
    const s = (from === "inv" ? p.inv : p.storage)[i]!;
    const it = ITEMS[s.itemId];
    return (
      <button key={`${from}${i}`} type="button" title={it ? tip(it) : undefined} className="mt-1 block w-full truncate rounded-md border border-line px-2 py-2 text-left text-xs" style={{ color: rcol(it), borderColor: rcol(it) }} onClick={() => moveStorage(from, i)}>
        {it?.name} {s.qty > 1 ? `×${s.qty}` : ""}
      </button>
    );
  };
  return (
    <Window
      title="Storage (no limit)"
      onClose={() => {
        world.storageOpen = false;
        bump();
      }}
    >
      <CatTabs cat={cat} setCat={setCat} counts={counts} />
      <div className="grid max-h-80 grid-cols-2 gap-2 overflow-auto">
        <div>
          <p className="text-xs text-muted">Bag ({p.inv.length})</p>
          {sortedIdx(p.inv, cat).map((i) => row("inv", i))}
        </div>
        <div>
          <p className="text-xs text-muted">Kept ({p.storage.length})</p>
          {sortedIdx(p.storage, cat).map((i) => row("storage", i))}
        </div>
      </div>
    </Window>
  );
}

void priceOf;
void GEAR_SLOTS;
