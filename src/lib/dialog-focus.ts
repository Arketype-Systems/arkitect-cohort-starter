import { useEffect } from "react";

export function useDialogFocus() {
  useEffect(() => {
    let active: HTMLElement | null = null;
    let previous: HTMLElement | null = null;
    let dirty = false;
    const selector =
      'button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]';
    const focusables = () =>
      Array.from(active?.querySelectorAll<HTMLElement>(selector) ?? []).filter(
        (item) => item.getClientRects().length > 0,
      );
    const observe = () => {
      const next = document.querySelector<HTMLElement>('[role="dialog"]');
      if (next === active) return;
      if (active) {
        document.body.style.overflow = "";
        previous?.focus();
      }
      active = next;
      dirty = false;
      if (active) {
        previous = document.activeElement as HTMLElement;
        document.body.style.overflow = "hidden";
        (
          active.querySelector<HTMLElement>(
            'input:not([type="hidden"]), select, textarea',
          ) ?? focusables()[0]
        )?.focus();
      }
    };
    const onInput = (event: Event) => {
      if (active?.contains(event.target as Node)) dirty = true;
    };
    const onClick = (event: MouseEvent) => {
      const button = (event.target as Element).closest("button");
      if (!active?.contains(button) || !button) return;
      if (
        /^(cancel|close)/i.test(
          button.getAttribute("aria-label") ?? button.textContent ?? "",
        ) &&
        dirty &&
        !window.confirm("Discard your unsaved changes?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (!active) return;
      if (event.key === "Escape") {
        event.preventDefault();
        active
          .querySelector<HTMLButtonElement>('button[aria-label^="Close"]')
          ?.click();
      }
      if (event.key === "Tab") {
        const items = focusables();
        const first = items[0];
        const last = items.at(-1);
        if (!items.length) {
          event.preventDefault();
          return;
        }
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            !active.contains(document.activeElement))
        ) {
          event.preventDefault();
          last?.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            !active.contains(document.activeElement))
        ) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    const observer = new MutationObserver(observe);
    observer.observe(document.body, { subtree: true, childList: true });
    document.addEventListener("keydown", onKey);
    document.addEventListener("input", onInput);
    document.addEventListener("change", onInput);
    document.addEventListener("click", onClick, true);
    observe();
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("input", onInput);
      document.removeEventListener("change", onInput);
      document.removeEventListener("click", onClick, true);
      document.body.style.overflow = "";
    };
  }, []);
}
