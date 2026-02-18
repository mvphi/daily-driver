"use client";

import { useRef, useEffect, useLayoutEffect, useState } from "react";
import { useKeyboardSound } from "./hooks/useKeyboardSound";

/** Renders text with a blurred duplicate directly behind it for an ink-bleed effect (no offset). */
function InkBleed({
  children,
  className = "",
  style,
  as: Tag = "span",
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  as?: "span" | "div";
  [key: string]: unknown;
}) {
  const textClass = className.trim();
  return (
    <Tag className="relative inline-block w-fit" {...props}>
      {/* Invisible sizer: sets wrapper dimensions so absolute layers don't affect layout */}
      <Tag className={`invisible inline-block w-fit ${textClass}`} aria-hidden>
        {children}
      </Tag>
      {/* Blur and sharp at same (0,0) so there is no offset — true ink bleed */}
      <Tag
        className={`absolute left-0 top-0 ink-bleed-blur ${textClass}`}
        style={style}
        aria-hidden
      >
        {children}
      </Tag>
      <Tag className={`absolute left-0 top-0 z-10 ${textClass}`} style={style}>
        {children}
      </Tag>
    </Tag>
  );
}

export default function Home() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const leftImageRef = useRef<HTMLDivElement>(null);
  const headerImageRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const imageRectRef = useRef<DOMRect | null>(null);
  const textareaMirrorRef = useRef<HTMLDivElement>(null);
  const caretMeasureRef = useRef<HTMLDivElement>(null);
  const adjustScrollRef = useRef<(() => void) | null>(null);
  const { playSound } = useKeyboardSound();
  const [isFocused, setIsFocused] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [centerOffset, setCenterOffset] = useState(0);
  const [vvHeight, setVvHeight] = useState<number | null>(null);
  const [textareaValue, setTextareaValue] = useState("");
  const [ckPreviewPos, setCkPreviewPos] = useState<{ x: number; y: number } | null>(null);
  const [anubisPreviewPos, setAnubisPreviewPos] = useState<{ x: number; y: number } | null>(null);
  const [osumePreviewPos, setOsumePreviewPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const touch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    setIsTouch(touch);

    if (!touch) {
      textareaRef.current?.focus();
      return;
    }

    const update = () => {
      if (!mainRef.current || !outerRef.current) return;
      const offset = Math.max(0, (outerRef.current.clientHeight - mainRef.current.offsetHeight) / 2);
      setCenterOffset(offset);
    };

    update();
    const resizeObs = new ResizeObserver(update);
    if (mainRef.current) resizeObs.observe(mainRef.current);
    window.addEventListener("resize", update);
    return () => {
      resizeObs.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  // Sync textarea mirror height to textarea (for ink bleed)
  useEffect(() => {
    const el = textareaRef.current;
    const mirror = textareaMirrorRef.current;
    if (!el || !mirror) return;
    mirror.style.minHeight = `${el.scrollHeight}px`;
  }, [textareaValue]);

  // Keyboard avoidance: center the caret line in the visible area below the fixed header when focused on touch.
  useEffect(() => {
    if (!isTouch || !isFocused) return;

    const vv = window.visualViewport;
    if (!vv) return;

    const outer = outerRef.current;
    const ta = textareaRef.current;
    const header = headerRef.current;
    const measureEl = caretMeasureRef.current;

    const adjustScroll = () => {
      if (!ta || !outer || outer.clientHeight <= 0) return;
      if (document.activeElement !== ta) return;

      // Visible region: from bottom of fixed header to bottom of visual viewport
      const headerBottom = header ? header.getBoundingClientRect().bottom : vv.offsetTop;
      const visibleBottomY = vv.offsetTop + vv.height;
      const visibleCenter = headerBottom + (visibleBottomY - headerBottom) / 2;

      // Caret line center: measure text height up to selectionStart, then line center
      let caretLineCenterY: number;
      if (measureEl) {
        const start = ta.selectionStart;
        measureEl.textContent = textareaValue.substring(0, start);
        const measuredHeight = measureEl.offsetHeight;
        const lineHeight =
          parseFloat(getComputedStyle(ta).lineHeight) || parseFloat(getComputedStyle(ta).fontSize) * 1.2;
        caretLineCenterY = ta.getBoundingClientRect().top + measuredHeight - lineHeight / 2;
      } else {
        const textareaRect = ta.getBoundingClientRect();
        caretLineCenterY = textareaRect.top + textareaRect.height / 2;
      }

      const delta = caretLineCenterY - visibleCenter;
      const layoutMaxScroll = Math.max(0, outer.scrollHeight - outer.clientHeight);
      // When keyboard is open, don't allow scrolling content into the keyboard: cap max scroll
      // so the bottom of the content stays at or above the visual viewport bottom.
      const outerTop = outer.getBoundingClientRect().top;
      const maxScrollWithKeyboard = Math.max(0, outer.scrollHeight - (visibleBottomY - outerTop));
      const maxScroll = Math.min(layoutMaxScroll, maxScrollWithKeyboard);
      const newScrollTop = Math.max(0, Math.min(maxScroll, outer.scrollTop + delta));
      outer.scrollTo({ top: newScrollTop, behavior: "smooth" });
    };

    adjustScrollRef.current = adjustScroll;
    const timeoutId = setTimeout(adjustScroll, 400);
    vv.addEventListener("resize", adjustScroll);
    vv.addEventListener("scroll", adjustScroll);
    document.addEventListener("selectionchange", adjustScroll);

    return () => {
      adjustScrollRef.current = null;
      clearTimeout(timeoutId);
      vv.removeEventListener("resize", adjustScroll);
      vv.removeEventListener("scroll", adjustScroll);
      document.removeEventListener("selectionchange", adjustScroll);
    };
  }, [isTouch, isFocused, textareaValue]);

  // When user types, recenter the caret line after the DOM updates (measure div + layout).
  useEffect(() => {
    if (!isTouch || !isFocused) return;
    const raf = requestAnimationFrame(() => {
      adjustScrollRef.current?.();
    });
    return () => cancelAnimationFrame(raf);
  }, [isTouch, isFocused, textareaValue]);

  // Capture the left-column image rect BEFORE state changes, then trigger focus.
  const handleFocus = () => {
    if (isTouch && leftImageRef.current) {
      imageRectRef.current = leftImageRef.current.getBoundingClientRect();
    }
    setIsFocused(true);
  };

  // FLIP: when focus state changes, animate the header image between positions.
  useLayoutEffect(() => {
    const el = headerImageRef.current;
    if (!el) return;

    if (!isTouch) {
      el.style.opacity = "0";
      el.style.transition = "none";
      el.style.transform = "";
      return;
    }

    if (isFocused && imageRectRef.current) {
      // Forward — fly from left-column position to header position.
      const fromRect = imageRectRef.current;
      const toRect = el.getBoundingClientRect();

      const fromCX = fromRect.left + fromRect.width / 2;
      const fromCY = fromRect.top + fromRect.height / 2;
      const toCX = toRect.left + toRect.width / 2;
      const toCY = toRect.top + toRect.height / 2;

      const dx = fromCX - toCX;
      const dy = fromCY - toCY;
      const sx = fromRect.width / toRect.width;
      const sy = fromRect.height / toRect.height;

      el.style.transition = "none";
      el.style.opacity = "1";
      el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
      el.getBoundingClientRect(); // force reflow before play
      el.style.transition = "transform 400ms var(--ease-spring)";
      el.style.transform = "";
    } else {
      // Reverse — fade out (instantly on first render, with transition after).
      if (imageRectRef.current) {
        el.style.transition = "opacity 250ms var(--ease-spring)";
      } else {
        el.style.transition = "none";
      }
      el.style.opacity = "0";
      el.style.transform = "";
    }
  }, [isFocused, isTouch]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    const mirror = textareaMirrorRef.current;
    setTextareaValue(target.value);
    target.style.height = "auto";
    target.style.height = `${target.scrollHeight}px`;
    if (mirror) mirror.style.minHeight = `${target.scrollHeight}px`;
  };

  // Delay iOS keyboard by temporarily setting inputMode to none,
  // then restoring it after the animation has time to play.
  const handleTextareaTouchStart = () => {
    if (!isTouch || isFocused) return;
    if (textareaRef.current) {
      textareaRef.current.inputMode = "none";
    }
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.inputMode = "text";
      }
    }, 420);
  };

  const animated = isTouch && isFocused;

  const rowStyle = (delay: number): React.CSSProperties => ({
    opacity: animated ? 0 : 1,
    transform: animated ? "translateY(-10px)" : "translateY(0)",
    transition: "opacity 250ms var(--ease-spring-soft), transform 250ms var(--ease-spring-soft)",
    transitionDelay: `${delay}ms`,
  });

  return (
    <div
      ref={outerRef}
      className="min-h-dvh w-full flex flex-col justify-start items-center overflow-hidden bg-[#E5E0E0] min-[812px]:justify-center"
      style={{
        paddingTop: `calc(${isFocused ? 0 : centerOffset}px + env(safe-area-inset-top, 0px))`,
        paddingRight: "env(safe-area-inset-right, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        transition: "padding-top 400ms var(--ease-spring)",
      }}
    >
      {/* Texture overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-[100] size-full bg-cover bg-center bg-no-repeat mix-blend-overlay"
        style={{ backgroundImage: "url(/images/Texture.png)" }}
        aria-hidden
      />

      {/* Savage65 link hover preview — 100px image following cursor to bottom-right */}
      {ckPreviewPos && (
        <div
          className="pointer-events-none fixed z-[110]"
          style={{
            left: ckPreviewPos.x + 12,
            top: ckPreviewPos.y + 12,
            width: "144px",
            zIndex: 50,
            boxShadow: "0 0 10px 0 rgba(0, 0, 0, 0.25)",
          }}
        >
          <img
            src="/images/link-out/ck-preview.png"
            alt=""
            width={100}
            height="auto"
            className="block w-full h-auto"
            aria-hidden
          />
        </div>
      )}

      {/* Anubis link hover preview — 100px image following cursor to bottom-right */}
      {anubisPreviewPos && (
        <div
          className="pointer-events-none fixed z-[110]"
          style={{
            left: anubisPreviewPos.x + 12,
            top: anubisPreviewPos.y + 12,
            width: "144px",
            zIndex: 50,
            boxShadow: "0 0 10px 0 rgba(0, 0, 0, 0.25)",
          }}
        >
          <img
            src="/images/link-out/anubis-preview.png"
            alt=""
            width={100}
            height="auto"
            className="block w-full h-auto"
            aria-hidden
          />
        </div>
      )}

      {/* Osume Matcha link hover preview — 100px image following cursor to bottom-right */}
      {osumePreviewPos && (
        <div
          className="pointer-events-none fixed z-[110]"
          style={{
            left: osumePreviewPos.x + 12,
            top: osumePreviewPos.y + 12,
            width: "144px",
            zIndex: 50,
            boxShadow: "0 0 10px 0 rgba(0, 0, 0, 0.25)",
          }}
        >
          <img
            src="/images/link-out/osume-preview.png"
            alt=""
            width={100}
            height="auto"
            className="block w-full h-auto"
            aria-hidden
          />
        </div>
      )}

      {/* Fixed header — image + label, shown only when animated on touch.
          Sits above the scroll content with a gradient/blur bleed. */}
      <div
        ref={headerRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: "max(24px, env(safe-area-inset-top, 0px))",
          // paddingBottom: "max(64px, env(safe-area-inset-bottom, 0px))",
          paddingBottom: animated
            ? "min(96px, max(64px, env(safe-area-inset-bottom, 0px)))" // max padding when focused: change 96px to cap
            : "max(64px, env(safe-area-inset-bottom, 0px))",
          paddingLeft: "env(safe-area-inset-left, 0px)",
          paddingRight: "env(safe-area-inset-right, 0px)",
          pointerEvents: animated ? "auto" : "none",
          cursor: "pointer",
        }}
        onClick={() => textareaRef.current?.blur()}
      >
        {/* Gradient + progressive blur background — fades in separately */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, #E5E0E0 0%, #E5E0E0 40%, rgba(229,224,224,0) 100%)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            maskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
            opacity: animated ? 1 : 0,
            transition: "opacity 300ms var(--ease-spring)",
            transitionDelay: animated ? "100ms" : "0ms",
          }}
        />

        {/* Content: label + image */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <InkBleed
            className="font-mono text-sm tracking-tight whitespace-nowrap"
            style={{
              color: "#595959",
              opacity: animated ? 1 : 0,
              transition: "opacity 300ms var(--ease-spring)",
              transitionDelay: animated ? "150ms" : "0ms",
            }}
          >
            TAP TO SEE DETAILS
          </InkBleed>
          {/* Image — opacity/transform managed entirely by the FLIP useLayoutEffect */}
          <div
            ref={headerImageRef}
            style={{
              width: "200px",
              height: "118px",
              backgroundColor: "#E5E0E0",
              overflow: "hidden",
            }}
          >
            <div
              className="h-full w-full"
              style={{
                backgroundImage: "url(/images/Savage65-Animated.gif)",
                backgroundSize: "contain",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                mixBlendMode: "multiply",
              }}
              role="img"
              aria-label="Savage 65 mechanical keyboard"
            />
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <main
        ref={mainRef}
        className="relative z-10 mx-auto flex h-fit w-fit max-w-[960px] flex-col flex-nowrap justify-start items-start gap-[72px] min-[812px]:flex-row min-[812px]:gap-[24px] min-[957px]:gap-[72px]"
        style={{
          paddingTop: animated ? "0px" : "24px",
          gap: animated ? "0px" : undefined,
          transition: "padding-top 400ms var(--ease-spring)",
        }}
      >
        {/* LEFT COLUMN */}
        <div className="flex w-[370px] flex-col items-center justify-center py-0 pr-0 font-mono text-black min-[812px]:min-h-full">
          <div
            className="flex h-fit w-[370px] flex-col items-end justify-between"
            style={{ display: "flex", flexDirection: "column", alignSelf: "stretch", alignItems: "flex-end" }}
          >

            {/* 1. Keyboard details — collapses on touch focus */}
            <div
              className="flex flex-col items-start gap-6"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                alignSelf: "stretch",
                maxHeight: animated ? "0px" : "500px",
                overflow: "hidden",
                transition: "max-height 400ms var(--ease-spring)",
              }}
            >
              {/* CANNON KEYS */}
              <div className="flex items-start justify-between" style={{ alignSelf: "stretch", ...rowStyle(0) }}>
                <InkBleed className="text-sm font-semibold tracking-tight">CANNON KEYS</InkBleed>
                <div className="flex flex-col items-end" style={{ width: "150px" }}>
                  <a
                    href="https://cannonkeys.com/products/savage65"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="no-underline hover:underline"
                    onMouseEnter={(e) => setCkPreviewPos({ x: e.clientX, y: e.clientY })}
                    onMouseMove={(e) => setCkPreviewPos({ x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setCkPreviewPos(null)}
                    aria-label="Savage65 keyboard on CannonKeys"
                  >
                    <InkBleed className="text-sm tracking-tight">SAVAGE 65</InkBleed>
                  </a>
                  <a
                    href="https://cannonkeys.com/products/savage65"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="no-underline hover:underline"
                    onMouseEnter={(e) => setCkPreviewPos({ x: e.clientX, y: e.clientY })}
                    onMouseMove={(e) => setCkPreviewPos({ x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setCkPreviewPos(null)}
                    aria-label="6.25u FR4 Plate for Savage65"
                  >
                    <InkBleed className="text-sm tracking-tight">6.25u FR4 PLATE</InkBleed>
                  </a>
                  <a
                    href="https://cannonkeys.com/products/savage65"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="no-underline hover:underline"
                    onMouseEnter={(e) => setCkPreviewPos({ x: e.clientX, y: e.clientY })}
                    onMouseMove={(e) => setCkPreviewPos({ x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setCkPreviewPos(null)}
                    aria-label="Instant65 Hotswap PCB for Savage65"
                  >
                    <InkBleed className="text-sm tracking-tight">INSTANT 65 HOTSWAP</InkBleed>
                  </a>
                </div>
              </div>

              {/* MECHS ON DECK */}
              <div className="flex items-start justify-between" style={{ alignSelf: "stretch", ...rowStyle(50) }}>
                <InkBleed className="text-sm font-semibold tracking-tight">MECHS ON DECK</InkBleed>
                <a
                  href="https://cannonkeys.com/products/anubis-switch"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="no-underline hover:underline"
                  onMouseEnter={(e) => setAnubisPreviewPos({ x: e.clientX, y: e.clientY })}
                  onMouseMove={(e) => setAnubisPreviewPos({ x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setAnubisPreviewPos(null)}
                  aria-label="Anubis Tactile Switch on CannonKeys"
                >
                  <InkBleed className="text-sm tracking-tight">ANUBIS SWITCHES</InkBleed>
                </a>
              </div>

              {/* OSUME */}
              <div className="flex items-start justify-between" style={{ alignSelf: "stretch", ...rowStyle(100) }}>
                <InkBleed className="text-sm font-semibold tracking-tight">OSUME</InkBleed>
                <div className="flex flex-col items-end" style={{ width: "150px" }}>
                  <a
                    href="https://osume.com/products/matcha-keycaps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="no-underline hover:underline"
                    onMouseEnter={(e) => setOsumePreviewPos({ x: e.clientX, y: e.clientY })}
                    onMouseMove={(e) => setOsumePreviewPos({ x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setOsumePreviewPos(null)}
                    aria-label="Matcha Keycaps on Osume"
                  >
                    <InkBleed className="text-sm tracking-tight">MATCHA KEYCAPS</InkBleed>
                  </a>
                  <a
                    href="https://osume.com/products/matcha-keycaps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="no-underline hover:underline"
                    onMouseEnter={(e) => setOsumePreviewPos({ x: e.clientX, y: e.clientY })}
                    onMouseMove={(e) => setOsumePreviewPos({ x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setOsumePreviewPos(null)}
                    aria-label="Cherry Profile Matcha Keycaps on Osume"
                  >
                    <InkBleed className="text-sm tracking-tight">CHERRY PROFILE</InkBleed>
                  </a>
                </div>
              </div>
            </div>

            {/* 2. Keyboard image — stays in layout (holds space); fades out when FLIP is active */}
            <div
              style={{
                height: "220px",
                overflow: "hidden",
                alignSelf: "stretch",
                backgroundColor: "#E5E0E0",
              }}
            >
              <div
                ref={leftImageRef}
                className="h-full w-full bg-center bg-no-repeat"
                style={{
                  backgroundImage: "url(/images/Savage65-Animated.gif)",
                  backgroundSize: "cover",
                  mixBlendMode: "multiply",
                  opacity: animated ? 0 : 1,
                  transition: "opacity 200ms var(--ease-spring)",
                }}
                role="img"
                aria-label="Savage 65 mechanical keyboard"
              />
            </div>

            {/* 3. Footer — collapses and fades on touch focus */}
            <footer
              className="flex w-full shrink-0 items-center justify-between text-sm tracking-tight"
              style={{
                alignSelf: "stretch",
                maxHeight: animated ? "0px" : "50px",
                overflow: "hidden",
                opacity: animated ? 0 : 1,
                transform: animated ? "translateY(-10px)" : "translateY(0)",
                transition: "max-height 400ms var(--ease-spring), opacity 250ms var(--ease-spring), transform 250ms var(--ease-spring)",
                transitionDelay: animated ? "80ms" : "0ms",
              }}
            >
              <InkBleed className="text-[#595959]">[2022]</InkBleed>
              <a
                href="public/instant65.json"
                download="instant65.json"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 no-underline text-[#595959] hover:underline"
                aria-label="Download layout JSON"
              >
                <img src="/icons/download-icon.svg" alt="" width={16} height={16} className="shrink-0" aria-hidden />
                <InkBleed className="text-[#595959]">LAYOUT.JSON</InkBleed>
              </a>
            </footer>

          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="relative flex h-fit w-[370px] flex-col pl-0 min-[812px]:h-full min-[812px]:min-h-full">
          {/* Hidden div to measure caret line position (same font/width as textarea) */}
          <div
            ref={caretMeasureRef}
            className="pointer-events-none absolute left-0 top-0 w-full font-mono py-0 text-base min-[812px]:text-sm"
            style={{
              visibility: "hidden",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              overflow: "hidden",
            }}
            aria-hidden
          />
          {/* Blurred ink-bleed mirror of textarea content (or placeholder when empty) */}
          <div
            ref={textareaMirrorRef}
            className="textarea-no-scrollbar pointer-events-none absolute left-0 top-0 w-full font-mono py-0 text-base min-[812px]:text-sm overflow-hidden ink-bleed-blur"
            style={{
              overflowWrap: "break-word",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              color: textareaValue ? "black" : "#999999",
            }}
            aria-hidden
          >
            {textareaValue || "START TYPING..."}
          </div>
          <textarea
            ref={textareaRef}
            value={textareaValue}
            placeholder="START TYPING..."
            rows={1}
            onKeyDown={(e) => playSound(e.code)}
            onFocus={handleFocus}
            onBlur={() => setIsFocused(false)}
            onChange={handleInput}
            onTouchStart={handleTextareaTouchStart}
            className="textarea-no-scrollbar relative z-10 font-mono w-full resize-none overflow-hidden border-none bg-transparent py-0 text-base text-black outline-none placeholder:text-[#999999] focus:ring-0 min-[812px]:text-sm min-[812px]:min-h-[424px]"
            style={{ overflowWrap: "break-word" }}
          />
        </div>

      </main>
    </div>
  );
}
