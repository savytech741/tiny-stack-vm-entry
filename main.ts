// Tiny stack VM for make.fun's tiny-stack-vm-01 bounty (ISA v1): 32-bit
// wrapping ints, 256-value stack, 64-deep call stack, 256 words of memory,
// input/output, ten traps each with its own exit code.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Opcode table: opcode bytes, then one [immediate, pops, pushes] triple each.
const OPS = '0001020304050607101112131415161718191a1b1c1d1e2021223031323334404150515253';
const TRI = '000101401010012022023033021021021021021021021011021021021011021021021021021021200210210200000011020010010001010';
const TAB: Record<number, [number, number, number]> = {};
for (let k = 0; k < 37; k++)
  TAB[parseInt(OPS.slice(k * 2, k * 2 + 2), 16)] = [+TRI[k * 3], +TRI[k * 3 + 1], +TRI[k * 3 + 2]];

const MIN = -2147483648;

function run(p: Uint8Array, inp: Uint8Array): { out: Uint8Array; code: number } {
  const n = p.length;
  const D = new Int32Array(256);
  let sp = 0;
  const C = new Int32Array(64);
  let cp = 0;
  const M = new Int32Array(256);
  const out = new Uint8Array(65536);
  let ol = 0, ip = 0, pc = 0, steps = 0;
  const trap = (code: number) => ({ out: out.subarray(0, ol), code });
  for (;;) {
    if (steps === 1e6) return trap(10);
    if (pc < 0 || pc >= n) return trap(9);
    const op = p[pc];
    const t = TAB[op];
    if (!t) return trap(5);
    const [imm, pops, pushes] = t;
    if (pc + imm >= n) return trap(9);
    steps++;
    const nx = pc + 1 + imm;
    if (sp < pops) return trap(2);
    if (sp - pops + pushes > 256) return trap(3);
    pc = nx;
    switch (op) {
      case 0x00: return { out: out.subarray(0, ol), code: 0 };
      case 0x01: D[sp++] = (p[nx - 1] << 24) >> 24; break;
      case 0x02:
        D[sp++] = p[nx - 4] | (p[nx - 3] << 8) | (p[nx - 2] << 16) | (p[nx - 1] << 24);
        break;
      case 0x03: sp--; break;
      case 0x04: D[sp] = D[sp - 1]; sp++; break;
      case 0x05: { const x = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = x; break; }
      case 0x06: D[sp] = D[sp - 2]; sp++; break;
      case 0x07: {
        const a = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = a;
        break;
      }
      case 0x17: D[sp - 1] = -D[sp - 1] | 0; break;
      case 0x1b: D[sp - 1] = ~D[sp - 1]; break;
      case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15:
      case 0x16: case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d:
      case 0x1e: case 0x20: case 0x21: case 0x22: {
        const b = D[sp - 1], a = D[sp - 2];
        let r: number;
        if (op === 0x10) r = (a + b) | 0;
        else if (op === 0x11) r = (a - b) | 0;
        else if (op === 0x12) r = Math.imul(a, b);
        else if (op === 0x13) {
          if (b === 0) return trap(4);
          r = a === MIN && b === -1 ? a : (a / b) | 0;
        } else if (op === 0x14) {
          if (b === 0) return trap(4);
          r = b === -1 ? 0 : (a % b) | 0;
        } else if (op === 0x15) {
          if (b === 0) return trap(4);
          r = Math.floor((a >>> 0) / (b >>> 0)) | 0;
        } else if (op === 0x16) {
          if (b === 0) return trap(4);
          r = ((a >>> 0) % (b >>> 0)) | 0;
        } else if (op === 0x18) r = a & b;
        else if (op === 0x19) r = a | b;
        else if (op === 0x1a) r = a ^ b;
        else if (op === 0x1c) r = a << (b & 31);
        else if (op === 0x1d) r = a >> (b & 31);
        else if (op === 0x1e) r = (a >>> (b & 31)) | 0;
        else if (op === 0x20) r = a === b ? 1 : 0;
        else if (op === 0x21) r = a < b ? 1 : 0;
        else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
        sp -= 2;
        D[sp++] = r;
        break;
      }
      case 0x30: case 0x31: case 0x32: {
        const rel = ((p[nx - 2] | (p[nx - 1] << 8)) << 16) >> 16;
        let take = true;
        if (op !== 0x30) take = op === 0x31 ? D[--sp] === 0 : D[--sp] !== 0;
        if (take) pc = nx + rel;
        break;
      }
      case 0x33:
        if (cp === 64) return trap(7);
        C[cp++] = nx;
        pc = p[nx - 2] | (p[nx - 1] << 8);
        break;
      case 0x34:
        if (cp === 0) return trap(8);
        pc = C[--cp];
        break;
      case 0x40: {
        const a = D[sp - 1];
        if (a < 0 || a >= 256) return trap(6);
        D[sp - 1] = M[a];
        break;
      }
      case 0x41: {
        const a = D[sp - 1], v = D[sp - 2];
        if (a < 0 || a >= 256) return trap(6);
        sp -= 2;
        M[a] = v;
        break;
      }
      case 0x50: {
        const s = String(D[sp - 1]);
        if (ol + s.length > 65536) return trap(11);
        sp--;
        for (let i = 0; i < s.length; i++) out[ol++] = s.charCodeAt(i);
        break;
      }
      case 0x51:
        if (ol + 1 > 65536) return trap(11);
        out[ol++] = D[--sp] & 255;
        break;
      case 0x52:
        D[sp++] = ip < inp.length ? inp[ip++] : -1;
        break;
      case 0x53:
        return { out: out.subarray(0, ol), code: D[--sp] & 255 };
    }
  }
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  const r = run(
    new Uint8Array(readFileSync(join(I, id, 'program.bin'))),
    new Uint8Array(readFileSync(join(I, id, 'input.bin'))),
  );
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), r.out);
  writeFileSync(join(O, id, 'exit.txt'), `${r.code}\n`);
}
