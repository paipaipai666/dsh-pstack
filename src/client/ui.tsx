/** Shared controls for the pstack client surfaces. */

import type {
  ButtonHTMLAttributes,
  CSSProperties,
  ReactElement,
  ReactNode,
  KeyboardEvent,
} from "react";

import { IconRefresh } from "./icons.tsx";

export type ButtonVariant = "primary" | "outline" | "ghost";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly icon?: ReactNode;
}

export function Button(props: ButtonProps): ReactElement {
  const { variant = "ghost", size = "md", icon, children, className, ...rest } = props;
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        "pstack-btn",
        `pstack-btn-${variant}`,
        size === "sm" ? "pstack-btn-sm" : undefined,
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly label: string;
  readonly danger?: boolean;
  readonly children: ReactNode;
}

export function IconButton(props: IconButtonProps): ReactElement {
  const { label, danger = false, children, className, ...rest } = props;
  return (
    <button
      type="button"
      {...rest}
      aria-label={label}
      title={label}
      className={cx("pstack-icon-btn", danger ? "pstack-icon-btn-danger" : undefined, className)}
    >
      {children}
    </button>
  );
}

export interface SwitchProps {
  readonly checked: boolean;
  readonly disabled?: boolean;
  readonly label: string;
  readonly onChange: (checked: boolean) => void;
}

export function Switch(props: SwitchProps): ReactElement {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      aria-label={props.label}
      title={props.label}
      disabled={props.disabled}
      className="pstack-switch"
      onClick={() => props.onChange(!props.checked)}
    >
      <span className="pstack-switch-thumb" />
    </button>
  );
}

export type StatusTone = "neutral" | "success" | "warn" | "error" | "brand";

export function Status(props: { tone: StatusTone; label: string; title?: string }): ReactElement {
  return (
    <span className="pstack-status" data-tone={props.tone} title={props.title}>
      <span className="pstack-status-dot" aria-hidden="true" />
      <span>{props.label}</span>
    </span>
  );
}

export function Spinner({ size = 14 }: { readonly size?: number }): ReactElement {
  return <IconRefresh size={size} className="pstack-spinner" />;
}

export interface SegmentItem<T extends string> {
  readonly value: T;
  readonly label: string;
  readonly id: string;
  readonly panelId?: string;
}

export interface SegmentedTabsProps<T extends string> {
  readonly items: readonly SegmentItem<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly label: string;
}

export function SegmentedTabs<T extends string>(props: SegmentedTabsProps<T>): ReactElement {
  const { items, value, onChange, label } = props;
  const selected = Math.max(
    0,
    items.findIndex((item) => item.value === value),
  );
  const style = {
    "--pstack-segment-count": items.length,
    "--pstack-segment-index": selected,
  } as CSSProperties;
  const focusTab = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    const buttons =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    const next = buttons?.[index];
    if (next === undefined) return;
    onChange(items[index]!.value);
    next.focus();
  };
  return (
    <div role="tablist" aria-label={label} className="pstack-segmented" style={style}>
      <span className="pstack-segmented-indicator" aria-hidden="true" />
      {items.map((item, index) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          id={item.id}
          aria-controls={item.panelId}
          aria-selected={item.value === value}
          tabIndex={item.value === value ? 0 : -1}
          className="pstack-segment"
          onClick={() => onChange(item.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") {
              event.preventDefault();
              focusTab(event, (index + 1) % items.length);
            } else if (event.key === "ArrowLeft") {
              event.preventDefault();
              focusTab(event, (index - 1 + items.length) % items.length);
            } else if (event.key === "Home") {
              event.preventDefault();
              focusTab(event, 0);
            } else if (event.key === "End") {
              event.preventDefault();
              focusTab(event, items.length - 1);
            }
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function cx(...values: readonly (string | undefined | false)[]): string {
  return values
    .filter((value): value is string => typeof value === "string" && value !== "")
    .join(" ");
}

/** Confirm a destructive action with the one browser dialog the plugin uses. */
export function confirmDiscard(message: string): boolean {
  if (typeof window === "undefined") return true;
  const confirm = window.confirm;
  return typeof confirm !== "function" || confirm.call(window, message);
}
