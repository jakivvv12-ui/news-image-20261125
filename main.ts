// news-image-20261125 — "Sum up 25 November's world news in one image"
// A pure-Node (no dependencies, no network) program that draws a one-page
// newspaper front page for Wednesday 25 November 2026 and writes it as a
// deterministic 1024x1024 PNG to $MAKEFUN_OUTPUT_DIR/entry.png.
//
// The stories were verified against live reporting on 25 Nov 2026:
//  1. Ukraine says its naval drones sank the Russian corvette Merkury in
//     Benghazi harbour, Libya, and hit the cargo ship Angara; the sanctioned
//     cargo ship Sparta II also caught fire in the Gulf of Finland
//     (Reuters / CNN / The Times).
//  2. A drone struck Riyadh's 385 m PIF Tower, wounding 11 people — the
//     second strike on the tower in under a week (Reuters / Saudi Civil
//     Defense).
//  3. A US jury convicted Huawei on 10 of 12 counts, including conspiracy to
//     steal trade secrets and bank fraud; acquitted of racketeering
//     (Reuters / AP).
//  4. The CIA and the ODNI found a breach exposing some unclassified
//     information (New York Times, via Reuters).
//  5. Iran's Revolutionary Guard claims three oil tankers struck naval mines
//     and caught fire in the Strait of Hormuz; unverified (IRGC via IRNA /
//     Reuters).
// Also in brief: Nepal magnitude 5.6 quake; Trump awards the Presidential
// Medal of Freedom to Rudy Giuliani; NATO to send AWACS planes to Poland.
//
// Every pixel is drawn from scratch with a hand-built 5x7 bitmap font and a
// hand-rolled PNG encoder (raw RGB + zlib). No Date.now(), no Math.random(),
// no network: two runs produce byte-identical output.

import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

// ---------------------------------------------------------------------------
// Canvas size and palette
// ---------------------------------------------------------------------------

const W = 1024;
const H = 1024;

// Newsprint palette: warm paper, near-black ink, restrained accent colours.
const PAPER = [246, 241, 231];
const INK = [25, 21, 18];
const INK_SOFT = [74, 66, 58];
const RED = [163, 30, 30];
const NAVY = [29, 53, 87];
const GOLD = [176, 132, 32];
const TEAL = [32, 96, 96];
const SKY = [214, 228, 236];
const SEA = [58, 110, 140];
const SAND = [226, 214, 188];
const GREY = [148, 140, 128];
const WHITE = [255, 255, 255];


// ---------------------------------------------------------------------------
// 5x7 bitmap font. Every glyph is 7 rows of 5 bits ('1' = filled pixel).
// Uppercase, lowercase, digits and the punctuation this page needs.
// ---------------------------------------------------------------------------

const GLYPHS = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11100", "10010", "10001", "10001", "10001", "10010", "11100"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],

  a: ["00000", "00000", "01110", "00001", "01111", "10001", "01111"],
  b: ["10000", "10000", "11110", "10001", "10001", "10001", "11110"],
  c: ["00000", "00000", "01110", "10000", "10000", "10001", "01110"],
  d: ["00001", "00001", "01111", "10001", "10001", "10001", "01111"],
  e: ["00000", "00000", "01110", "10001", "11111", "10000", "01110"],
  f: ["00110", "01001", "01000", "11110", "01000", "01000", "01000"],
  g: ["00000", "01111", "10001", "10001", "01111", "00001", "01110"],
  h: ["10000", "10000", "11110", "10001", "10001", "10001", "10001"],
  i: ["00100", "00000", "01100", "00100", "00100", "00100", "01110"],
  j: ["00010", "00000", "00110", "00010", "00010", "10010", "01100"],
  k: ["10000", "10000", "10010", "10100", "11000", "10100", "10010"],
  l: ["01100", "00100", "00100", "00100", "00100", "00100", "01110"],
  m: ["00000", "00000", "11010", "10101", "10101", "10101", "10101"],
  n: ["00000", "00000", "11110", "10001", "10001", "10001", "10001"],
  o: ["00000", "00000", "01110", "10001", "10001", "10001", "01110"],
  p: ["00000", "00000", "11110", "10001", "10001", "11110", "10000"],
  q: ["00000", "00000", "01111", "10001", "10001", "01111", "00001"],
  r: ["00000", "00000", "10110", "11001", "10000", "10000", "10000"],
  s: ["00000", "00000", "01111", "10000", "01110", "00001", "11110"],
  t: ["01000", "01000", "11100", "01000", "01000", "01001", "00110"],
  u: ["00000", "00000", "10001", "10001", "10001", "10011", "01101"],
  v: ["00000", "00000", "10001", "10001", "10001", "01010", "00100"],
  w: ["00000", "00000", "10001", "10101", "10101", "10101", "01010"],
  x: ["00000", "00000", "10001", "01010", "00100", "01010", "10001"],
  y: ["00000", "00000", "10001", "10001", "01111", "00001", "01110"],
  z: ["00000", "00000", "11111", "00010", "00100", "01000", "11111"],

  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],

  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "+": ["00000", "00100", "00100", "01110", "00100", "00100", "00000"],
  "=": ["00000", "00000", "01110", "00000", "01110", "00000", "00000"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "*": ["00000", "10101", "01110", "10101", "00000", "00000", "00000"],
};

// A glyph the font does not know renders as a blank (never crashes the run).
const BLANK = ["00000", "00000", "00000", "00000", "00000", "00000", "00000"];

function glyphFor(ch) {
  return GLYPHS[ch] ?? BLANK;
}

// ---------------------------------------------------------------------------
// Canvas: a raw RGB buffer plus the drawing primitives the page needs.
// ---------------------------------------------------------------------------

class Canvas {
  w;
  h;
  px; // 3 bytes per pixel, row-major, no alpha

  constructor(w, h, bg) {
    this.w = w;
    this.h = h;
    this.px = Buffer.alloc(w * h * 3);
    this.fill(bg);
  }

  fill(c) {
    for (let i = 0; i < this.w * this.h; i++) {
      this.px[i * 3] = c[0];
      this.px[i * 3 + 1] = c[1];
      this.px[i * 3 + 2] = c[2];
    }
  }

  set(x, y, c) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 3;
    this.px[i] = c[0];
    this.px[i + 1] = c[1];
    this.px[i + 2] = c[2];
  }

  rect(x, y, w, h, c) {
    const x0 = Math.max(0, x);
    const y0 = Math.max(0, y);
    const x1 = Math.min(this.w, x + w);
    const y1 = Math.min(this.h, y + h);
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        const i = (yy * this.w + xx) * 3;
        this.px[i] = c[0];
        this.px[i + 1] = c[1];
        this.px[i + 2] = c[2];
      }
    }
  }

  // 1 px outline of a rectangle.
  frame(x, y, w, h, c) {
    this.rect(x, y, w, 1, c);
    this.rect(x, y + h - 1, w, 1, c);
    this.rect(x, y, 1, h, c);
    this.rect(x + w - 1, y, 1, h, c);
  }

  // Bresenham line.
  line(x0, y0, x1, y1, c) {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    for (;;) {
      this.set(x, y, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }

  // A 2 px thick line, drawn as two parallel 1 px lines.
  thickLine(x0, y0, x1, y1, c) {
    this.line(x0, y0, x1, y1, c);
    this.line(x0, y0 + 1, x1, y1 + 1, c);
  }

  circle(cx, cy, r, c) {
    if (r <= 0) return;
    for (let yy = -r; yy <= r; yy++) {
      const half = Math.floor(Math.sqrt(r * r - yy * yy));
      for (let xx = -half; xx <= half; xx++) {
        this.set(cx + xx, cy + yy, c);
      }
    }
  }

  ring(cx, cy, r, c) {
    if (r <= 0) return;
    for (let a = 0; a < 360; a += 1) {
      const rad = (a * Math.PI) / 180;
      this.set(Math.round(cx + r * Math.cos(rad)), Math.round(cy + r * Math.sin(rad)), c);
    }
  }

  // Filled triangle.
  triangle(x0, y0, x1, y1, x2, y2, c) {
    const minX = Math.min(x0, x1, x2);
    const maxX = Math.max(x0, x1, x2);
    const minY = Math.min(y0, y1, y2);
    const maxY = Math.max(y0, y1, y2);
    const d = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
    if (d === 0) return;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const a = ((y1 - y2) * (x - x2) + (x2 - x1) * (y - y2)) / d;
        const b = ((y2 - y0) * (x - x2) + (x0 - x2) * (y - y2)) / d;
        const cc = 1 - a - b;
        if (a >= 0 && b >= 0 && cc >= 0) this.set(x, y, c);
      }
    }
  }

  // Filled polygon (convex or concave) via the scanline / even-odd rule.
  polygon(points, c) {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of points) {
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    for (let y = minY; y <= maxY; y++) {
      const xs = [];
      for (let i = 0; i < points.length; i++) {
        const [x0, y0] = points[i];
        const [x1, y1] = points[(i + 1) % points.length];
        if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
          xs.push(Math.round(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0)));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = xs[k]; x <= xs[k + 1]; x++) this.set(x, y, c);
      }
    }
  }

  raw() {
    return this.px;
  }
}

// ---------------------------------------------------------------------------
// Text engine: measure, draw and word-wrap with the 5x7 font.
// One glyph cell is 6*scale wide (5 px glyph + 1 px gap) and 7*scale tall.
// ---------------------------------------------------------------------------

function textWidth(text, scale) {
  if (text.length === 0) return 0;
  return text.length * 6 * scale - scale; // no trailing gap after last glyph
}

function drawText(cv, text, x, y, scale, c) {
  let cx = x;
  for (const ch of text) {
    const g = glyphFor(ch);
    for (let r = 0; r < 7; r++) {
      const row = g[r];
      for (let col = 0; col < 5; col++) {
        if (row[col] === "1") {
          cv.rect(cx + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale;
  }
}

function drawTextCentered(cv, text, cx, y, scale, c) {
  drawText(cv, text, cx - Math.floor(textWidth(text, scale) / 2), y, scale, c);
}

// Greedy word wrap: returns lines that fit inside maxWidth px.
function wrapText(text, maxWidth, scale) {
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  for (const word of words) {
    const trial = cur === "" ? word : cur + " " + word;
    if (textWidth(trial, scale) <= maxWidth) {
      cur = trial;
    } else {
      if (cur !== "") lines.push(cur);
      // A single over-long word is split by characters so nothing overflows.
      if (textWidth(word, scale) > maxWidth) {
        let chunk = "";
        for (const ch of word) {
          if (textWidth(chunk + ch, scale) > maxWidth) {
            lines.push(chunk);
            chunk = ch;
          } else {
            chunk += ch;
          }
        }
        cur = chunk;
      } else {
        cur = word;
      }
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

// Draw a wrapped paragraph; returns the y just below the last line.
function drawParagraph(
  cv,
  text,
  x,
  y,
  maxWidth,
  scale,
  lineHeight,
  c,
) {
  const lines = wrapText(text, maxWidth, scale);
  let yy = y;
  for (const line of lines) {
    drawText(cv, line, x, yy, scale, c);
    yy += lineHeight;
  }
  return yy;
}

// ---------------------------------------------------------------------------
// Minimal PNG encoder: 8-bit RGB, no interlace, one filter byte (0) per row.
// Output is fully deterministic: zlib level 9, no timestamps anywhere.
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table.push(c >>> 0);
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  const crcBuf = Buffer.concat([Buffer.from(type, "ascii"), data]);
  out.writeUInt32BE(crc32(crcBuf), 8 + data.length);
  return out;
}

function encodePng(cv) {
  const w = cv.w;
  const h = cv.h;
  const raw = cv.raw();
  // One filter byte per scanline, then the row's RGB bytes.
  const scan = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    const dst = y * (1 + w * 3);
    scan[dst] = 0; // filter: None
    raw.copy(scan, dst + 1, y * w * 3, (y + 1) * w * 3);
  }
  const idat = zlib.deflateSync(scan, { level: 9 });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Small scene illustrations: simple geometric shapes, never fake photos.
// Each draws inside the given box (x, y, w, h) and stays inside it.
// ---------------------------------------------------------------------------

// Warship on the sea with a blast starburst above it.
function drawShipScene(cv, x, y, w, h) {
  cv.rect(x, y, w, h, SKY);
  // Sun / sky band.
  cv.circle(x + w - 46, y + 34, 22, GOLD);
  // Blast starburst (red + gold rays) just above the ship's bridge.
  const bx = x + Math.floor(w * 0.42);
  const by = y + 96;
  for (let a = 0; a < 12; a++) {
    const rad = (a * Math.PI) / 6;
    const len = a % 2 === 0 ? 40 : 24;
    cv.thickLine(
      bx,
      by,
      Math.round(bx + len * Math.cos(rad)),
      Math.round(by + len * Math.sin(rad)),
      a % 3 === 0 ? GOLD : RED,
    );
  }
  cv.circle(bx, by, 14, RED);
  cv.circle(bx, by, 7, GOLD);
  // Ship hull (dark) with a raked bow, bridge tower and mast.
  const hy = y + h - 74;
  cv.polygon(
    [
      [x + 18, hy],
      [x + w - 30, hy],
      [x + w - 8, hy + 26],
      [x + 30, hy + 26],
    ],
    NAVY,
  );
  cv.rect(x + 52, hy - 26, 46, 26, NAVY); // bridge block
  cv.rect(x + 96, hy - 18, 8, 18, NAVY); // funnel
  cv.thickLine(x + 128, hy, x + 128, hy - 44, INK); // mast
  cv.line(x + 128, hy - 44, x + 150, hy - 30, INK); // mast arm
  cv.rect(x + 150, hy - 34, 10, 6, RED); // flag
  // Portholes.
  for (let i = 0; i < 6; i++) {
    cv.circle(x + 52 + i * 26, hy + 13, 3, PAPER);
  }
  // Sea: three wave bands.
  cv.rect(x, hy + 30, w, h - (hy + 30) - y, SEA);
  cv.rect(x, hy + 30, w, 4, WHITE);
  for (let i = 0; i < 5; i++) {
    const wx = x + 14 + i * 58;
    cv.thickLine(wx, hy + 48, wx + 30, hy + 48, WHITE);
    cv.thickLine(wx + 8, hy + 62, wx + 38, hy + 62, WHITE);
  }
  // Small drone silhouette in the sky.
  const dx = x + w - 96;
  const dy = y + 78;
  cv.triangle(dx, dy, dx + 26, dy + 6, dx, dy + 12, INK);
  cv.line(dx + 4, dy + 6, dx - 12, dy + 2, INK);
  cv.line(dx + 4, dy + 6, dx - 12, dy + 10, INK);
}

// Skyscraper skyline strip: one tall tower with a smoke plume mid-facade.
// Designed for a wide, short box (about 468 x 56).
function drawTowerScene(cv, x, y, w, h) {
  cv.rect(x, y, w, h, SKY);
  const ground = y + h - 8;
  cv.rect(x, ground, w, 8, SAND);
  // Low blocks flanking the tall tower.
  const blocks = [
    [x + 12, 30, 22],
    [x + 48, 22, 34],
    [x + 250, 40, 26],
    [x + 296, 26, 36],
    [x + 330, 34, 20],
    [x + 372, 24, 30],
    [x + 404, 30, 24],
  ];
  for (const [bx, bw, bh] of blocks) {
    cv.rect(bx, ground - bh, bw, bh, INK_SOFT);
    for (let wy = ground - bh + 5; wy < ground - 5; wy += 8) {
      for (let wx = bx + 5; wx < bx + bw - 3; wx += 9) {
        cv.rect(wx, wy, 3, 3, GOLD);
      }
    }
  }
  // The tall tower itself, centre-left.
  const tx = x + 92;
  const tw = 34;
  const ty = y + 4;
  cv.rect(tx, ty, tw, ground - ty, NAVY);
  for (let wy = ty + 5; wy < ground - 5; wy += 7) {
    for (let wx = tx + 5; wx < tx + tw - 3; wx += 10) {
      cv.rect(wx, wy, 3, 3, GOLD);
    }
  }
  // Impact scorch + smoke drifting left from mid-facade.
  const iy = ty + Math.floor((ground - ty) * 0.45);
  cv.rect(tx - 3, iy - 3, tw + 6, 7, INK);
  cv.circle(tx - 10, iy - 8, 6, GREY);
  cv.circle(tx - 20, iy - 14, 8, GREY);
  cv.circle(tx - 32, iy - 20, 9, GREY);
  // Small drone silhouette near the tower top.
  cv.triangle(tx + tw + 22, y + 10, tx + tw + 40, y + 14, tx + tw + 22, y + 18, INK);
}

// Microchip with circuit traces running across a wide, short strip.
function drawChipScene(cv, x, y, w, h) {
  cv.rect(x, y, w, h, SAND);
  const s = Math.min(40, h - 10);
  const sx = x + 14;
  const sy = y + Math.floor((h - s) / 2);
  // Pins on all four sides.
  for (let i = 0; i < 3; i++) {
    const off = 6 + i * 12;
    cv.rect(sx + off, sy - 5, 4, 5, INK);
    cv.rect(sx + off, sy + s, 4, 5, INK);
    cv.rect(sx - 5, sy + off, 5, 4, INK);
    cv.rect(sx + s, sy + off, 5, 4, INK);
  }
  cv.rect(sx, sy, s, s, NAVY);
  cv.frame(sx + 5, sy + 5, s - 10, s - 10, GOLD);
  cv.circle(sx + Math.floor(s / 2), sy + Math.floor(s / 2), 5, GOLD);
  // Traces fanning out to the right, ending in node dots.
  const cy = y + Math.floor(h / 2);
  const traceYs = [cy - 16, cy - 8, cy, cy + 8, cy + 16];
  for (let i = 0; i < traceYs.length; i++) {
    const ty = traceYs[i];
    const endX = x + w - 70 - (i % 3) * 22;
    cv.thickLine(sx + s + 5, ty, endX, ty, i % 2 === 0 ? TEAL : INK_SOFT);
    cv.circle(endX, ty, 4, i % 2 === 0 ? TEAL : INK_SOFT);
  }
  // A second, smaller chip at the far right.
  const s2 = 22;
  cv.rect(x + w - 34, cy - Math.floor(s2 / 2), s2, s2, NAVY);
  cv.frame(x + w - 30, cy - Math.floor(s2 / 2) + 4, s2 - 8, s2 - 8, GOLD);
}

// Padlock with a warning triangle — a breach, drawn as a symbol, in a strip.
function drawLockScene(cv, x, y, w, h) {
  cv.rect(x, y, w, h, SKY);
  const cx = x + 34;
  const cy = y + Math.floor(h / 2) + 8;
  // Shackle.
  cv.ring(cx, cy - 16, 11, INK);
  cv.rect(cx - 12, cy - 16, 3, 16, INK);
  cv.rect(cx + 9, cy - 16, 3, 16, INK);
  // Body.
  cv.rect(cx - 18, cy - 2, 36, 26, NAVY);
  cv.frame(cx - 18, cy - 2, 36, 26, INK);
  // Keyhole.
  cv.circle(cx, cy + 7, 4, GOLD);
  cv.rect(cx - 2, cy + 7, 4, 9, GOLD);
  // A dotted data line running from the lock to the warning triangle.
  const ty = y + Math.floor(h / 2);
  for (let dx = cx + 30; dx < x + w - 52; dx += 12) {
    cv.rect(dx, ty - 2, 5, 4, TEAL);
  }
  // Warning triangle at the far right.
  const tx = x + w - 46;
  cv.triangle(tx, ty + 18, tx + 15, ty - 14, tx + 30, ty + 18, RED);
  drawText(cv, "!", tx + 11, ty - 4, 2, WHITE);
}

// Oil tanker with naval mines in the water, drawn as a wide strip.
function drawTankerScene(cv, x, y, w, h) {
  cv.rect(x, y, w, h, SKY);
  // Sun haze.
  cv.circle(x + 30, y + 14, 10, GOLD);
  const seaTop = y + h - 18;
  // Tanker hull and deck tanks, left of centre.
  const hy = seaTop - 12;
  cv.rect(x + 14, hy, 190, 12, RED);
  cv.rect(x + 14, hy - 3, 190, 3, INK);
  for (let i = 0; i < 4; i++) {
    cv.circle(x + 38 + i * 42, hy - 10, 8, WHITE);
    cv.frame(x + 30 + i * 42, hy - 18, 16, 16, INK);
  }
  cv.rect(x + 184, hy - 22, 20, 22, NAVY); // bridge
  // Smoke from a hit tank.
  cv.circle(x + 80, hy - 26, 6, GREY);
  cv.circle(x + 90, hy - 34, 8, GREY);
  // Sea with two spiked mines on the right.
  cv.rect(x, seaTop, w, h - (seaTop - y), SEA);
  cv.rect(x, seaTop, w, 3, WHITE);
  for (const [mx, my] of [
    [x + 300, seaTop + 9],
    [x + w - 40, seaTop + 9],
  ]) {
    cv.circle(mx, my, 6, INK);
    for (let a = 0; a < 8; a++) {
      const rad = (a * Math.PI) / 4;
      cv.line(mx, my, Math.round(mx + 10 * Math.cos(rad)), Math.round(my + 10 * Math.sin(rad)), INK);
    }
  }
}

// ---------------------------------------------------------------------------
// Page layout: a one-page newspaper front page, 1024 x 1024.
// ---------------------------------------------------------------------------

const LEAD = {
  kicker: "WAR AT SEA - LIBYA AND THE BALTIC",
  headline: "UKRAINE SINKS RUSSIAN WARSHIP",
  body: "Kyiv says seven naval drones sank the corvette Merkury in Benghazi harbour and hit the cargo ship Angara, which it says carried weapons. A sanctioned Russian cargo ship, Sparta II, also caught fire after a drone strike in the Gulf of Finland. Norway urged caution.",
  scene: drawShipScene,
};

const STORIES = [
  {
    kicker: "MIDDLE EAST - SAUDI ARABIA",
    headline: "DRONE HITS RIYADH'S TALLEST TOWER",
    body: "A drone struck the 385-metre PIF Tower, home of Saudi Arabia's wealth fund, wounding 11 people - the second strike on the tower in a week.",
    scene: drawTowerScene,
  },
  {
    kicker: "TECH AND TRADE - NEW YORK",
    headline: "HUAWEI GUILTY OF STEALING TRADE SECRETS",
    body: "A US jury convicted the Chinese telecom giant on 10 of 12 counts, including bank fraud and trade-secret theft. It was acquitted of racketeering.",
    scene: drawChipScene,
  },
  {
    kicker: "CYBERSECURITY - WASHINGTON",
    headline: "CIA AND ODNI HIT BY CYBER BREACH",
    body: "The CIA and the director of national intelligence's office found a breach that exposed some unclassified information. What was taken is unclear.",
    scene: drawLockScene,
  },
  {
    kicker: "ENERGY - THE GULF",
    headline: "IRAN SAYS TANKERS HIT MINES IN HORMUZ",
    body: "Iran's Revolutionary Guard claims three oil tankers struck naval mines and caught fire in the Strait of Hormuz. The claim is unverified.",
    scene: drawTankerScene,
  },
];

const ALSO_TODAY =
  "ALSO TODAY: Nepal quake, magnitude 5.6, shakes Koshi Province near the China border; no casualties reported. Trump awards the Medal of Freedom to Rudy Giuliani. NATO to send AWACS early-warning aircraft to Poland.";

const SOURCES = "Sources: Reuters, AP, CNN, The Times, The Hindu - reported 25 November 2026";

// Draw one of the four smaller story blocks (two-column rows).
function drawStoryBlock(cv, x, y, w, h, s) {
  drawText(cv, s.kicker, x, y, 2, RED);
  const lines = wrapText(s.headline, w, 3);
  let yy = y + 20;
  for (const line of lines) {
    drawText(cv, line, x, yy, 3, INK);
    yy += 25;
  }
  drawParagraph(cv, s.body, x, yy + 8, w, 2, 16, INK);
  s.scene(cv, x, y + h - 56, w, 56);
}

function buildPage() {
  const cv = new Canvas(W, H, PAPER);

  // Outer double border.
  cv.rect(8, 8, W - 16, 2, INK);
  cv.rect(8, H - 10, W - 16, 2, INK);
  cv.rect(8, 8, 2, H - 16, INK);
  cv.rect(W - 10, 8, 2, H - 16, INK);

  // ---- Masthead -----------------------------------------------------------
  drawTextCentered(cv, "THE WORLD IN ONE PAGE", 512, 28, 7, INK);
  cv.rect(32, 86, 960, 4, RED);
  drawTextCentered(cv, "WEDNESDAY, 25 NOVEMBER 2026", 512, 98, 4, RED);
  drawTextCentered(cv, "THE DAY'S NEWS FROM AROUND THE GLOBE", 512, 136, 2, INK_SOFT);
  cv.rect(32, 158, 960, 2, INK);

  // ---- Lead story ---------------------------------------------------------
  const leadY = 170;
  drawText(cv, LEAD.kicker, 36, leadY + 6, 2, RED);
  const leadLines = wrapText(LEAD.headline, 600, 5);
  let ly = leadY + 30;
  for (const line of leadLines) {
    drawText(cv, line, 36, ly, 5, INK);
    ly += 44;
  }
  drawParagraph(cv, LEAD.body, 36, ly + 8, 600, 2, 17, INK);
  LEAD.scene(cv, 660, leadY + 10, 328, 238);
  cv.rect(32, 436, 960, 2, INK);

  // ---- Middle row: Riyadh + Huawei ---------------------------------------
  const midY = 446;
  const rowH = 220;
  drawStoryBlock(cv, 32, midY, 468, rowH, STORIES[0]);
  cv.rect(512, midY, 1, rowH, INK_SOFT);
  drawStoryBlock(cv, 524, midY, 468, rowH, STORIES[1]);
  cv.rect(32, 672, 960, 2, INK);

  // ---- Bottom row: CIA/ODNI + Hormuz -------------------------------------
  const botY = 678;
  drawStoryBlock(cv, 32, botY, 468, rowH, STORIES[2]);
  cv.rect(512, botY, 1, rowH, INK_SOFT);
  drawStoryBlock(cv, 524, botY, 468, rowH, STORIES[3]);
  cv.rect(32, 904, 960, 2, INK);

  // ---- Also today + sources ----------------------------------------------
  drawParagraph(cv, ALSO_TODAY, 36, 920, 952, 2, 16, INK);
  cv.rect(32, 972, 960, 1, INK_SOFT);
  drawTextCentered(cv, SOURCES, 512, 984, 2, INK_SOFT);

  return cv;
}

// ---------------------------------------------------------------------------
// Entry point. Guard first: never write anywhere unless the output dir is set.
// ---------------------------------------------------------------------------

function main() {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR;
  if (!outDir) {
    throw new Error("MAKEFUN_OUTPUT_DIR is not set");
  }
  const png = encodePng(buildPage());
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "entry.png"), png);
}

main();
