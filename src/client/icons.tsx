/** Inline icon set for the pstack client surfaces. */

import type { ReactElement, SVGProps } from "react";

export type IconComponent = (props: IconProps) => ReactElement;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "width" | "height"> {
  readonly size?: number;
}

function icon(paths: ReactElement): IconComponent {
  return function PstackIcon({ size = 16, ...rest }: IconProps): ReactElement {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        {...rest}
      >
        {paths}
      </svg>
    );
  };
}

export const IconSettings = icon(
  <>
    <path d="M6.8 1.8h2.4l.5 1.6 1.4.8 1.6-.5 1.2 2.1-1.2 1.2v1.6l1.2 1.2-1.2 2.1-1.6-.5-1.4.8-.5 1.6H6.8l-.5-1.6-1.4-.8-1.6.5-1.2-2.1 1.2-1.2V6.9L2.1 5.7l1.2-2.1 1.6.5 1.4-.8z" />
    <circle cx="8" cy="8" r="1.9" />
  </>,
);

export const IconClose = icon(<path d="M4 4l8 8M12 4l-8 8" />);

export const IconRefresh = icon(
  <>
    <path d="M13 8a5 5 0 1 1-1.5-3.6" />
    <path d="M13 2.8v3.1H9.9" />
  </>,
);

export const IconCheck = icon(<path d="M2.8 8.4l3.4 3.4 7-7.4" />);

export const IconCheckCircle = icon(
  <>
    <circle cx="8" cy="8" r="6" />
    <path d="M5.2 8.2l1.9 1.9 3.8-4" />
  </>,
);

export const IconPlus = icon(<path d="M8 3.2v9.6M3.2 8h9.6" />);

export const IconTrash = icon(
  <>
    <path d="M2.8 4.2h10.4M6.4 4.2V2.8h3.2v1.4M4.2 4.2l.6 9h6.4l.6-9" />
    <path d="M6.7 6.8v3.8M9.3 6.8v3.8" />
  </>,
);

export const IconRoute = icon(
  <>
    <circle cx="3.4" cy="3.4" r="1.7" />
    <circle cx="12.6" cy="12.6" r="1.7" />
    <path d="M3.4 5.1v3.3a2.2 2.2 0 0 0 2.2 2.2h3.6a2.2 2.2 0 0 1 2.2 2.2" />
  </>,
);

export const IconSearch = icon(
  <>
    <circle cx="7" cy="7" r="4.4" />
    <path d="M10.2 10.2L14 14" />
  </>,
);

export const IconTerminal = icon(
  <>
    <rect x="1.8" y="2.8" width="12.4" height="10.4" rx="1.8" />
    <path d="M4.4 6.2l2.1 1.8-2.1 1.8M8.4 10.2h3.2" />
  </>,
);

export const IconGitBranch = icon(
  <>
    <circle cx="4" cy="3.4" r="1.6" />
    <circle cx="4" cy="12.6" r="1.6" />
    <circle cx="12" cy="5.6" r="1.6" />
    <path d="M4 5v6M5.6 5.6h3.2a3.2 3.2 0 0 1 3.2 3.2v1.6" />
  </>,
);

export const IconRepeat = icon(
  <>
    <path d="M3 6.2A3.2 3.2 0 0 1 6.2 3H13" />
    <path d="M10.8 1.6L13.2 3l-2.4 1.4" />
    <path d="M13 9.8A3.2 3.2 0 0 1 9.8 13H3" />
    <path d="M5.2 14.4L2.8 13l2.4-1.4" />
  </>,
);

export const IconInfo = icon(
  <>
    <circle cx="8" cy="8" r="6" />
    <path d="M8 7.2v4M8 4.9v.2" />
  </>,
);

export const IconAlert = icon(
  <>
    <path d="M8 2.2L14 13H2z" />
    <path d="M8 6.2v3M8 11.4v.2" />
  </>,
);

export const IconSave = icon(
  <>
    <path d="M3 2.8h8.2L13.2 5v8.2H2.8V2.8z" />
    <path d="M5 2.8v3.6h5.2V2.8M5.2 13.2V9.4h5.6v3.8" />
  </>,
);

export const IconUndo = icon(
  <>
    <path d="M3 8a5 5 0 1 0 1.5-3.6" />
    <path d="M3 2.8v3.1h3.1" />
  </>,
);

export const IconBrowser = icon(
  <>
    <rect x="1.8" y="2.8" width="12.4" height="10.4" rx="1.8" />
    <path d="M1.8 6h12.4" />
    <circle cx="8" cy="9.6" r="2.1" />
    <path d="M5.9 9.6h4.2M8 7.5v4.2" />
  </>,
);

export const IconMonitor = icon(
  <>
    <rect x="1.8" y="2.8" width="12.4" height="8.4" rx="1.6" />
    <path d="M5.2 14h5.6M8 11.2V14" />
  </>,
);

export const IconPlug = icon(
  <>
    <path d="M6 2.8v3M10 2.8v3" />
    <path d="M4.4 5.8h7.2v2.4a3.6 3.6 0 0 1-3.6 3.6 3.6 3.6 0 0 1-3.6-3.6z" />
    <path d="M8 11.8v1.6" />
  </>,
);

export const IconUsers = icon(
  <>
    <circle cx="6" cy="5.2" r="2" />
    <path d="M2.4 13v-1.1a3.6 3.6 0 0 1 3.6-3.6h0a3.6 3.6 0 0 1 3.6 3.6V13" />
    <path d="M10.4 3.5a2 2 0 0 1 0 3.7M11.4 8.6a3.2 3.2 0 0 1 2.2 3V13" />
  </>,
);

export const IconEraser = icon(
  <>
    <path d="M3.1 10.6l5.2-5.2a1.7 1.7 0 0 1 2.4 0l1 1a1.7 1.7 0 0 1 0 2.4l-4.4 4.4H5.1z" />
    <path d="M6.6 6.1l3.3 3.3M3.1 10.6h6.3" />
  </>,
);
