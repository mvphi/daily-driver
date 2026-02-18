"use client";

import { useRef, useEffect } from "react";
import { useKeyboardSound } from "./hooks/useKeyboardSound";

export default function Home() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { playSound } = useKeyboardSound();

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <div className="min-h-screen h-full w-full flex flex-col justify-center items-center bg-[#E5E0E0]">
      {/* Texture overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-100 size-full bg-cover bg-center bg-no-repeat mix-blend-overlay"
        style={{ backgroundImage: "url(/images/Texture.png)" }}
        aria-hidden
      />

      {/* Two-column layout: centered, equal width */}
      <main className="relative z-10 m-auto flex h-fit w-fit max-w-[960px] flex-row flex-nowrap justify-start items-start gap-[72px]">
        {/* LEFT COLUMN — 50%, content 370px, vertically distributed */}
        <div className="flex min-h-full w-[370px] flex-col items-center justify-center py-0 pr-0 font-mono text-black">
          <div
            className="flex h-fit w-[370px] flex-col items-end justify-between"
            style={{
              display: "flex",
              flexDirection: "column",
              alignSelf: "stretch",
              alignItems: "flex-end",
            }}
          >
            {/* 1. Keyboard details — outer */}
            <div
              className="flex flex-col items-start gap-6"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                alignSelf: "stretch",
              }}
            >
              {/* CANNON KEYS */}
              <div
                className="flex items-start justify-between"
                style={{ alignSelf: "stretch" }}
              >
                <span className="text-sm font-semibold tracking-tight">CANNON KEYS</span>
                <div
                  className="flex flex-col items-end"
                  style={{ width: "150px" }}
                >
                  <span className="text-sm tracking-tight">SAVAGE 65</span>
                  <span className="text-sm tracking-tight">6.25u FR4 PLATE</span>
                  <span className="text-sm tracking-tight">
                    INSTANT 65 HOTSWAP
                  </span>
                </div>
              </div>
              {/* MECHS ON DECK */}
              <div
                className="flex items-start justify-between"
                style={{ alignSelf: "stretch" }}
              >
                <span className="text-sm font-semibold tracking-tight">MECHS ON DECK</span>
                <span className="text-sm tracking-tight">ANUBIS SWITCHES</span>
              </div>
              {/* OSUME */}
              <div
                className="flex items-start justify-between"
                style={{ alignSelf: "stretch" }}
              >
                <span className="text-sm font-semibold tracking-tight">OSUME</span>
                <div
                  className="flex flex-col items-end"
                  style={{ width: "150px" }}
                >
                  <span className="text-sm tracking-tight">MATCHA KEYCAPS</span>
                  <span className="text-sm tracking-tight">CHERRY PROFILE</span>
                </div>
              </div>
            </div>

            {/* 2. Keyboard image — cover, centered */}
            <div
              className="flex w-[370px] shrink-0 justify-center bg-[#E5E0E0]"
              style={{
                height: "220px",
                alignSelf: "stretch",
                alignItems: "center",
              }}
            >
              <div
                className="h-full w-full bg-center bg-no-repeat"
                style={{
                  backgroundImage: "url(/images/Savage65-Animated.gif)",
                  backgroundSize: "cover",
                  mixBlendMode: "multiply",
                }}
                role="img"
                aria-label="Savage 65 mechanical keyboard"
              />
            </div>

            {/* 3. Ancillary details — year left, download right */}
            <footer
              className="flex w-full shrink-0 items-center justify-between text-sm tracking-tight"
              style={{ alignSelf: "stretch" }}
            >
              <span className="text-[#595959]">[2022]</span>
              <a
                href="public/instant65.json"
                download="instant65.json"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 no-underline text-[#595959] hover:underline"
                aria-label="Download layout JSON"
              >
                <img src="/icons/download-icon.svg" alt="" width={16} height={16} className="shrink-0" aria-hidden />
                LAYOUT.JSON
              </a>
            </footer>
          </div>
        </div>

        {/* RIGHT COLUMN — 50%, full-height textarea */}
        <div className="flex h-full min-h-full w-[370px] flex-col pl-0">
          <textarea
            ref={textareaRef}
            placeholder="START TYPING..."
            autoFocus
            rows={1}
            onKeyDown={(e) => playSound(e.code)}
            className="textarea-no-scrollbar font-mono h-full w-full min-h-[424px] resize-none overflow-y-auto border-none bg-transparent py-0 text-sm text-black outline-none placeholder:text-[#999999] focus:ring-0"
            style={{ overflowWrap: "break-word" }}
          />
        </div>
      </main>
    </div>
  );
}
