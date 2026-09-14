export function getSidebarPanelClasses(isMobileOpen: boolean): string {
  return isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0";
}

export function shouldShowMobileNavBackdrop(isMobileOpen: boolean): boolean {
  return isMobileOpen;
}

export function getMobileNavToggleLabel(isMobileOpen: boolean): string {
  return isMobileOpen ? "Close navigation menu" : "Open navigation menu";
}
