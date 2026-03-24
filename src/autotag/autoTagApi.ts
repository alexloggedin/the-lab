import type { FileMetadata } from '../types';
import { analyzeFullBuffer } from 'realtime-bpm-analyzer';

// ─── Constants ────────────────────────────────────────────────────────────────

// Maximum seconds of audio to analyse. Processing the entire file is slow
// for long tracks and offers diminishing accuracy gains past ~60s.
const MAX_ANALYSIS_SECONDS = 60;

// FFT size used for both BPM and key analysis.
// 2048 gives 1024 frequency bins — enough resolution for both algorithms.
// Must be a power of 2.
// Reference: https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/fftSize
const FFT_SIZE = 2048;

// ─── Krumhansl-Schmuckler key profiles ───────────────────────────────────────
//
// These 12-element arrays represent the "tonal hierarchy" of each pitch class
// in major and minor keys respectively — how prominent each of the 12 semitones
// tends to be in a typical piece in that key.
//
// Source: Krumhansl, C.L. (1990). Cognitive Foundations of Musical Pitch.
// These specific values are from the original 1990 study and are widely used
// in music information retrieval systems.

const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

// Note names in chromatic order (starting at C)
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// ─── Main exported function ───────────────────────────────────────────────────

/**
 * Fetch an audio file from the DAV server and analyse its BPM and musical key.
 *
 * Returns a partial FileMetadata containing only the fields that were
 * successfully detected. The caller (MetadataEditor) merges this into
 * the existing draft, so undetected fields are not overwritten.
 *
 * Genre is intentionally omitted — auto-genre detection requires a large
 * ML classifier and is out of scope for client-side analysis.
 */
export async function autoTagFromFile(streamUrl: string, authHeader?: string): Promise<Partial<FileMetadata>> {
  // Step 1: Fetch the raw compressed audio (WAV, MP3, etc.)

  console.log(`[AutoTagApi] StreamUrl:`, streamUrl)
  const response = await fetch(streamUrl, {
    credentials: authHeader ? 'omit' : 'include',
    headers: authHeader ? { Authorization: authHeader } : {},
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch audio file: ${response.status}`);
  }

  console.log(`[AutoTagApi] Fetch Response:`, response)

  const compressedBuffer = await response?.arrayBuffer();

  console.log(`[AutoTagApi]: Array Buffer`, compressedBuffer)

  // Step 2: Decode the compressed audio into raw PCM samples.
  //
  // We use OfflineAudioContext rather than AudioContext because:
  // - AudioContext decodes in real time (a 3 min file takes 3 min)
  // - OfflineAudioContext renders as fast as the CPU allows
  //
  // The sample count (second argument) just needs to be non-zero for
  // decoding — we override it below once we know the actual duration.
  // We use a temporary context just for decoding.
  //
  // Reference: https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext
  const tempContext = new OfflineAudioContext(1, 1, 44100);
  const audioBuffer = await tempContext.decodeAudioData(compressedBuffer);

  console.log("[AutoTagApi]: audioBuffer", audioBuffer)

  // Step 3: Run both analyses on the decoded buffer in parallel.
  // They're independent so there's no reason to run them sequentially.
  const [bpm, key] = await Promise.all([
    detectBpm(audioBuffer),
    detectKey(audioBuffer),
  ]);

  console.log("[AutoTagApi]: Key & BPM", bpm, key)

  return {
    bpm: bpm ? String(Math.round(bpm)) : undefined,
    key: key ?? undefined,
  };
}

// ─── BPM Detection ──────────────────────────────────────────

async function detectBpm(audioBuffer: AudioBuffer): Promise<number> {
  // Create analyzer

  const tempos = await analyzeFullBuffer(audioBuffer);;

  // Get the top BPM candidate
  const topTempo = tempos[0];

  return topTempo.tempo;
}

// ─── Key Detection via Krumhansl-Schmuckler ───────────────────────────────────

/**
 * Detect the musical key of an AudioBuffer using the Krumhansl-Schmuckler
 * pitch-class profile correlation algorithm.
 *
 * This is the same algorithm used by libKeyFinder (which powers
 * dogayuksel/webKeyFinder, Traktor, and Mixxx). The implementation here
 * works directly on the Web Audio API frequency data without requiring
 * the WASM module.
 *
 * Steps:
 * 1. Build a chromagram from the file's frequency data
 * 2. Correlate the chromagram against the 24 key profiles (12 major, 12 minor)
 * 3. Return the key name with the highest correlation score
 *
 * Reference:
 * - Krumhansl, C.L. (1990). Cognitive Foundations of Musical Pitch.
 * - https://github.com/dogayuksel/webKeyFinder (libKeyFinder in WASM)
 */
async function detectKey(audioBuffer: AudioBuffer): Promise<string | null> {
  const sampleRate = audioBuffer.sampleRate;
  const analysisFrames = Math.min(
    audioBuffer.length,
    MAX_ANALYSIS_SECONDS * sampleRate
  );

  // Chromagram: 12 bins, one per pitch class (C through B)
  // We accumulate energy across all frames, then normalise at the end
  const chroma = new Float32Array(12).fill(0);

  const hopSize = FFT_SIZE;

  for (let offset = 0; offset + hopSize <= analysisFrames; offset += hopSize) {
    const chunk = audioBuffer.getChannelData(0).slice(offset, offset + hopSize);
    const fftData = await renderFftChunk(chunk, sampleRate);

    // Map each FFT frequency bin to its pitch class and accumulate energy
    accumulateChroma(fftData, chroma, sampleRate);
  }

  return correlateChromaToKey(chroma);
}

/**
 * Map FFT frequency bins onto the 12 pitch classes and accumulate energy.
 *
 * Each frequency bin corresponds to a specific frequency in Hz.
 * We convert that frequency to a MIDI note number, take mod 12 to get
 * the pitch class (ignoring octave), and add the bin's energy to that
 * pitch class's accumulator.
 *
 * Only bins in the range 80–2000 Hz are used — below 80 Hz is sub-bass
 * with no pitch information, above 2000 Hz is harmonics that add noise.
 */
function accumulateChroma(
  fftData: Float32Array,
  chroma: Float32Array,
  sampleRate: number
): void {
  const binCount = fftData.length;
  const nyquist = sampleRate / 2;

  for (let i = 1; i < binCount; i++) {
    const freqHz = (i / binCount) * nyquist;

    // Skip frequencies outside the musically informative range
    if (freqHz < 80 || freqHz > 2000) continue;

    // Convert frequency to MIDI note number.
    // MIDI note 69 = A4 = 440 Hz. log2(freq/440) * 12 + 69 gives the
    // fractional MIDI note. Math.round gives the nearest semitone.
    const midiNote = Math.round(12 * Math.log2(freqHz / 440) + 69);

    // Pitch class is MIDI note mod 12, clamped to [0, 11]
    const pitchClass = ((midiNote % 12) + 12) % 12;

    chroma[pitchClass] += fftData[i];
  }
}

/**
 * Correlate a chromagram against all 24 Krumhansl-Schmuckler key profiles
 * and return the key name with the highest Pearson correlation coefficient.
 *
 * We test all 12 rotations of both the major and minor profiles — one rotation
 * per starting pitch class. The best-matching rotation identifies the key.
 */
function correlateChromaToKey(chroma: Float32Array): string | null {
  // Guard: if the chroma is all zeros, the file was silence
  if (chroma.every(v => v === 0)) return null;

  let bestKey = '';
  let bestScore = -Infinity;

  for (let root = 0; root < 12; root++) {
    // Rotate the profile so root note aligns with index 0
    const majorScore = pearsonCorrelation(chroma, rotateProfile(MAJOR_PROFILE, root));
    const minorScore = pearsonCorrelation(chroma, rotateProfile(MINOR_PROFILE, root));

    if (majorScore > bestScore) {
      bestScore = majorScore;
      bestKey = NOTE_NAMES[root];          // e.g. "C", "F#"
    }
    if (minorScore > bestScore) {
      bestScore = minorScore;
      bestKey = NOTE_NAMES[root] + 'm';   // e.g. "Am", "C#m"
    }
  }

  return bestKey || null;
}

/** Rotate a 12-element profile array by `steps` semitones */
function rotateProfile(profile: number[], steps: number): number[] {
  return [...profile.slice(steps), ...profile.slice(0, steps)];
}

/**
 * Pearson correlation coefficient between two equal-length arrays.
 * Returns a value in [-1, 1] where 1 means perfect positive correlation.
 * This is the standard way to compare two distributions.
 */
function pearsonCorrelation(a: Float32Array, b: number[]): number {
  const n = a.length;
  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;

  let num = 0, denomA = 0, denomB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denomA += da * da;
    denomB += db * db;
  }

  const denom = Math.sqrt(denomA * denomB);
  return denom === 0 ? 0 : num / denom;
}

async function renderFftChunk(
  samples: Float32Array,
  sampleRate: number
): Promise<Float32Array> {
  // Create a short offline context — just long enough for one FFT window
  const offlineCtx = new OfflineAudioContext(1, samples.length, sampleRate);

  // Wrap the raw PCM samples in an AudioBuffer
  const chunkBuffer = offlineCtx.createBuffer(1, samples.length, sampleRate);
  chunkBuffer.copyToChannel(samples, 0);

  // Source node plays the chunk
  const source = offlineCtx.createBufferSource();
  source.buffer = chunkBuffer;

  // AnalyserNode captures the frequency spectrum
  const analyser = offlineCtx.createAnalyser();
  analyser.fftSize = FFT_SIZE;

  source.connect(analyser);
  // Connect analyser to destination so the offline context renders it
  analyser.connect(offlineCtx.destination);
  source.start(0);

  // startRendering() processes the graph and fires the oncomplete event.
  // We don't need the rendered output buffer — just the analyser data.
  await offlineCtx.startRendering();

  const fftData = new Float32Array(analyser.frequencyBinCount);
  analyser.getFloatFrequencyData(fftData);

  // BeatDetektor expects values in [0, 1]. getFloatFrequencyData() returns
  // dB values in the range [-Infinity, 0]. Normalize by mapping [-100, 0] dB
  // to [0, 1] and clamping — this matches the scale BeatDetektor was designed for.
  return fftData.map(db => Math.max(0, Math.min(1, (db + 100) / 100)));
}