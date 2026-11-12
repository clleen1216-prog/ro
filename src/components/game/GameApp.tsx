import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Backpack, BookOpen, Crown, Users, CircleHelp, Compass, Shield, SlidersHorizontal, Sparkles, Swords, UserRound, Volume2, VolumeX, X } from "lucide-react";
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
  STAT_MAX,
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
import { RARITY, gearScore, rarityOf, weaponNote } from "@/game/gear";
import { cardFits, cardName, cardText, describeMods, gearKind, isCard, KIND_LABEL, socketSlots } from "@/game/cardfx";
import { STATUS_INFO, activeStatuses } from "@/game/status";
import { acceptInvite, connect, declineInvite, disconnect, invitePlayer, kickMember, leaveParty, net } from "@/game/net";
import { dropSources, isCollected, itemsForSlot, shopSource, type CodexSlot } from "@/game/codex";
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
  grantBestGear,
  resetSkills,
  resetStats,
  junkIndexes,
  sellJunk,
  socketCard,
  removeCard,
  toggleLock,
  isLocked,
  cardsOn,
  autoSellNow,
  autoSellIndexes,
  type SocketTarget,
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
      if (e.code === "KeyW" && e.shiftKey) togglePanel("wardrobe");
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
              <IconBtn label={net.status === "on" ? "Online · party" : "Online · party (offline)"} onClick={() => togglePanel("online")} active={world.panels.online}>
                <Users />
              </IconBtn>
              <IconBtn label="Fitting room & hat book (W)" onClick={() => togglePanel("wardrobe")} active={world.panels.wardrobe}>
                <BookOpen />
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
          <CapChips />

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

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center gap-2 px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))]">
            <div className="pointer-events-auto flex max-w-full gap-1 overflow-x-auto">
              {player.hotbar.map((slot, i) => (
                <button
                  key={i}
                  type="button"
                  className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-md border border-line bg-surface text-[10.5px]"
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


          <div className="pointer-events-none absolute inset-x-2 top-24 bottom-24 flex flex-wrap content-start justify-center gap-2 overflow-auto">
            {world.panels.status && player && <StatusWindow />}
            {world.panels.equip && <EquipWindow />}
            {world.panels.inv && <BagWindow />}
            {world.panels.skills && <SkillWindow />}
            {world.panels.help && <HelpWindow />}
            {world.panels.nav && <NavWindow />}
            {world.panels.auto && <AutoWindow />}
            {world.panels.beta && <BetaWindow />}
            {world.panels.wardrobe && <WardrobeWindow />}
            {world.panels.online && <OnlineWindow />}
            <PartyHud />
            <StatusChips />
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

const CODEX_TABS: { slot: CodexSlot; label: string }[] = [
  { slot: "headUpper", label: "Top" },
  { slot: "headMid", label: "Mid" },
  { slot: "headLower", label: "Bottom" },
  { slot: "armor", label: "Armor" },
  { slot: "garment", label: "Garment" },
  { slot: "shoes", label: "Shoes" },
  { slot: "weapon", label: "Weapon" },
  { slot: "shield", label: "Shield" },
];

function TryCanvas({ eq, dir }: { eq: Player["eq"]; dir: Player["dir"] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const p = world.player;
    if (ref.current && p) drawPreview(ref.current, { style: p.style, hair: p.hair, trim: p.trim, job: p.job, dir, eq });
  });
  return <canvas ref={ref} className="h-56 w-full" />;
}

function WardrobeWindow() {
  const p = world.player;
  const [tab, setTab] = useState<"hats" | "fit">("hats");
  const [slot, setSlot] = useState<CodexSlot>("headUpper");
  const [sel, setSel] = useState<string | null>(null);
  const [dir, setDir] = useState<Player["dir"]>(0);
  const [tryOn, setTryOn] = useState<Partial<Player["eq"]>>({});
  if (!p) return null;
  const eq = { ...p.eq, ...tryOn } as Player["eq"];
  const tabs = tab === "hats" ? CODEX_TABS.slice(0, 3) : CODEX_TABS;
  const curSlot = tabs.some((t) => t.slot === slot) ? slot : "headUpper";
  const list = itemsForSlot(curSlot);
  const got = list.filter((i) => isCollected(i.id)).length;
  const item = sel ? ITEMS[sel] : undefined;
  const srcs = item ? dropSources(item.id) : [];
  const shop = item ? shopSource(item.id) : null;
  const pick = (id: string) => {
    setSel(id);
    const it = ITEMS[id];
    if (it) setTryOn((t) => ({ ...t, [it.slot as GearSlot]: id }));
  };
  return (
    <Window title="Fitting room & hat book" onClose={() => togglePanel("wardrobe")}>
      <div className="flex gap-1 text-xs">
        {(["hats", "fit"] as const).map((t) => (
          <button key={t} type="button" className={`rounded-md border px-2 py-1 ${tab === t ? "border-gold text-gold" : "border-line"}`} onClick={() => setTab(t)}>
            {t === "hats" ? "Hat book" : "Fitting room"}
          </button>
        ))}
        <span className="ml-auto text-muted">
          {got}/{list.length}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-[130px_1fr] gap-2">
        <div>
          <TryCanvas eq={eq} dir={dir} />
          <div className="flex justify-center gap-1">
            {([0, 1, 3, 2] as const).map((d, i) => (
              <button key={d} type="button" className={`rounded border px-1 text-[10.5px] ${dir === d ? "border-gold text-gold" : "border-line"}`} onClick={() => setDir(d)}>
                {["Front", "Left", "Back", "Right"][i]}
              </button>
            ))}
          </div>
          <button type="button" className="mt-1 w-full rounded border border-line px-1 py-0.5 text-[10.5px]" onClick={() => setTryOn({})}>
            Reset to my outfit
          </button>
        </div>
        <div>
          <div className="flex flex-wrap gap-1">
            {tabs.map((t) => (
              <button key={t.slot} type="button" className={`rounded-md border px-1.5 py-0.5 text-[11.5px] ${curSlot === t.slot ? "border-gold text-gold" : "border-line"}`} onClick={() => { setSlot(t.slot); setSel(null); }}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="mt-1 grid max-h-40 grid-cols-5 gap-1 overflow-auto">
            {list.map((it) => (
              <button
                key={it.id}
                type="button"
                title={`${it.name}${isCollected(it.id) ? "" : " (not collected)"}`}
                style={{ borderColor: sel === it.id ? undefined : rcol(it) }}
                className={`relative rounded-md border bg-surface-2 p-1 ${sel === it.id ? "border-gold" : ""} ${isCollected(it.id) ? "" : "opacity-45"}`}
                onClick={() => pick(it.id)}
              >
                <Icon id={it.id} />
                {isCollected(it.id) && <span className="absolute right-0.5 top-0 text-[9.5px] text-gold">✓</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
      {item && (
        <div className="mt-2 border-t border-line pt-2 text-xs">
          <p style={{ color: rcol(item) }}>{item.name}{isCollected(item.id) ? "" : " · not collected yet"}</p>
          <p className="text-muted">{tip(item)}</p>
          {shop && <p className="mt-1">Sold at the {shop}.</p>}
          {srcs.length === 0 && !shop && <p className="mt-1 text-muted">No source.</p>}
          {srcs.slice(0, 6).map((s) => (
            <div key={s.monsterId} className="mt-1 flex items-center justify-between gap-2 rounded border border-line bg-surface-2 px-2 py-1">
              <span>
                {s.boss ? "★ " : s.mini ? "◆ " : ""}{s.monster} · {s.rate}% · {s.maps.map((m) => m.name).join(", ")}
              </span>
              <button
                type="button"
                className="rounded border border-gold px-2 py-0.5 text-gold"
                onClick={() => {
                  const m = s.maps.find((x) => x.id !== world.mapId) ?? s.maps[0]!;
                  travelTo(m.id);
                  togglePanel("wardrobe");
                }}
              >
                {s.maps.some((x) => x.id === world.mapId) && s.maps.length === 1 ? "Here" : "Navigate"}
              </button>
            </div>
          ))}
        </div>
      )}
    </Window>
  );
}

function Bar({ v, max, color }: { v: number; max: number; color: string }) {
  return (
    <div className="h-1.5 w-full bg-black/60">
      <div className="h-full" style={{ width: `${Math.max(0, Math.min(100, (v / Math.max(1, max)) * 100))}%`, background: color }} />
    </div>
  );
}

function StatusChips() {
  const list = activeStatuses();
  if (!list.length) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-16 z-30 flex -translate-x-1/2 gap-1">
      {list.map(({ kind, left }) => (
        <span key={kind} className="rounded border bg-black/70 px-1.5 py-0.5 text-xs" style={{ borderColor: STATUS_INFO[kind].col, color: STATUS_INFO[kind].col }}>
          {STATUS_INFO[kind].label} {Math.ceil(left)}s
        </span>
      ))}
    </div>
  );
}

function PartyHud() {
  const inv = net.invite;
  const party = net.party;
  return (
    <>
      {inv && (
        <div className="pointer-events-auto absolute left-1/2 top-3 z-40 -translate-x-1/2 rounded-md border border-gold bg-surface px-3 py-2 text-sm shadow-lg">
          <span className="text-gold">{inv.name}</span> invites you to a party
          <button type="button" className="ml-2 rounded border border-gold px-2 text-gold" onClick={acceptInvite}>Join</button>
          <button type="button" className="ml-1 rounded border border-line px-2" onClick={declineInvite}>No</button>
        </div>
      )}
      {party && (
        <div className="pointer-events-none absolute left-2 top-28 z-30 w-36 space-y-1 text-xs">
          {party.members.map((m) => (
            <div key={m.id} className="rounded bg-black/55 px-1.5 py-1">
              <div className="flex justify-between">
                <span className={m.id === net.id ? "text-gold" : "text-[#9be28a]"}>{m.id === party.leader ? "♛ " : ""}{m.name}</span>
                <span className="text-muted">Lv{m.lv}</span>
              </div>
              <Bar v={m.hp} max={m.maxHp} color="#d4534a" />
              <Bar v={m.sp} max={m.maxSp} color="#4a8ad4" />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function OnlineWindow() {
  const [url, setUrl] = useState(net.url);
  const on = net.status === "on";
  const party = net.party;
  const leader = party?.leader === net.id;
  const others = [...net.others.values()];
  return (
    <Window title="Online party" narrow onClose={() => togglePanel("online")}>
      <div className="flex gap-1 text-xs">
        <input
          className="min-w-0 flex-1 rounded border border-line bg-surface-2 px-2 py-1"
          placeholder="wss://your-server.example"
          value={url}
          disabled={on}
          onChange={(e) => setUrl(e.target.value)}
        />
        {on ? (
          <button type="button" className="rounded border border-line px-2" onClick={() => disconnect()}>Leave</button>
        ) : (
          <button type="button" className="rounded border border-gold px-2 text-gold" onClick={() => connect(url)}>Connect</button>
        )}
      </div>
      <p className="mt-1 text-xs text-muted">{net.status === "on" ? `Online${net.host ? " · you run this map's monsters" : ""}` : net.note || "Offline"}</p>
      {on && (
        <>
          <p className="mt-2 text-xs text-gold">Players here ({others.length})</p>
          <div className="space-y-1">
            {others.length === 0 && <p className="text-xs text-muted">Nobody else on this map.</p>}
            {others.map((o) => {
              const mate = party?.members.some((m) => m.id === o.id);
              return (
                <div key={o.id} className="flex items-center justify-between rounded border border-line bg-surface-2 px-2 py-1 text-xs">
                  <span>{o.name}{o.look ? ` · Lv${o.look.lv}` : ""}</span>
                  {mate ? <span className="text-[#9be28a]">in party</span> : (!party || leader) && <button type="button" className="rounded border border-gold px-2 text-gold" onClick={() => invitePlayer(o.id)}>Invite</button>}
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-gold">Party{party ? ` (${party.members.length}/6)` : ""}</p>
          {party ? (
            <div className="space-y-1">
              {party.members.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded border border-line bg-surface-2 px-2 py-1 text-xs">
                  <span>{m.id === party.leader ? "♛ " : ""}{m.name} · Lv{m.lv}</span>
                  {leader && m.id !== net.id && <button type="button" className="rounded border border-line px-2" onClick={() => kickMember(m.id)}>Kick</button>}
                </div>
              ))}
              <button type="button" className="w-full rounded border border-line px-2 py-1 text-xs" onClick={leaveParty}>Leave party</button>
              <p className="text-xs text-muted">Kills: killer gets drops, mates on the map get 80% EXP.</p>
            </div>
          ) : (
            <p className="text-xs text-muted">Invite a player to start one.</p>
          )}
        </>
      )}
    </Window>
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
    <Window title="Job change (Beta)" narrow onClose={() => togglePanel("beta")}>
      <p className="text-xs text-muted">Free job change & resets (beta).</p>
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
      <p className="mt-1 text-[10.5px] text-muted">Weapons: {JOBS[p.job].weapons.join(", ")}</p>
      <div className="mt-3 flex flex-wrap gap-1">
        <button type="button" className="rounded-md bg-gold px-2 py-1 text-xs text-ink" onClick={() => resetStats()}>
          Reset stat points
        </button>
        <button type="button" className="rounded-md bg-gold px-2 py-1 text-xs text-ink" onClick={() => resetSkills()}>
          Reset skill points
        </button>
        <button type="button" className="rounded-md bg-gold px-2 py-1 text-xs text-ink" onClick={() => grantBestGear()}>
          Give &amp; equip best gear
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

function AutoSellSection() {
  const s = world.auto.sell;
  const ranks = (Object.keys(RARITY) as (keyof typeof RARITY)[]).sort((a, b) => RARITY[a].rank - RARITY[b].rank);
  const n = autoSellIndexes().length;
  const chk = (label: string, key: "loot" | "gear" | "cards") => (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={s[key]}
        onChange={(e) => {
          s[key] = e.target.checked;
          bump();
        }}
      />
      {label}
    </label>
  );
  return (
    <div className="mt-4 rounded-md border border-line p-3">
      <p className="text-sm text-gold">Auto Sell (Beta)</p>
      <button type="button" className={`mt-2 w-full rounded-md px-3 py-2 text-sm ${s.on ? "bg-hp text-ink" : "bg-gold text-ink"}`} onClick={() => { s.on = !s.on; bump(); }}>
        {s.on ? "Stop Auto Sell" : "Start Auto Sell"}
      </button>
      <div className="mt-2 flex flex-col gap-1">
        {chk("Sell monster loot (etc items)", "loot")}
        {chk("Sell spare gear up to the rarity below", "gear")}
        {chk("Sell cards too (not recommended)", "cards")}
      </div>
      <p className="mt-2 text-xs text-muted">Gear sells up to this rarity:</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {ranks.slice(0, 4).map((k) => (
          <button key={k} type="button" className={`rounded-md border px-2 py-1 text-xs ${s.maxRank === RARITY[k].rank ? "border-gold" : "border-line"}`} style={{ color: RARITY[k].color }} onClick={() => { s.maxRank = RARITY[k].rank; bump(); }}>
            {RARITY[k].label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs">
        Ready to sell now: {n} · Sold {s.sold} · Earned {s.earned}z
      </p>
      {s.last && <p className="text-xs text-muted">{s.last}</p>}
      <button type="button" className="mt-2 rounded-md border border-line px-3 py-1 text-xs" onClick={() => autoSellNow(false)}>
        Sell now
      </button>
      <p className="mt-2 text-xs text-muted">Worn gear, locked items (🔒 in the Bag), consumables and hotbar items are never sold.</p>
    </div>
  );
}

function AutoWindow() {
  const p = world.player;
  if (!p) return null;
  const list = (Object.keys(SKILLS) as SkillId[]).filter((id) => skillAvail(p.job, SKILLS[id]) && SKILLS[id].target !== "passive" && (p.skills[id] ?? 0) > 0);
  return (
    <Window title="Auto Battle & Auto Sell" narrow onClose={() => togglePanel("auto")}>
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
                <span className="text-[10.5px] text-muted">
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
      <p className="mt-2 text-[10.5px] text-muted">Fights, heals and loots by itself.</p>
      <AutoSellSection />
    </Window>
  );
}

function NavWindow() {
  const here = world.mapId;
  return (
    <Window title="Auto Navigation" narrow onClose={() => togglePanel("nav")}>
      <p className="mb-2 text-xs text-muted">Pick a map to auto-walk there.</p>
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
      <p className="text-[10.5px] text-muted">{st.tag}</p>
      <div className="bar bg-hp-deep mt-1">
        <div className="h-full bg-hp" style={{ width: `${Math.max(0, (m.hp / m.maxHp) * 100)}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[10.5px] text-muted">
        <span>
          {Math.ceil(m.hp)}/{m.maxHp} HP
        </span>
        <span>
          {st.exp} / {st.jexp} EXP
        </span>
      </div>
      <p className="mt-1 truncate text-[10.5px] text-muted">
        Drops: {st.drops.filter((d) => d.rate >= 1 && ITEMS[d.id]).slice(0, 4).map((d) => `${ITEMS[d.id]!.name} ${d.rate}%`).join(", ")}
      </p>
    </div>
  );
}

function Meter({ label, value, max, bar, track }: { label: string; value: number; max: number; bar: string; track: string }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className="pointer-events-none w-52">
      <div className="flex justify-between text-[11.5px] text-fg">
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

function Window({ title, onClose, children, narrow }: { title: string; onClose: () => void; children: React.ReactNode; narrow?: boolean }) {
  return (
    <section className="panel pointer-events-auto fixed inset-x-1 bottom-1 top-[64px] z-40 flex flex-col">
      <header className="flex items-center justify-between border-b border-line px-4 py-2">
        <h2 className="font-display text-lg text-gold">{title}</h2>
        <button type="button" aria-label="Close" className="rounded-md border border-line p-1" onClick={onClose}>
          <X className="size-6" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className={`mx-auto w-full ${narrow ? "max-w-2xl" : "max-w-6xl"}`}>{children}</div>
      </div>
    </section>
  );
}


function LimitStat({ label, value, capped, cap }: { label: string; value: string; capped: boolean; cap: string }) {
  return (
    <span
      className={`border px-2 py-1 ${capped ? "border-gold bg-surface-2 font-bold text-gold" : "border-line text-muted"}`}
      style={capped ? { boxShadow: "0 0 8px #ffcf3a", textShadow: "0 0 6px #ffcf3a" } : undefined}
    >
      {label} {value}
      {capped ? ` · ${cap}` : ""}
    </span>
  );
}

/** Always-visible badges when a stat is at its hard limit. */
function CapChips() {
  const p = world.player;
  if (!p) return null;
  const d = derive(p);
  if (!d.aspdCap && !d.critCap) return null;
  return (
    <div className="pointer-events-none absolute top-28 left-3 flex flex-col gap-1">
      {d.aspdCap && <LimitStat label="ASPD" value={`${d.aspd.toFixed(2)}s`} capped cap="SPEED LIMIT" />}
      {d.critCap && <LimitStat label="CRIT" value={`${d.crit.toFixed(0)}%`} capped cap="MAX" />}
    </div>
  );
}

/** "99 +24": base value plus what gear, cards and buffs add on top */
function StatNum({ base, extra, parts }: { base: number; extra: number; parts?: string }) {
  return (
    <span title={parts}>
      {base}
      {extra !== 0 && <span className={extra > 0 ? "text-[#7ad04a]" : "text-[#e05a4a]"}> {extra > 0 ? "+" : ""}{extra}</span>}
    </span>
  );
}

const STAT_ROWS: { key: "str" | "agi" | "vit" | "int" | "dex" | "luk"; label: string; hint: string }[] = [
  { key: "str", label: "STR", hint: "Melee ATK" },
  { key: "agi", label: "AGI", hint: "FLEE, attack speed, move speed" },
  { key: "vit", label: "VIT", hint: "Max HP, DEF, HP regen" },
  { key: "int", label: "INT", hint: "MATK, Max SP" },
  { key: "dex", label: "DEX", hint: "HIT, bow damage" },
  { key: "luk", label: "LUK", hint: "CRIT" },
];

function StatusWindow() {
  const p = world.player;
  if (!p) return null;
  const d = derive(p);
  const buffs = p.buffs.filter((b) => b.until > world.time);
  const res = describeMods({ rStun: d.mods.rStun, rSleep: d.mods.rSleep, rPoison: d.mods.rPoison, rCurse: d.mods.rCurse, rSilence: d.mods.rSilence, rFreeze: d.mods.rFreeze, rSlow: d.mods.rSlow });
  const cardLines = describeMods({ ...d.mods, rStun: 0, rSleep: 0, rPoison: 0, rCurse: 0, rSilence: 0, rFreeze: 0, rSlow: 0 });
  const combat: [string, string][] = [
    ["ATK", String(d.atk)], ["MATK", String(d.matk)], ["DEF", String(d.def)], ["MDEF", String(d.mdef)],
    ["HIT", String(d.hit)], ["FLEE", String(d.flee)], ["CRIT", `${d.crit.toFixed(0)}%`], ["Attack delay", `${d.aspd.toFixed(2)}s`],
    ["Max HP", String(d.maxHp)], ["Max SP", String(d.maxSp)], ["HP regen", `${d.hpRegen.toFixed(1)}/s`], ["SP regen", `${d.spRegen.toFixed(1)}/s`],
    ["Move speed", String(Math.round(d.speed))], ["Reach", `${Math.round(d.range)}px`],
  ];
  return (
    <Window title="Status" onClose={() => togglePanel("status")}>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md bg-surface-2 p-3">
          <LookCanvas who="player" />
          <p className="mt-2 text-center text-base text-gold">{p.name}</p>
          <p className="text-center text-sm text-muted">{JOBS[p.job].name} · {p.marks.toLocaleString()} zeny</p>
          <div className="mt-2 space-y-1">
            <Meter label={`Base Lv ${p.baseLevel}`} value={p.baseExp} max={expNeed(p.baseLevel)} bar="#6ac45a" track="#12200f" />
            <Meter label={`Job Lv ${p.jobLevel}`} value={p.jobExp} max={jobExpNeed(p.jobLevel)} bar="#d4a23a" track="#241a08" />
          </div>
          <div className="mt-2 flex gap-1">
            <button type="button" className="flex-1 rounded-md border border-line px-2 py-1 text-xs" onClick={() => resetStats()}>
              Reset stats (beta)
            </button>
          </div>
        </div>

        <div className="rounded-md bg-surface-2 p-3">
          <p className="mb-2 text-sm text-gold">Attributes · {p.statPoints} points</p>
          <div className="space-y-1">
            {STAT_ROWS.map((row) => {
              const base = p[row.key];
              const e = d.extra.equip[row.key];
              const c = d.extra.cards[row.key];
              const b = d.extra.buff[row.key];
              const maxed = base >= STAT_MAX;
              return (
                <div key={row.key} className="flex items-center gap-2 rounded-md border border-line px-2 py-1">
                  <div className="min-w-0 flex-1">
                    <p className={`text-base ${maxed ? "font-bold text-gold" : ""}`} style={maxed ? { textShadow: "0 0 6px #ffcf3a" } : undefined}>
                      {row.label} <StatNum base={base} extra={e + c + b} parts={`Base ${base} · Gear +${e} · Cards +${c} · Buffs +${b}`} />
                      {maxed && <span className="ml-1 text-xs">MAX</span>}
                    </p>
                    <p className="truncate text-xs text-muted">{row.hint}{e + c + b ? ` · gear ${e} · cards ${c} · buffs ${b}` : ""}</p>
                  </div>
                  <button type="button" className="h-10 w-10 rounded-md bg-gold text-lg text-ink disabled:opacity-40" disabled={p.statPoints <= 0 || base >= STAT_MAX} onClick={() => addStat(row.key)}>
                    +
                  </button>
                  <button type="button" className="h-10 rounded-md border border-gold px-2 text-sm text-gold disabled:opacity-40" disabled={p.statPoints < 5 || base >= STAT_MAX} onClick={() => { for (let i = 0; i < 5; i++) addStat(row.key); }}>
                    +5
                  </button>
                </div>
              );
            })}
          </div>
          <p className="mt-2 flex flex-wrap gap-1 text-xs">
            <LimitStat label="CRIT" value={`${d.crit.toFixed(0)}%`} capped={d.critCap} cap="MAX" />
            <LimitStat label="Attack delay" value={`${d.aspd.toFixed(2)}s`} capped={d.aspdCap} cap="SPEED LIMIT" />
          </p>
        </div>

        <div className="rounded-md bg-surface-2 p-3">
          <p className="mb-2 text-sm text-gold">Combat</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
            {combat.map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-line/40">
                <span className="text-muted">{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
          {(cardLines.length > 0 || res.length > 0) && (
            <>
              <p className="mb-1 mt-3 text-sm text-gold">From cards</p>
              <p className="text-xs leading-relaxed">{[...cardLines, ...res].join(" · ")}</p>
            </>
          )}
          <p className="mb-1 mt-3 text-sm text-gold">Active buffs</p>
          {buffs.length === 0 && <p className="text-xs text-muted">None. Cast a buff skill to see it here.</p>}
          <ul className="space-y-0.5 text-xs">
            {buffs.map((b, i) => (
              <li key={`${b.stat}${i}`} className="flex justify-between">
                <span>{b.stat.toUpperCase()} +{b.amount}</span>
                <span className="text-muted">{Math.ceil(b.until - world.time)}s</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Sitting (R) regenerates 5x faster.</p>
        </div>
      </div>
    </Window>
  );
}

function SocketPips({ cards, slots }: { cards: string[]; slots: number }) {
  if (slots <= 0) return null;
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: slots }).map((_, i) => {
        const c = cards[i];
        return (
          <span key={i} className="text-[12px] leading-none" style={{ color: c ? rcol({ id: c }) : "#8a8294" }}>
            {c ? "◆" : "◇"}
          </span>
        );
      })}
    </span>
  );
}

function SlotTile({ slot, selected, onPick }: { slot: GearSlot; selected: boolean; onPick: () => void }) {
  const p = world.player!;
  const id = p.eq[slot];
  const item = id ? ITEMS[id] : undefined;
  const cards = p.eqCards?.[slot] ?? [];
  return (
    <button type="button" style={{ borderColor: selected ? undefined : rcol(item) }} className={`flex items-center gap-2 rounded-md border bg-surface-2 p-1.5 text-left ${selected ? "border-gold" : "border-line"}`} onClick={onPick}>
      <span className="w-10 shrink-0">{item ? <Icon id={item.id} /> : <span className="block h-8" />}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-muted">{SLOT_LABEL[slot]}</span>
        <span className="block truncate text-sm" style={{ color: rcol(item) }}>{item ? item.name : "— empty —"}</span>
        {item && <SocketPips cards={cards} slots={socketSlots(item)} />}
      </span>
    </button>
  );
}

function CardPicker({ target, itemId }: { target: SocketTarget; itemId: string }) {
  const p = world.player!;
  const it = ITEMS[itemId];
  const free = socketSlots(it) - cardsOn(target).length;
  const options = p.inv.map((s, i) => ({ s, i })).filter(({ s }) => cardFits(s.itemId, it));
  if (socketSlots(it) === 0) return <p className="text-xs text-muted">This piece has no card sockets.</p>;
  return (
    <div>
      <p className="mb-1 text-xs text-gold">Insert a card ({free} free)</p>
      {options.length === 0 && <p className="text-xs text-muted">No matching {KIND_LABEL[gearKind(it!)!]} cards in your bag.</p>}
      <div className="flex flex-col gap-1">
        {options.map(({ s, i }) => (
          <button key={`${s.itemId}${i}`} type="button" disabled={free <= 0} className="rounded-md border px-2 py-1 text-left text-xs disabled:opacity-40" style={{ borderColor: rcol({ id: s.itemId }) }} onClick={() => socketCard(target, i)}>
            <span style={{ color: rcol({ id: s.itemId }) }}>{cardName(s.itemId)} ×{s.qty}</span>
            <span className="block text-muted">{cardText(s.itemId)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SocketList({ target, itemId }: { target: SocketTarget; itemId: string }) {
  const it = ITEMS[itemId];
  const cards = cardsOn(target);
  const n = socketSlots(it);
  return (
    <div className="space-y-1">
      {Array.from({ length: n }).map((_, i) => {
        const c = cards[i];
        return (
          <div key={i} className="flex items-center justify-between gap-2 rounded-md border border-line px-2 py-1 text-xs">
            {c ? (
              <>
                <span>
                  <span style={{ color: rcol({ id: c }) }}>◆ {cardName(c)}</span>
                  <span className="block text-muted">{cardText(c)}</span>
                </span>
                <button type="button" className="rounded border border-line px-2 py-1" onClick={() => removeCard(target, i)}>
                  Remove
                </button>
              </>
            ) : (
              <span className="text-muted">◇ Empty socket</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function GearDetail({ it }: { it: NonNullable<(typeof ITEMS)[string]> }) {
  const wn = weaponNote(it);
  return (
    <>
      <p className="text-base" style={{ color: rcol(it) }}>{it.name}</p>
      <p className="text-xs text-muted">{RARITY[rarityOf(it)].label} · sells for {sellPrice(it)}z</p>
      <p className="mt-1 text-sm">{it.desc}</p>
      <p className="mt-1 text-sm text-gold">{itemStats(it)}</p>
      {wn && <p className="mt-1 text-xs text-muted">{wn}</p>}
    </>
  );
}

function EquipWindow() {
  const p = world.player;
  const [selRaw, setSel] = useState<GearSlot>("weapon");
  const sel = selRaw as GearSlot;
  const [look, setLook] = useState(false);
  if (!p) return null;
  const left: GearSlot[] = ["headUpper", "headMid", "headLower", "armor", "weapon"];
  const right: GearSlot[] = ["shield", "garment", "shoes", "acc1", "acc2"];
  const d = derive(p);
  const id = p.eq[sel];
  const it = id ? ITEMS[id] : undefined;
  const target: SocketTarget = { kind: "eq", slot: sel };
  const bonus = describeMods(d.mods);
  return (
    <Window title="Equipment" onClose={() => togglePanel("equip")}>
      <div className="grid gap-4 md:grid-cols-[1fr_15rem_1fr]">
        <div className="flex flex-col gap-1.5">
          {left.map((slot) => (
            <SlotTile key={slot} slot={slot} selected={sel === slot} onPick={() => setSel(slot)} />
          ))}
        </div>
        <div className="flex flex-col items-center">
          <LookCanvas who="player" />
          <p className="text-sm text-gold">{p.name} · {JOBS[p.job].name}</p>
          <p className="text-xs text-muted">ATK {d.atk} · DEF {d.def} · MATK {d.matk} · FLEE {d.flee}</p>
          <button type="button" className="mt-2 rounded-md border border-line px-3 py-1 text-xs" onClick={() => setLook(!look)}>
            {look ? "Hide appearance" : "Hair & trim"}
          </button>
          <button type="button" className="mt-1 rounded-md bg-gold px-3 py-1 text-xs text-ink" onClick={() => autoEquip()}>
            Auto Equip best
          </button>
        </div>
        <div className="flex flex-col gap-1.5">
          {right.map((slot) => (
            <SlotTile key={slot} slot={slot} selected={sel === slot} onPick={() => setSel(slot)} />
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-md bg-surface-2 p-3">
          <p className="mb-1 text-sm text-gold">{SLOT_LABEL[sel]}</p>
          {it ? (
            <>
              <GearDetail it={it} />
              <button type="button" className="mt-2 rounded-md border border-line px-3 py-1 text-xs" onClick={() => unequip(sel)}>
                Take off
              </button>
              <p className="mb-1 mt-3 text-sm text-gold">Card sockets</p>
              <SocketList target={target} itemId={it.id} />
              <div className="mt-2">
                <CardPicker target={target} itemId={it.id} />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">Nothing worn here. Pick gear in the Bag (I) to equip it.</p>
          )}
        </div>
        <div className="rounded-md bg-surface-2 p-3">
          <p className="mb-1 text-sm text-gold">Card bonuses (all worn gear)</p>
          {bonus.length === 0 ? <p className="text-xs text-muted">No cards socketed yet. Monster cards drop rarely; bosses drop the strongest.</p> : <p className="text-sm leading-relaxed">{bonus.join(" · ")}</p>}
          {look && (
            <>
              <p className="mt-3 text-sm text-gold">Hair</p>
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
                <Swatches colors={HAIR_COLORS} value={p.hair} onPick={(c) => { p.hair = c; persist(); bump(); }} />
              </div>
              <p className="mt-2 text-sm text-gold">Trim</p>
              <Swatches colors={TRIMS} value={p.trim} onPick={(c) => { p.trim = c; persist(); bump(); }} />
            </>
          )}
        </div>
      </div>
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
      <span className="block text-[10.5px] text-muted">{SLOT_LABEL[slot]}</span>
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
          className={`rounded-md border px-2 py-1 text-[11.5px] ${cat === c.id ? "border-gold bg-surface-2 text-gold" : "border-line"} ${counts[c.id] === 0 && c.id !== "all" ? "opacity-40" : ""}`}
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

type SortKey = "rarity" | "name" | "price" | "new";

function BagWindow() {
  const [cat, setCat] = useState<Cat>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("rarity");
  const [pick, setPick] = useState<string | null>(null);
  const p = world.player;
  if (!p) return null;
  const counts = countCats(p.inv.map((s) => ITEMS[s.itemId]?.slot ?? "etc"));
  const rk = (id: string) => RARITY[rarityOf(ITEMS[id]!)].rank;
  // group identical entries (same item + same socketed cards) into one tile
  type Group = { key: string; itemId: string; cards: string[]; idx: number[]; qty: number };
  const groups = new Map<string, Group>();
  p.inv.forEach((s, i) => {
    const it = ITEMS[s.itemId];
    if (!it) return;
    if (cat !== "all" && catOf(it) !== cat) return;
    if (q && !it.name.toLowerCase().includes(q.toLowerCase())) return;
    const key = `${s.itemId}|${(s.cards ?? []).join(",")}`;
    const g = groups.get(key);
    if (g) {
      g.idx.push(i);
      g.qty += s.qty;
    } else groups.set(key, { key, itemId: s.itemId, cards: s.cards ?? [], idx: [i], qty: s.qty });
  });
  const list = [...groups.values()].sort((a, b) => {
    const A = ITEMS[a.itemId]!;
    const B = ITEMS[b.itemId]!;
    if (sort === "name") return A.name.localeCompare(B.name);
    if (sort === "price") return sellPrice(B) - sellPrice(A);
    if (sort === "new") return Math.max(...b.idx) - Math.max(...a.idx);
    return rk(b.itemId) - rk(a.itemId) || A.name.localeCompare(B.name);
  });
  const sel = list.find((g) => g.key === pick) ?? null;
  const selItem = sel ? ITEMS[sel.itemId]! : null;
  const gearItem = selItem && gearKind(selItem) ? selItem : null;
  const cardItem = sel && isCard(sel.itemId);
  const slotOf = selItem && (GEAR_SLOTS as readonly string[]).includes(selItem.slot) ? (selItem.slot as GearSlot) : null;
  const worn = slotOf ? p.eq[slotOf] : null;
  const wornItem = worn ? ITEMS[worn] : undefined;
  const locked = sel ? isLocked(sel.itemId) : false;
  const target: SocketTarget | null = sel ? { kind: "inv", index: sel.idx[0]! } : null;
  const sellOne = (g: Group, all: boolean) => {
    const n = all ? g.qty : 1;
    for (let k = 0; k < n; k++) {
      const cur = p.inv.findIndex((s) => s.itemId === g.itemId && (s.cards ?? []).join(",") === g.cards.join(","));
      if (cur < 0) break;
      trySell(cur);
    }
  };
  const gearTargets = p.inv
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => !!cardItem && !!sel && cardFits(sel.itemId, ITEMS[s.itemId]) && socketSlots(ITEMS[s.itemId]) > (s.cards?.length ?? 0));
  const sellCfg = world.auto.sell;
  return (
    <Window title={`Bag · ${p.inv.length} items`} onClose={() => togglePanel("inv")}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="h-9 min-w-0 flex-1 rounded-md border border-line bg-surface-2 px-2 text-sm" />
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-9 rounded-md border border-line bg-surface-2 px-2 text-sm">
          <option value="rarity">Sort: Rarity</option>
          <option value="name">Sort: Name</option>
          <option value="price">Sort: Value</option>
          <option value="new">Sort: Newest</option>
        </select>
        <button type="button" className="h-9 rounded-md bg-gold px-3 text-sm text-ink" onClick={() => autoEquip()}>
          Auto Equip
        </button>
        <button type="button" className="h-9 rounded-md border border-line px-3 text-sm" onClick={() => sellJunk()}>
          Sell junk ({junkIndexes().length})
        </button>
        <button
          type="button"
          className={`h-9 rounded-md border px-3 text-sm ${sellCfg.on ? "border-gold text-gold" : "border-line"}`}
          onClick={() => {
            sellCfg.on = !sellCfg.on;
            bump();
          }}
        >
          Auto-sell {sellCfg.on ? "ON" : "OFF"}
        </button>
      </div>
      <CatTabs cat={cat} setCat={setCat} counts={counts} />
      <div className="grid gap-3 md:grid-cols-[1fr_20rem]">
        <div className="grid grid-cols-3 content-start gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {list.map((g) => {
            const item = ITEMS[g.itemId]!;
            const lk = isLocked(g.itemId);
            return (
              <button key={g.key} type="button" title={tip(item)} style={{ borderColor: pick === g.key ? undefined : rcol(item) }} className={`relative rounded-md border bg-surface-2 p-1 text-left ${pick === g.key ? "border-gold" : "border-line"}`} onClick={() => setPick(g.key)}>
                <Icon id={item.id} />
                <span className="block truncate text-xs" style={{ color: rcol(item) }}>
                  {item.name}
                </span>
                <span className="flex items-center justify-between text-xs text-muted">
                  <SocketPips cards={g.cards} slots={socketSlots(item)} />
                  <span>×{g.qty}</span>
                </span>
                {lk && <span className="absolute right-1 top-1 text-xs">🔒</span>}
              </button>
            );
          })}
          {list.length === 0 && <p className="col-span-full text-sm text-muted">{p.inv.length === 0 ? "Empty. Defeat monsters and walk over their drops." : "Nothing matches."}</p>}
        </div>

        <div className="rounded-md bg-surface-2 p-3 md:sticky md:top-0 md:self-start">
          {!sel || !selItem ? (
            <p className="text-sm text-muted">Select an item to see details, compare, sell, lock or socket cards.</p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="w-12">
                  <Icon id={selItem.id} />
                </span>
                <div>
                  <p className="text-base" style={{ color: rcol(selItem) }}>{selItem.name}</p>
                  <p className="text-xs text-muted">×{sel.qty} · {RARITY[rarityOf(selItem)].label} · {sellPrice(selItem)}z each</p>
                </div>
              </div>
              <p className="mt-2 text-sm">{selItem.desc}</p>
              {cardItem ? (
                <p className="mt-1 text-sm text-gold">{cardText(sel.itemId)}</p>
              ) : (
                <p className="mt-1 text-sm text-gold">{itemStats(selItem)}</p>
              )}
              {weaponNote(selItem) && <p className="mt-1 text-xs text-muted">{weaponNote(selItem)}</p>}
              {slotOf && (
                <p className="mt-1 text-xs">
                  {wornItem ? (
                    <>
                      vs worn <span style={{ color: rcol(wornItem) }}>{wornItem.name}</span>:{" "}
                      {(() => {
                        const diff = Math.round(gearScore(selItem, p.job) - gearScore(wornItem, p.job));
                        return <span className={diff > 0 ? "text-[#7ad04a]" : diff < 0 ? "text-[#e05a4a]" : "text-muted"}>{diff > 0 ? `+${diff} better` : diff < 0 ? `${diff} worse` : "same"}</span>;
                      })()}
                    </>
                  ) : (
                    <span className="text-[#7ad04a]">Slot is empty</span>
                  )}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-1">
                {slotOf && (
                  <button type="button" className="rounded-md bg-gold px-3 py-1 text-sm text-ink" onClick={() => equipFromInventory(sel.idx[0]!)}>
                    Equip
                  </button>
                )}
                {selItem.slot === "use" && (
                  <>
                    <button type="button" className="rounded-md bg-gold px-3 py-1 text-sm text-ink" onClick={() => useStack(sel.idx[0]!)}>
                      Use
                    </button>
                    <button type="button" className="rounded-md border border-line px-3 py-1 text-sm" onClick={() => stashToHotbar(sel.itemId)}>
                      Hotbar
                    </button>
                  </>
                )}
                <button type="button" disabled={locked} className="rounded-md border border-line px-3 py-1 text-sm disabled:opacity-40" onClick={() => sellOne(sel, false)}>
                  Sell 1
                </button>
                {sel.qty > 1 && (
                  <button type="button" disabled={locked} className="rounded-md border border-line px-3 py-1 text-sm disabled:opacity-40" onClick={() => sellOne(sel, true)}>
                    Sell all
                  </button>
                )}
                <button type="button" className={`rounded-md border px-3 py-1 text-sm ${locked ? "border-gold text-gold" : "border-line"}`} onClick={() => toggleLock(sel.itemId)}>
                  {locked ? "🔒 Locked" : "Lock"}
                </button>
              </div>
              {gearItem && target && socketSlots(gearItem) > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-sm text-gold">Card sockets</p>
                  <SocketList target={target} itemId={gearItem.id} />
                  <div className="mt-2">
                    <CardPicker target={target} itemId={gearItem.id} />
                  </div>
                </div>
              )}
              {cardItem && (
                <div className="mt-3">
                  <p className="mb-1 text-sm text-gold">Insert into…</p>
                  {gearTargets.length === 0 && <p className="text-xs text-muted">No gear in your bag with a free matching socket. Worn gear: open Equipment.</p>}
                  <div className="flex flex-col gap-1">
                    {gearTargets.map(({ s, i }) => (
                      <button key={i} type="button" className="rounded-md border border-line px-2 py-1 text-left text-xs" onClick={() => socketCard({ kind: "inv", index: i }, sel.idx[0]!)}>
                        <span style={{ color: rcol({ id: s.itemId }) }}>{ITEMS[s.itemId]!.name}</span> <SocketPips cards={s.cards ?? []} slots={socketSlots(ITEMS[s.itemId])} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs">
        {(Object.keys(RARITY) as (keyof typeof RARITY)[]).map((k) => (
          <span key={k} className="mr-3" style={{ color: RARITY[k].color }}>
            ■ {RARITY[k].label}
          </span>
        ))}
        <span className="text-muted">◇ empty socket · ◆ card · 🔒 protected from selling</span>
      </p>
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
    <Window title="How to walk" narrow onClose={() => togglePanel("help")}>
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
        <label className="flex items-center gap-1 text-[11.5px] text-muted">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          show items for other jobs
        </label>
      </div>
      <p className="mt-1 text-[11.5px] text-gold">Showing gear for {JOBS[p.job].name}</p>
      <div className="mt-2 grid gap-4 md:grid-cols-2">
      <div>
      <p className="mb-1 text-sm text-gold">Buy</p>
      <div className="mt-1">
        <CatTabs cat={buyCat} setCat={setBuyCat} counts={stockCounts} />
      </div>
      <ul className="flex flex-col gap-1">
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
                <span className="block truncate text-[10.5px] text-muted">{itemStats(item)}</span>
              </span>
              <button type="button" className="rounded-md bg-gold px-2 py-2 text-xs text-ink" onClick={() => tryBuy(id)}>
                {cost}
              </button>
            </li>
          );
        })}
      </ul>
      </div>
      <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-gold">Sell</p>
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
      <ul className="flex flex-col gap-1">
        {sortedIdx(p.inv, sellCat).map((i) => {
          const stack = p.inv[i]!;
          const item = ITEMS[stack.itemId];
          if (!item) return null;
          return (
            <li key={`${stack.itemId}-${i}`} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate" style={{ color: rcol(item) }} title={tip(item)}>
                {item.name}
                {stack.qty > 1 ? ` ×${stack.qty}` : ""}
                {stack.cards?.length ? ` ◆${stack.cards.length}` : ""}
              </span>
              <button type="button" disabled={isLocked(stack.itemId)} className="rounded-md border border-line px-2 py-1 text-xs disabled:opacity-40" onClick={() => trySell(i)}>
                {sellPrice(item)}
              </button>
            </li>
          );
        })}
      </ul>
      </div>
      </div>
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
        {it?.name} {s.qty > 1 ? `×${s.qty}` : ""} {s.cards?.length ? `◆${s.cards.length}` : ""}
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
