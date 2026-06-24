"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { HiXMark } from "react-icons/hi2";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export interface BottomSheetRef {
  expand: () => void;
  collapse: () => void;
}

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  expandable?: boolean;
  initialState?: "peek" | "full";
  headerAction?: React.ReactNode;
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;
}

// Interaktiv elementlar (tugma, link, inputlar) tortishdan himoyalanadi
const INTERACTIVE_SELECTOR = "input, textarea, button, a, select, [data-no-drag], [role='button']";

export const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>((props, ref) => {
  const {
    isOpen,
    onClose,
    title,
    children,
    expandable = false,
    initialState = "peek",
    headerAction,
    headerContent,
    footerContent,
  } = props;

  const contentRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const [sheetState, setSheetState] = useState<"peek" | "full">(initialState);

  // Birinchi renderda 0px bo'lib miltillamasligi uchun aqlli hisob-kitob
  const [viewportHeight, setViewportHeight] = useState(() => {
    if (typeof window !== "undefined") {
      return window.visualViewport?.height || window.innerHeight;
    }
    return 800;
  });

  useImperativeHandle(ref, () => ({
    expand: () => setSheetState("full"),
    collapse: () => setSheetState("peek"),
  }));

  // Ekran balandligini dinamik o'lchash (klaviatura ochilganda ham buzilmaydi)
  useIsomorphicLayoutEffect(() => {
    const updateVh = () => {
      const vh = window.visualViewport?.height || window.innerHeight;
      setViewportHeight(vh);
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };
    updateVh();
    window.visualViewport?.addEventListener("resize", updateVh);
    window.addEventListener("resize", updateVh);
    return () => {
      window.visualViewport?.removeEventListener("resize", updateVh);
      window.removeEventListener("resize", updateVh);
    };
  }, []);

  // Orqa fonni qotirish va holatlarni tiklash
  useEffect(() => {
    if (!isOpen) return;
    setSheetState(initialState);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, initialState]);

  const isInteractive = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return false;
    return !!target.closest(INTERACTIVE_SELECTOR);
  };

  // =========================================================================
  // 1-TUTUVCHI: Modalning istalgan joyidan (bo'sh joy, sarlavha, qisqa matn) tortish
  // =========================================================================
  const handleGlobalPointerDown = (e: React.PointerEvent) => {
    if (isInteractive(e.target)) return;

    const scrollBox = contentRef.current;
    if (scrollBox && scrollBox.contains(e.target as Node)) {
      const hasScrollbar = scrollBox.scrollHeight > scrollBox.clientHeight;
      if (hasScrollbar) {
        // Barmog'i skroll bo'ladigan uzun matnga tegdi! Tortishni vaqtincha 
        // bloklaymiz, mantiqni 2-tutuvchiga (handlePanStart) topshiramiz.
        return;
      }
    }

    dragControls.start(e);
  };

  // =========================================================================
  // 2-TUTUVCHI: Faqat skroll ichida, matnning eng tepasida turib pastga tortganda
  // =========================================================================
  const handlePanStart = (e: any, info: any) => {
    if (e?.pointerType === "mouse") return;
    if (isInteractive(e.target)) return;

    const scrollBox = contentRef.current;
    if (!scrollBox) return;

    const isAtTop = scrollBox.scrollTop <= 0;
    const isPullingDown = info.delta.y > 0;

    if (isAtTop && isPullingDown) {
      dragControls.start(e);
    }
  };

  const handleDragEnd = (_: any, info: any) => {
    const offset = info.offset.y;
    const velocity = info.velocity.y;

    if (!expandable) {
      if (offset > 80 || velocity > 350) {
        onClose();
      }
      return;
    }

    if (sheetState === "peek") {
      if (offset < -80 || velocity < -400) {
        setSheetState("full");
      } else if (offset > 80 || velocity > 350) {
        onClose();
      }
    } else if (sheetState === "full") {
      if (offset > 180 || velocity > 600) {
        onClose();
      } else if (offset > 80 || velocity > 350) {
        setSheetState("peek");
      }
    }
  };

  const targetHeight = expandable
    ? sheetState === "full"
      ? `${viewportHeight * 0.95}px`
      : `${viewportHeight * 0.60}px`
    : "auto";

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[999999] flex items-end justify-center select-none"
          initial={false}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Orqa xira fon */}
          <motion.div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* ASOSIY MODAL KORPUSI */}
          <motion.div
            role="dialog"
            aria-modal="true"
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragDirectionLock
            dragMomentum={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{
              top: expandable && sheetState === "full" ? 0.05 : 0.15,
              bottom: 0.85,
            }}
            onDragEnd={handleDragEnd}
            onPointerDown={handleGlobalPointerDown} // <-- 1-TUTUVCHI SHU YERDA!
            initial={{ y: "100%" }}
            animate={{
              y: 0,
              height: targetHeight,
            }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              stiffness: 320,
              damping: 28,
            }}
            className="relative z-10 w-full md:max-w-[450px] bg-white dark:bg-slate-900 rounded-t-[28px] shadow-2xl flex flex-col overflow-hidden"
            style={{
              maxHeight: `${viewportHeight * 0.95}px`,
              touchAction: "none",
            }}
          >
            {/* Tepadagi mitti kulrang tutqich */}
            <div className="py-3 flex justify-center cursor-grab active:cursor-grabbing shrink-0">
              <div className="w-10 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800" />
            </div>

            {/* Header qismi */}
            {(title || headerAction) && (
              <div className="flex items-center justify-between px-5 pb-3 border-b border-slate-100 dark:border-white/5 shrink-0">
                <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate pr-4">
                  {title}
                </span>
                <div className="flex items-center gap-2">
                  {headerAction}
                  <button
                    onClick={onClose}
                    className="p-1.5 -mr-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <HiXMark className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {headerContent && <div className="shrink-0">{headerContent}</div>}

            {/* Skroll bo'ladigan asosiy tana */}
            <motion.div
              ref={contentRef}
              onPanStart={handlePanStart} // <-- 2-TUTUVCHI SHU YERDA!
              className="flex-1 overflow-y-auto p-3 scrollbar-none select-text text-xs sm:text-sm text-slate-700 dark:text-slate-300"
              style={{ overscrollBehaviorY: "contain" }}
            >
              {children}
            </motion.div>

            {footerContent && <div className="shrink-0">{footerContent}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
});

BottomSheet.displayName = "BottomSheet";