// Procedural, animated art for the Ragnarok-style monsters that have no PNG.
// Every look is drawn in a 66-unit box with its feet at (0,0), facing right,
// then scaled to the monster's draw size. `t` is seconds, `m` is 0..1 motion.

type Ctx = CanvasRenderingContext2D;

const INK = "#2a2118";

function ell(c: Ctx, x: number, y: number, rx: number, ry: number, fill: string, stroke = true, rot = 0) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.lineWidth = 2;
    c.strokeStyle = INK;
    c.stroke();
  }
}

function eye(c: Ctx, x: number, y: number, r = 3.2, white = true) {
  ell(c, x, y, r, r * 1.25, INK, false);
  if (white) ell(c, x + r * 0.3, y - r * 0.4, r * 0.38, r * 0.38, "#fff", false);
}

function limb(c: Ctx, x1: number, y1: number, x2: number, y2: number, w: number, col: string) {
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.lineWidth = w + 2;
  c.strokeStyle = INK;
  c.lineCap = "round";
  c.stroke();
  c.lineWidth = w;
  c.strokeStyle = col;
  c.stroke();
}

function blob(c: Ctx, t: number, m: number, body: string, hi: string, back: boolean, extra?: () => void) {
  const squash = Math.sin(t * (m ? 9 : 3)) * (m ? 0.1 : 0.04);
  c.save();
  c.translate(0, 0);
  c.scale(1 - squash, 1 + squash);
  ell(c, 0, -21, 27, 21, body);
  ell(c, -9, -30, 9, 5, hi, false, -0.5);
  if (!back) {
    eye(c, -7, -22);
    eye(c, 9, -22);
    c.beginPath();
    c.arc(1, -14, 4, 0.15 * Math.PI, 0.85 * Math.PI);
    c.lineWidth = 1.6;
    c.strokeStyle = INK;
    c.stroke();
  }
  extra?.();
  c.restore();
}


type OrcStyle = { skin: string; armor: string; cloth: string; weapon: "axe" | "club" | "none"; boss?: boolean; bone?: boolean; rot?: boolean };

function orcBody(c: Ctx, t: number, m: number, back: boolean, o: OrcStyle) {
  const k = Math.sin(t * (m ? 8 : 2));
  const skin = o.skin;
  limb(c, -8, -30, -10 + k * 4, -2, 8, o.cloth);
  limb(c, 9, -30, 11 - k * 4, -2, 8, o.cloth);
  // torso
  c.beginPath();
  c.moveTo(-20, -34);
  c.quadraticCurveTo(-24, -62, -12, -70);
  c.lineTo(12, -70);
  c.quadraticCurveTo(24, -62, 20, -34);
  c.closePath();
  c.fillStyle = o.bone ? "#efe9d8" : skin;
  c.fill();
  c.lineWidth = 2;
  c.strokeStyle = INK;
  c.stroke();
  if (o.bone) {
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(-14, -42 - i * 8);
      c.lineTo(14, -42 - i * 8);
      c.lineWidth = 2.4;
      c.strokeStyle = "#a89c80";
      c.stroke();
    }
  } else {
    c.fillStyle = o.armor;
    c.fillRect(-18, -58, 36, 14);
    c.strokeRect(-18, -58, 36, 14);
    c.fillStyle = o.cloth;
    c.fillRect(-16, -38, 32, 8);
  }
  // weapon arm
  const sw = o.weapon === "none" ? 0 : -k * 0.25;
  limb(c, 16, -62, 30, -46 + k * 3, 8, o.bone ? "#efe9d8" : skin);
  limb(c, -16, -62, -28, -46 - k * 3, 8, o.bone ? "#efe9d8" : skin);
  if (o.weapon !== "none") {
    c.save();
    c.translate(32, -46 + k * 3);
    c.rotate(-0.5 + sw);
    limb(c, 0, 6, 0, -34, 4, "#6b442c");
    if (o.weapon === "axe") {
      c.beginPath();
      c.moveTo(0, -34);
      c.quadraticCurveTo(18, -40, 14, -20);
      c.lineTo(0, -22);
      c.closePath();
      c.fillStyle = "#b9c0cc";
      c.fill();
      c.lineWidth = 2;
      c.strokeStyle = INK;
      c.stroke();
    } else ell(c, 0, -36, 6, 8, "#8a5a32");
    c.restore();
  }
  // head
  ell(c, 0, -80, 14, 13, o.bone ? "#f6f0e0" : skin);
  if (o.boss || o.armor) {
    c.fillStyle = o.armor;
    c.beginPath();
    c.arc(0, -84, 14, Math.PI, 0);
    c.closePath();
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = INK;
    c.stroke();
    if (o.boss) {
      for (let i = -1; i <= 1; i++) {
        c.beginPath();
        c.moveTo(i * 8 - 3, -96);
        c.lineTo(i * 8, -108 - (i === 0 ? 4 : 0));
        c.lineTo(i * 8 + 3, -96);
        c.fillStyle = "#e4b15a";
        c.fill();
        c.stroke();
      }
    }
  }
  if (!back) {
    eye(c, -5.5, -80, 2.4, false);
    eye(c, 5.5, -80, 2.4, false);
    if (!o.rot) ell(c, -5.5, -80, 1, 1, "#e04a3a", false);
    // tusks
    c.fillStyle = "#f6f0e0";
    c.beginPath();
    c.moveTo(-6, -73);
    c.lineTo(-4, -66);
    c.lineTo(-2, -73);
    c.moveTo(6, -73);
    c.lineTo(4, -66);
    c.lineTo(2, -73);
    c.fill();
    c.lineWidth = 1.2;
    c.stroke();
  }
  if (o.rot) {
    c.fillStyle = "#b8a88a";
    c.fillRect(-18, -50, 8, 16);
    c.fillRect(8, -66, 10, 6);
  }
}

const LOOKS: Record<string, (c: Ctx, t: number, m: number, back: boolean) => void> = {
  poring: (c, t, m, back) => blob(c, t, m, "#f6a6c0", "#ffd9e6", back),
  drops: (c, t, m, back) => blob(c, t, m, "#f0a13a", "#ffd69a", back),
  poporing: (c, t, m, back) =>
    blob(c, t, m, "#69bd5c", "#b4e8a6", back, () => {
      for (let i = 0; i < 3; i++) {
        const r = ((t * 0.7 + i * 0.33) % 1) * 26;
        c.globalAlpha = 1 - r / 26;
        ell(c, -12 + i * 12, -44 - r, 3.2, 3.2, "#9a5ad0", false);
      }
      c.globalAlpha = 1;
    }),

  lunatic: (c, t, m, back) => {
    const hop = m ? Math.abs(Math.sin(t * 9)) * 8 : 0;
    c.translate(0, -hop);
    const ear = Math.sin(t * 5) * 0.1;
    c.save();
    c.rotate(-0.25 + ear);
    ell(c, -9, -52, 5, 14, "#fff");
    ell(c, -9, -52, 2.4, 9, "#f6b0c0", false);
    c.restore();
    c.save();
    c.rotate(0.25 - ear);
    ell(c, 11, -52, 5, 14, "#fff");
    ell(c, 11, -52, 2.4, 9, "#f6b0c0", false);
    c.restore();
    ell(c, 0, -20, 25, 20, "#fbfaf4");
    ell(c, -20, -12, 6, 6, "#fff");
    if (!back) {
      eye(c, -6, -24, 3, false);
      eye(c, 10, -24, 3, false);
      ell(c, 2, -17, 2.4, 1.6, "#e08a9a", false);
    }
  },

  fabre: (c, t, m, back) => {
    const w = (i: number) => Math.sin(t * (m ? 10 : 4) - i * 0.9) * (m ? 4 : 1.5);
    ell(c, -22, -9 + w(3), 10, 9, "#7cc05a");
    ell(c, -9, -11 + w(2), 12, 11, "#8fd06a");
    ell(c, 6, -12 + w(1), 13, 12, "#7cc05a");
    ell(c, 21, -16 + w(0), 14, 13, "#a3dc78");
    if (!back) {
      eye(c, 24, -19 + w(0), 2.8);
      eye(c, 16, -19 + w(0), 2.8);
    }
    limb(c, 24, -29 + w(0), 28, -38, 1.6, "#4a7a3a");
    limb(c, 17, -29 + w(0), 15, -38, 1.6, "#4a7a3a");
  },

  pupa: (c, t, _m, back) => {
    const sway = Math.sin(t * 2) * 0.03;
    c.rotate(sway);
    ell(c, 0, -26, 17, 27, "#b9824a");
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.ellipse(0, -14 - i * 9, 17 - Math.abs(i - 1.5) * 2.2, 3, 0, 0, Math.PI);
      c.strokeStyle = "#7a4e26";
      c.lineWidth = 2;
      c.stroke();
    }
    if (!back) {
      eye(c, -5, -34, 2.2, false);
      eye(c, 6, -34, 2.2, false);
    }
  },

  willow: (c, t, m, back) => {
    const sway = Math.sin(t * (m ? 6 : 1.8)) * (m ? 0.06 : 0.03);
    c.rotate(sway);
    limb(c, -10, -4, -18, 0, 5, "#6b442c");
    limb(c, 10, -4, 18, 0, 5, "#6b442c");
    c.beginPath();
    c.moveTo(-17, 0);
    c.quadraticCurveTo(-21, -30, -15, -44);
    c.lineTo(15, -44);
    c.quadraticCurveTo(21, -30, 17, 0);
    c.closePath();
    c.fillStyle = "#8a5a32";
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = INK;
    c.stroke();
    ell(c, -12, -52, 16, 12, "#4f9a4a");
    ell(c, 11, -54, 17, 13, "#5fae55");
    ell(c, 0, -62, 15, 11, "#6cbc60");
    if (!back) {
      eye(c, -7, -30, 3.4);
      eye(c, 7, -30, 3.4);
      c.beginPath();
      c.ellipse(0, -20, 4, 3, 0, 0, Math.PI);
      c.fillStyle = INK;
      c.fill();
    }
  },

  rocker: (c, t, m, back) => {
    const k = Math.sin(t * (m ? 11 : 2.5));
    limb(c, 8, -18, 22, -6 + k * 3, 4, "#4f8a38");
    limb(c, 22, -6 + k * 3, 28, 0, 3, "#4f8a38");
    limb(c, -4, -16, -16, -2 - k * 3, 3, "#4f8a38");
    ell(c, -2, -26, 24, 13, "#7cbc4a", true, -0.1);
    ell(c, 22, -33, 11, 9, "#8fd05a");
    limb(c, 26, -40, 34, -56 + k * 2, 1.6, "#4a6a30");
    limb(c, 20, -40, 20, -58 - k * 2, 1.6, "#4a6a30");
    if (!back) {
      eye(c, 26, -34, 3.2, false);
      ell(c, 26, -34, 1.4, 1.4, "#e04a3a", false);
    }
    limb(c, -14, -30, -30, -44 + k * 4, 5, "#5a9a3a");
  },

  hornet: (c, t, m) => {
    const fl = Math.sin(t * 40) * 0.5;
    c.save();
    c.globalAlpha = 0.65;
    c.save();
    c.rotate(-0.5 + fl);
    ell(c, -6, -44, 14, 6, "#dff4ff", true);
    c.restore();
    c.save();
    c.rotate(-0.1 - fl);
    ell(c, 4, -46, 14, 6, "#dff4ff", true);
    c.restore();
    c.restore();
    ell(c, -8, -26, 16, 11, "#f0c93a");
    for (let i = 0; i < 3; i++) {
      c.fillStyle = INK;
      c.fillRect(-16 + i * 7, -35, 3, 18);
    }
    ell(c, 12, -28, 10, 9, "#f2d65a");
    eye(c, 15, -29, 3, false);
    ell(c, 15, -29, 1.3, 1.3, "#e04a3a", false);
    c.beginPath();
    c.moveTo(-23, -26);
    c.lineTo(-33, -22 + (m ? 0 : 1));
    c.lineTo(-23, -22);
    c.fillStyle = INK;
    c.fill();
  },

  creamy: (c, t, m) => {
    const f = Math.abs(Math.sin(t * (m ? 9 : 5)));
    c.save();
    c.scale(0.35 + f * 0.65, 1);
    ell(c, -16, -36, 17, 22, "#f5b84a");
    ell(c, 16, -36, 17, 22, "#f5b84a");
    ell(c, -13, -20, 11, 13, "#f9d98a");
    ell(c, 13, -20, 11, 13, "#f9d98a");
    c.restore();
    ell(c, 0, -30, 4.4, 16, "#5a3a2a");
    eye(c, 0, -46, 2.2, false);
    limb(c, -1, -47, -7, -58, 1.5, INK);
    limb(c, 1, -47, 7, -58, 1.5, INK);
  },

  condor: (c, t, m) => {
    const fl = Math.sin(t * (m ? 14 : 8));
    c.save();
    c.rotate(-0.7 * fl);
    ell(c, -14, -38, 20, 8, "#6b4a32", true, -0.4);
    c.restore();
    ell(c, 0, -26, 20, 13, "#8a5e3c");
    ell(c, 14, -34, 10, 9, "#f2efe4");
    c.beginPath();
    c.moveTo(22, -34);
    c.lineTo(32, -30);
    c.lineTo(22, -28);
    c.fillStyle = "#e4a03a";
    c.fill();
    c.lineWidth = 1.5;
    c.strokeStyle = INK;
    c.stroke();
    eye(c, 16, -36, 2.4, false);
    ell(c, -18, -24, 7, 4, "#6b4a32", true, 0.4);
    limb(c, -3, -14, -3, -4, 2.4, "#e4a03a");
    limb(c, 5, -14, 6, -4, 2.4, "#e4a03a");
  },

  scorpion: (c, t, m) => {
    const sw = Math.sin(t * (m ? 9 : 3));
    for (let i = 0; i < 3; i++) {
      limb(c, -4 + i * 8, -12, -8 + i * 8, -2 + sw * (i % 2 ? 2 : -2), 2.4, "#6b3a22");
    }
    ell(c, 0, -17, 22, 12, "#a24b32");
    ell(c, 22, -19, 8, 7, "#b85a3a");
    limb(c, 26, -22, 36, -30 + sw * 2, 4, "#a24b32");
    ell(c, 38, -32 + sw * 2, 6, 5, "#c0603e");
    c.beginPath();
    c.moveTo(-18, -18);
    c.quadraticCurveTo(-34, -22, -26, -44);
    c.quadraticCurveTo(-18, -54, -10, -44);
    c.lineWidth = 6;
    c.strokeStyle = INK;
    c.stroke();
    c.lineWidth = 3.4;
    c.strokeStyle = "#a24b32";
    c.stroke();
    c.beginPath();
    c.moveTo(-12, -43);
    c.lineTo(-6, -38);
    c.lineTo(-13, -37);
    c.fillStyle = "#e4c24a";
    c.fill();
    eye(c, 25, -22, 2, false);
  },

  wolf: (c, t, m) => {
    const k = Math.sin(t * (m ? 13 : 2));
    limb(c, -14, -16, -18 + k * 6, -2, 4, "#a8916a");
    limb(c, 16, -16, 20 - k * 6, -2, 4, "#a8916a");
    limb(c, -6, -16, -4 - k * 6, -2, 4, "#c4ab7c");
    limb(c, 8, -16, 10 + k * 6, -2, 4, "#c4ab7c");
    limb(c, -24, -30, -38, -26 + k * 2, 5, "#b49c70");
    ell(c, 0, -28, 28, 14, "#cbb892");
    ell(c, 28, -38, 11, 10, "#d6c4a0");
    ell(c, 38, -34, 7, 4.6, "#e0d2b2");
    ell(c, 44, -35, 2.2, 2.2, INK, false);
    c.beginPath();
    c.moveTo(22, -46);
    c.lineTo(26, -58);
    c.lineTo(31, -47);
    c.fillStyle = "#b49c70";
    c.fill();
    c.stroke();
    eye(c, 33, -40, 2.2, false);
  },

  peco: (c, t, m) => {
    const k = Math.sin(t * (m ? 11 : 2));
    limb(c, -4, -30, -6 + k * 5, -2, 3.6, "#e4a03a");
    limb(c, 8, -30, 8 - k * 5, -2, 3.6, "#e4a03a");
    ell(c, -2, -44, 24, 18, "#f6d65a");
    ell(c, -24, -52, 9, 12, "#f0c040", true, -0.5);
    limb(c, 12, -52, 20, -76, 9, "#f6d65a");
    ell(c, 22, -82, 11, 10, "#f8de6a");
    c.beginPath();
    c.moveTo(30, -84);
    c.lineTo(42, -80);
    c.lineTo(30, -76);
    c.fillStyle = "#e4903a";
    c.fill();
    c.lineWidth = 1.6;
    c.strokeStyle = INK;
    c.stroke();
    eye(c, 24, -85, 2.6, false);
    for (let i = 0; i < 3; i++) limb(c, 18 + i * 3, -92, 22 + i * 4, -102 - i, 2, "#e4a03a");
  },

  familiar: (c, t, m) => {
    const f = Math.sin(t * (m ? 22 : 14));
    c.save();
    c.rotate(0.5 * f);
    ell(c, -22, -34, 22, 9, "#5a3a7a", true, -0.3);
    c.restore();
    c.save();
    c.rotate(-0.5 * f);
    ell(c, 22, -34, 22, 9, "#5a3a7a", true, 0.3);
    c.restore();
    ell(c, 0, -30, 12, 13, "#7a56a0");
    c.beginPath();
    c.moveTo(-9, -40);
    c.lineTo(-7, -52);
    c.lineTo(-2, -42);
    c.moveTo(9, -40);
    c.lineTo(7, -52);
    c.lineTo(2, -42);
    c.fillStyle = "#7a56a0";
    c.fill();
    c.stroke();
    eye(c, -4.5, -32, 2.6, false);
    eye(c, 4.5, -32, 2.6, false);
    ell(c, -4.5, -32, 1.3, 1.3, "#e04a3a", false);
    ell(c, 4.5, -32, 1.3, 1.3, "#e04a3a", false);
    c.fillStyle = "#fff";
    c.fillRect(-3, -25, 2, 4);
    c.fillRect(1, -25, 2, 4);
  },

  zombie: (c, t, m) => {
    const k = Math.sin(t * (m ? 6 : 2));
    limb(c, -6, -28, -8 + k * 3, -2, 6, "#5a6a4a");
    limb(c, 8, -28, 10 - k * 3, -2, 6, "#5a6a4a");
    c.beginPath();
    c.rect(-14, -62, 28, 36);
    c.fillStyle = "#6a7a58";
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = INK;
    c.stroke();
    c.fillStyle = "#4a5a3a";
    c.fillRect(-14, -44, 28, 8);
    limb(c, 12, -56, 30, -52 + k * 4, 6, "#7a8a68");
    limb(c, -12, -56, 6, -50 - k * 4, 6, "#7a8a68");
    ell(c, 0, -74, 12, 12, "#8a9a76");
    ell(c, -4.5, -75, 3, 3.6, INK, false);
    ell(c, 4.5, -75, 3, 3.6, INK, false);
    c.fillStyle = INK;
    c.fillRect(-4, -67, 8, 2);
    c.fillStyle = "#b8a88a";
    c.fillRect(-14, -52, 6, 14);
  },

  skeleton: (c, t, m) => {
    const k = Math.sin(t * (m ? 9 : 2));
    limb(c, -5, -28, -7 + k * 4, -2, 3.4, "#efe9d8");
    limb(c, 7, -28, 9 - k * 4, -2, 3.4, "#efe9d8");
    ell(c, 0, -40, 11, 12, "#efe9d8");
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(-11, -42 - i * 7);
      c.lineTo(11, -42 - i * 7);
      c.lineWidth = 2.4;
      c.strokeStyle = "#efe9d8";
      c.stroke();
    }
    limb(c, 0, -64, 0, -30, 3, "#efe9d8");
    limb(c, 10, -58, 26, -48 + k * 3, 3.2, "#efe9d8");
    limb(c, 26, -48 + k * 3, 34, -64, 3, "#8a8a92");
    limb(c, -10, -58, -20, -44 - k * 3, 3.2, "#efe9d8");
    ell(c, 0, -74, 11, 11, "#f6f0e0");
    ell(c, -4, -75, 2.8, 3.4, INK, false);
    ell(c, 4, -75, 2.8, 3.4, INK, false);
    c.fillStyle = INK;
    c.fillRect(-5, -66, 10, 2.4);
  },

  goldbug: (c, t, m) => {
    const k = Math.sin(t * (m ? 12 : 3));
    for (let i = 0; i < 3; i++) {
      limb(c, -14 + i * 14, -14, -20 + i * 14, -2 + k * (i % 2 ? 2 : -2), 3, "#9a6a1a");
      limb(c, -14 + i * 14, -14, -8 + i * 14, -2 + k * (i % 2 ? -2 : 2), 3, "#9a6a1a");
    }
    c.save();
    c.shadowColor = "#ffe27a";
    c.shadowBlur = 16 + Math.sin(t * 3) * 5;
    ell(c, -2, -28, 36, 24, "#e4b92a");
    c.restore();
    c.beginPath();
    c.moveTo(-2, -52);
    c.lineTo(-2, -4);
    c.lineWidth = 2;
    c.strokeStyle = "#9a6a1a";
    c.stroke();
    ell(c, -14, -36, 12, 6, "#fff2a8", false, -0.4);
    ell(c, 32, -28, 14, 13, "#d8a820");
    eye(c, 38, -30, 3, false);
    ell(c, 38, -30, 1.4, 1.4, "#e04a3a", false);
    limb(c, 40, -38, 50, -52 + k * 2, 2.4, "#9a6a1a");
    limb(c, 34, -40, 36, -56 - k * 2, 2.4, "#9a6a1a");
  },
  goblin: (c, t, m, back) => {
    const k = Math.sin(t * (m ? 12 : 2.5));
    limb(c, -5, -22, -7 + k * 4, -2, 5, "#5a8a3a");
    limb(c, 6, -22, 8 - k * 4, -2, 5, "#5a8a3a");
    ell(c, 0, -34, 14, 16, "#7aa84a");
    c.fillStyle = "#8a5a32";
    c.fillRect(-13, -32, 26, 8);
    limb(c, 12, -40, 24, -34 + k * 3, 4, "#7aa84a");
    c.save();
    c.translate(26, -34 + k * 3);
    c.rotate(-0.6 - k * 0.2);
    limb(c, 0, 4, 0, -22, 4, "#6b442c");
    ell(c, 0, -24, 5, 7, "#8a5a32");
    c.restore();
    limb(c, -12, -42, -20, -32, 4, "#7aa84a");
    ell(c, 0, -52, 13, 12, "#86b656");
    c.beginPath();
    c.moveTo(-12, -54);
    c.lineTo(-26, -60 - Math.abs(k) * 3);
    c.lineTo(-11, -48);
    c.moveTo(12, -54);
    c.lineTo(26, -60 - Math.abs(k) * 3);
    c.lineTo(11, -48);
    c.fillStyle = "#86b656";
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = INK;
    c.stroke();
    if (!back) {
      eye(c, -4.5, -53, 2.4, false);
      eye(c, 4.5, -53, 2.4, false);
      ell(c, -4.5, -53, 1, 1, "#e0c43a", false);
      ell(c, 4.5, -53, 1, 1, "#e0c43a", false);
      c.fillStyle = INK;
      c.fillRect(-4, -46, 8, 2);
    }
  },
  orc: (c, t, m, back) => orcBody(c, t, m, back, { skin: "#6e9a3e", armor: "#8a8f9a", cloth: "#6b442c", weapon: "axe" }),
  orczombie: (c, t, m, back) => orcBody(c, t, m, back, { skin: "#7a8a62", armor: "#5a5a50", cloth: "#4a4a3a", weapon: "club", rot: true }),
  orcskeleton: (c, t, m, back) => orcBody(c, t, m, back, { skin: "#efe9d8", armor: "#7a5a3a", cloth: "#6a6a62", weapon: "axe", bone: true, rot: true }),
  orchero: (c, t, m, back) => {
    c.save();
    c.shadowColor = "#e4b15a";
    c.shadowBlur = 10 + Math.sin(t * 3) * 3;
    orcBody(c, t, m, back, { skin: "#5f8a34", armor: "#c9a54a", cloth: "#7a2a22", weapon: "axe", boss: true });
    c.restore();
  },
};

let filterOk = true;

export function hasLook(look: string | undefined): look is string {
  return Boolean(look && LOOKS[look]);
}

export function drawCreature(
  c: Ctx,
  look: string,
  t: number,
  moving: boolean,
  dir: number,
  size: number,
  flash: number,
) {
  const fn = LOOKS[look];
  if (!fn) return;
  const s = size / 66;
  c.save();
  c.scale(s * (dir === 1 ? -1 : 1), s);
  if (flash > 0 && filterOk) {
    try {
      c.filter = "brightness(2.1) saturate(0.6)";
    } catch {
      filterOk = false;
    }
  }
  fn(c, t, moving ? 1 : 0, dir === 3);
  c.restore();
}
