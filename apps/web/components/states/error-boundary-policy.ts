const DEFAULT_RENDER_ERROR_MESSAGE =
  "This section ran into a problem and could not be displayed. Try again or reload the page.";

export function resolveRenderErrorMessage(error: unknown, section?: string): string {
  const detail =
    error instanceof Error && error.message.trim().length > 0
      ? error.message.trim()
      : DEFAULT_RENDER_ERROR_MESSAGE;

  if (section) {
    return `${section} could not be displayed. ${detail}`;
  }

  return detail === DEFAULT_RENDER_ERROR_MESSAGE
    ? "This page ran into a problem and could not be displayed. Try again or reload the page."
    : detail;
}

export function nextBoundaryRetryKey(currentKey: number): number {
  return currentKey + 1;
}
