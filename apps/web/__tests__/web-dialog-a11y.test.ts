import assert from "node:assert/strict";
import {
  FOCUSABLE_SELECTOR,
  getFocusTrapTarget,
  getFocusTrapTargetIndex,
  getFocusableElements,
  getInitialFocusTarget,
  shouldCloseOnEscape,
} from "../components/ui/dialog-a11y";

console.log("Starting WEB-UX-002 Dialog Accessibility Policy Tests...");

assert.equal(
  shouldCloseOnEscape("Escape", true),
  true,
  "Escape closes when onOpenChange is provided",
);
assert.equal(
  shouldCloseOnEscape("Escape", false),
  false,
  "Escape does not close without onOpenChange",
);
assert.equal(
  shouldCloseOnEscape("Enter", true),
  false,
  "Non-Escape keys do not close",
);
assert.equal(
  shouldCloseOnEscape("Escape", true, true),
  false,
  "defaultPrevented Escape does not close",
);

assert.equal(getFocusTrapTargetIndex(0, -1, false), -1, "No focusables returns -1");
assert.equal(getFocusTrapTargetIndex(1, -1, false), 0, "Single focusable always index 0");
assert.equal(getFocusTrapTargetIndex(3, -1, false), 0, "Tab from outside focuses first");
assert.equal(getFocusTrapTargetIndex(3, 2, false), 0, "Tab from last wraps to first");
assert.equal(getFocusTrapTargetIndex(3, 0, true), 2, "Shift+Tab from first wraps to last");
assert.equal(getFocusTrapTargetIndex(3, 1, true), 0, "Shift+Tab moves to previous");

assert.match(
  FOCUSABLE_SELECTOR,
  /button:not\(\[disabled\]\)/,
  "Focusable selector includes enabled buttons",
);

if (typeof document !== "undefined") {
  document.body.innerHTML = `
    <div id="dialog-root">
      <button id="first">First</button>
      <input id="middle" />
      <button id="last" disabled>Last</button>
      <button id="hidden" tabindex="-1">Hidden</button>
    </div>
  `;

  const root = document.getElementById("dialog-root");
  assert.ok(root, "dialog fixture root exists");

  const focusables = getFocusableElements(root);
  assert.equal(focusables.length, 2, "Disabled and tabindex=-1 elements are excluded");
  assert.equal(focusables[0]?.id, "first");
  assert.equal(focusables[1]?.id, "middle");

  const initial = getInitialFocusTarget(root);
  assert.equal(initial?.id, "first", "Initial focus target is first focusable");

  const wrapForward = getFocusTrapTarget(focusables, focusables[1] ?? null, false);
  assert.equal(wrapForward?.id, "first", "Tab from last focusable wraps to first");

  const wrapBackward = getFocusTrapTarget(focusables, focusables[0] ?? null, true);
  assert.equal(wrapBackward?.id, "middle", "Shift+Tab from first moves to previous focusable");

  document.body.innerHTML = "";
} else {
  console.log("Skipping DOM fixture tests (document unavailable in this runtime)");
}

console.log("✓ WEB-UX-002 Dialog accessibility policy tests passed");
