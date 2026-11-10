// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import { Toast, type ToastMessage } from "../src/client/toast.tsx";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = "";
});

async function render(message: ToastMessage | undefined, duration = 60_000): Promise<void> {
  await act(async () => {
    root.render(createElement(Toast, { message, duration }));
  });
}

describe("shared Toast", () => {
  it("renders outside the caller and expires after the requested duration", async () => {
    await render({ tone: "success", text: "Shared feedback" }, 0);
    const toast = document.body.querySelector<HTMLElement>(".pstack-toast")!;
    expect(toast.parentElement).toBe(document.body);
    expect(toast.getAttribute("role")).toBe("status");
    expect(toast.textContent).toBe("Shared feedback");
    expect(container.textContent).toBe("");

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(document.body.querySelector(".pstack-toast")).toBeNull();
  });

  it("exposes errors as alerts and dismisses feedback on message reset", async () => {
    await render({ tone: "error", text: "Save failed" });
    expect(document.body.querySelector(".pstack-toast")?.getAttribute("role")).toBe("alert");
    await render(undefined);
    expect(document.body.querySelector(".pstack-toast")).toBeNull();
  });
});
