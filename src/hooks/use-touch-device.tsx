import * as React from "react";

export function useIsTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    // Check if the primary input mechanism is touch (coarse pointer)
    const checkTouchDevice = () => {
      const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
      setIsTouchDevice(hasCoarsePointer);
    };

    checkTouchDevice();

    // Listen for changes (e.g., if user switches from external mouse to touch)
    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const handler = () => checkTouchDevice();
    
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return !!isTouchDevice;
}
