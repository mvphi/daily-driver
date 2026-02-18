import { useCallback, useRef } from "react";

type SoundGroup = "1u" | "shift" | "enter" | "spacebar";

const SOUNDS: Record<SoundGroup, string[]> = {
  "1u": [
    "/audio/Savage65-1u-1.m4a",
    "/audio/Savage65-1u-2.m4a",
    "/audio/Savage65-1u-3.m4a",
    "/audio/Savage65-1u-4.m4a",
  ],
  shift: [
    "/audio/Savage65-Shift-1.m4a",
    "/audio/Savage65-Shift-2.m4a",
    "/audio/Savage65-Shift-3.m4a",
  ],
  enter: [
    "/audio/Savage65-Enter-1.m4a",
    "/audio/Savage65-Enter-2.m4a",
    "/audio/Savage65-Enter-3.m4a",
  ],
  spacebar: [
    "/audio/Savage65-Spacebar-1.m4a",
    "/audio/Savage65-Spacebar-2.m4a",
    "/audio/Savage65-Spacebar-3.m4a",
  ],
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getGroup(code: string): SoundGroup {
  if (code === "Space") return "spacebar";
  if (code === "Enter" || code === "ShiftRight" || code === "Backspace") return "enter";
  if (code === "ShiftLeft" || code === "Tab" || code === "CapsLock") return "shift";
  return "1u";
}

export function useKeyboardSound() {
  const queues = useRef<Record<SoundGroup, string[]>>({
    "1u": shuffle(SOUNDS["1u"]),
    shift: shuffle(SOUNDS.shift),
    enter: shuffle(SOUNDS.enter),
    spacebar: shuffle(SOUNDS.spacebar),
  });

  const playSound = useCallback((code: string) => {
    const group = getGroup(code);

    if (queues.current[group].length === 0) {
      queues.current[group] = shuffle(SOUNDS[group]);
    }

    const src = queues.current[group].pop()!;
    const audio = new Audio(src);
    audio.play().catch(() => {});
  }, []);

  return { playSound };
}
