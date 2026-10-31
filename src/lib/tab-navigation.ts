import type { KeyboardEvent } from "react";
export function navigateTabs(event: KeyboardEvent<HTMLElement>) {
  const tabs = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]:not([disabled])',
    ),
  );
  const active = tabs.indexOf(event.target as HTMLButtonElement);
  if (active < 0) return;
  let next: number;
  if (event.key === "ArrowRight" || event.key === "ArrowDown")
    next = (active + 1) % tabs.length;
  else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
    next = (active - 1 + tabs.length) % tabs.length;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = tabs.length - 1;
  else return;
  event.preventDefault();
  tabs[next].focus();
  tabs[next].click();
}
