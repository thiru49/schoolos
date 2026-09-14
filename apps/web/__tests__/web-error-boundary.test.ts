import assert from "node:assert/strict";
import {
  nextBoundaryRetryKey,
  resolveRenderErrorMessage,
} from "../components/states/error-boundary-policy";

console.log("Starting WEB-UX-001 Page Error Boundary Policy Tests...\n");

// ============================================================================
// 1. Default page-level message (no section, unknown error)
// ============================================================================

assert.equal(
  resolveRenderErrorMessage(null),
  "This page ran into a problem and could not be displayed. Try again or reload the page.",
  "Unknown errors get a calm default page message",
);

assert.equal(
  resolveRenderErrorMessage(undefined),
  "This page ran into a problem and could not be displayed. Try again or reload the page.",
  "Undefined errors get a calm default page message",
);

// ============================================================================
// 2. Section-scoped message
// ============================================================================

assert.equal(
  resolveRenderErrorMessage(new Error("Chart series is undefined"), "Students"),
  "Students could not be displayed. Chart series is undefined",
  "Section label prefixes the detail message",
);

assert.equal(
  resolveRenderErrorMessage(new Error(""), "Reports"),
  "Reports could not be displayed. This section ran into a problem and could not be displayed. Try again or reload the page.",
  "Empty error messages fall back to the default section detail",
);

// ============================================================================
// 3. Error object detail passthrough
// ============================================================================

assert.equal(
  resolveRenderErrorMessage(new Error("Cannot read properties of null")),
  "Cannot read properties of null",
  "Error.message is surfaced for page-level failures",
);

// ============================================================================
// 4. Retry key increments (remount children on retry)
// ============================================================================

assert.equal(nextBoundaryRetryKey(0), 1, "First retry bumps key to 1");
assert.equal(nextBoundaryRetryKey(3), 4, "Retry key increments monotonically");

console.log("✓ WEB-UX-001 page error boundary policy tests passed");

console.log("\n========================================================");
console.log("ALL WEB-UX-001 PAGE ERROR BOUNDARY TESTS PASSED");
console.log("========================================================\n");
