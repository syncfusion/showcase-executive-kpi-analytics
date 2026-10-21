import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Menu, PanelLeftClose, PanelLeftOpen, X, type LucideIcon } from 'lucide-react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { SidebarComponent } from '@syncfusion/ej2-react-navigations';
import { TooltipComponent, type TooltipEventArgs } from '@syncfusion/ej2-react-popups';
import './app-shell.css';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

interface AppShellProps {
  appName: string;
  appSubtitle: string;
  logo: ReactNode;
  items: NavItem[];
  currentId: string;
  onNavigate: (id: string, event: MouseEvent<HTMLAnchorElement>) => void;
  headerStart: ReactNode;
  headerEnd: ReactNode;
  footer: ReactNode;
  storageKey: string;
  children: ReactNode;
}

const narrowQuery = '(max-width: 1023.98px)';
const sidebarId = 'executive-sidebar';
const menuButtonId = 'executive-menu-button';

function useNarrowViewport() {
  const [narrow, setNarrow] = useState(() => window.matchMedia(narrowQuery).matches);

  useEffect(() => {
    const media = window.matchMedia(narrowQuery);
    const sync = () => setNarrow(media.matches);
    media.addEventListener('change', sync);
    window.addEventListener('resize', sync);
    return () => {
      media.removeEventListener('change', sync);
      window.removeEventListener('resize', sync);
    };
  }, []);

  return narrow;
}

function readCollapsed(storageKey: string) {
  try {
    return window.localStorage.getItem(storageKey) === 'true';
  } catch {
    return false;
  }
}

export function AppShell({
  appName,
  appSubtitle,
  logo,
  items,
  currentId,
  onNavigate,
  headerStart,
  headerEnd,
  footer,
  storageKey,
  children,
}: AppShellProps) {
  const narrow = useNarrowViewport();
  const [collapsed, setCollapsed] = useState(() => readCollapsed(storageKey));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [animate, setAnimate] = useState(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<TooltipComponent>(null);
  const docked = !narrow && collapsed;
  const dockedRef = useRef(docked);
  dockedRef.current = docked;

  useEffect(() => setAnimate(true), []);
  useEffect(() => {
    if (!narrow) setDrawerOpen(false);
  }, [narrow]);
  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, String(collapsed));
    } catch {
      // Collapsed navigation is a convenience preference.
    }
  }, [collapsed, storageKey]);
  useEffect(() => {
    if (!docked) tooltipRef.current?.close();
  }, [docked]);
  useEffect(() => {
    if (narrow || !animate) return;
    const workspace = workspaceRef.current;
    const refresh = () => window.dispatchEvent(new Event('resize'));
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target === workspace && event.propertyName === 'margin-left') refresh();
    };
    workspace?.addEventListener('transitionend', onTransitionEnd);
    const fallback = window.setTimeout(refresh, 350);
    return () => {
      workspace?.removeEventListener('transitionend', onTransitionEnd);
      window.clearTimeout(fallback);
    };
  }, [collapsed, narrow, animate]);

  const closeDrawer = useCallback((restoreFocus: boolean) => {
    setDrawerOpen(false);
    if (restoreFocus) document.getElementById(menuButtonId)?.focus();
  }, []);

  useEffect(() => {
    if (!narrow || !drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDrawer(true);
    };
    const onPointerDown = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (document.getElementById(sidebarId)?.contains(target)) return;
      if (document.getElementById(menuButtonId)?.contains(target)) return;
      closeDrawer(false);
    };
    const focusTimer = window.setTimeout(() => {
      document.querySelector<HTMLElement>(`#${sidebarId} [aria-current="page"]`)?.focus();
    }, 50);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [closeDrawer, drawerOpen, narrow]);

  const toggleNavigation = () => {
    if (narrow) setDrawerOpen((open) => !open);
    else setCollapsed((value) => !value);
  };
  const onLinkClick = (id: string, event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    onNavigate(id, event);
    if (narrow) closeDrawer(false);
  };
  const beforeTooltip = (args: TooltipEventArgs) => {
    const label = (args.target as HTMLElement).dataset.label;
    if (!dockedRef.current || !label) {
      args.cancel = true;
      return;
    }
    if (tooltipRef.current) tooltipRef.current.content = label;
  };

  const isOpen = narrow ? drawerOpen : !collapsed;
  const ToggleIcon = narrow ? Menu : collapsed ? PanelLeftOpen : PanelLeftClose;
  const toggleLabel = narrow
    ? drawerOpen
      ? 'Close navigation'
      : 'Open navigation'
    : collapsed
      ? 'Expand navigation'
      : 'Collapse navigation';

  return (
    <div className="app-shell" data-nav={narrow ? 'drawer' : collapsed ? 'docked' : 'expanded'}>
      <a className="app-shell-skip" href="#app-shell-main">
        Skip to content
      </a>
      <SidebarComponent
        key={narrow ? 'narrow' : 'wide'}
        id={sidebarId}
        type={narrow ? 'Over' : 'Push'}
        position="Left"
        width="240px"
        enableDock={!narrow}
        dockSize="64px"
        isOpen={isOpen}
        showBackdrop={narrow}
        closeOnDocumentClick={false}
        enableGestures={narrow}
        animate={animate}
        zIndex={1001}
      >
        <nav className="app-shell-nav" aria-label="Primary navigation">
          <div className="app-shell-brand">
            <span className="app-shell-logo" aria-hidden="true">
              {logo}
            </span>
            <span className="app-shell-brand-text">
              <strong>{appName}</strong>
              <small>{appSubtitle}</small>
            </span>
            {narrow && (
              <ButtonComponent
                cssClass="e-flat app-shell-icon-button app-shell-close"
                aria-label="Close navigation"
                onClick={() => closeDrawer(true)}
              >
                <X size={18} aria-hidden="true" />
              </ButtonComponent>
            )}
          </div>
          <TooltipComponent
            ref={tooltipRef}
            target=".app-shell-link"
            position="RightCenter"
            opensOn="Hover Focus"
            showTipPointer
            windowCollision
            beforeRender={beforeTooltip}
          >
            <ul className="app-shell-links">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <a
                      className="app-shell-link"
                      href={item.href}
                      data-label={item.label}
                      aria-current={item.id === currentId ? 'page' : undefined}
                      onClick={(event) => onLinkClick(item.id, event)}
                    >
                      <Icon size={20} aria-hidden="true" className="app-shell-link-icon" />
                      <span className="app-shell-link-label">{item.label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </TooltipComponent>
          <div className="app-shell-footer">{footer}</div>
        </nav>
      </SidebarComponent>
      <div className="app-shell-workspace" ref={workspaceRef}>
        <header className="app-shell-header">
          <div className="app-shell-header-start">
            <ButtonComponent
              id={menuButtonId}
              cssClass="e-flat app-shell-icon-button"
              aria-label={toggleLabel}
              aria-controls={sidebarId}
              aria-expanded={isOpen}
              onClick={toggleNavigation}
            >
              <ToggleIcon size={20} aria-hidden="true" />
            </ButtonComponent>
            {headerStart}
          </div>
          <div className="app-shell-header-end">{headerEnd}</div>
        </header>
        <main id="app-shell-main" className="app-shell-main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
