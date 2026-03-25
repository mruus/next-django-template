import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { isDesktopAtom, breakpointReadyAtom } from "@/atoms/menu";

export function useBreakpoint() {
  const setDesktop = useSetAtom(isDesktopAtom);
  const setReady = useSetAtom(breakpointReadyAtom);

  useEffect(() => {
    function update() {
      setDesktop(window.innerWidth >= 1024);
    }

    update();
    setReady(true);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [setDesktop, setReady]);
}
