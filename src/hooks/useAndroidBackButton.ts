import { useEffect } from "react";

interface BackHandlerOptions {
  isOpen: boolean;
  onClose: () => void;
  id: string;
}

/**
 * Handles Android Hardware Back Button and browser history stack
 * so pressing Back closes the active modal instead of exiting the app.
 */
export function useAndroidBackButton({ isOpen, onClose, id }: BackHandlerOptions) {
  useEffect(() => {
    if (!isOpen) return;

    // Push a state into history so the Android Back action pops this entry
    const stateKey = `modal_${id}`;
    window.history.pushState({ [stateKey]: true }, "");

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      // Clean up history state if closed via UI button without popstate
      if (window.history.state && window.history.state[stateKey]) {
        window.history.back();
      }
    };
  }, [isOpen, onClose, id]);
}
