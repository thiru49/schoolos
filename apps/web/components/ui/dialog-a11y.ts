export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function shouldCloseOnEscape(
  key: string,
  hasOnOpenChange: boolean,
  defaultPrevented = false,
): boolean {
  return hasOnOpenChange && key === "Escape" && !defaultPrevented;
}

export function getFocusTrapTargetIndex(
  focusableCount: number,
  currentIndex: number,
  shiftKey: boolean,
): number {
  if (focusableCount <= 0) return -1;
  if (focusableCount === 1) return 0;

  if (shiftKey) {
    if (currentIndex <= 0) return focusableCount - 1;
    return currentIndex - 1;
  }

  if (currentIndex === -1 || currentIndex >= focusableCount - 1) return 0;
  return currentIndex + 1;
}

export function getFocusableElements(container: ParentNode): HTMLElement[] {
  if (typeof document === "undefined") return [];

  const root = container as Element;
  const nodeList = root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);

  return Array.from(nodeList).filter(
    (element) =>
      !element.hasAttribute("disabled") &&
      element.getAttribute("tabindex") !== "-1" &&
      element.getAttribute("aria-hidden") !== "true" &&
      !element.closest("[hidden]"),
  );
}

export function getFocusTrapTarget(
  focusables: HTMLElement[],
  activeElement: Element | null,
  shiftKey: boolean,
): HTMLElement | null {
  const currentIndex = activeElement ? focusables.indexOf(activeElement as HTMLElement) : -1;
  const targetIndex = getFocusTrapTargetIndex(focusables.length, currentIndex, shiftKey);
  return targetIndex >= 0 ? (focusables[targetIndex] ?? null) : null;
}

export function getInitialFocusTarget(container: ParentNode): HTMLElement | null {
  const focusables = getFocusableElements(container);
  return focusables[0] ?? null;
}
