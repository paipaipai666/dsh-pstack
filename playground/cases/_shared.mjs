export function callFor(calls, tool) {
  return calls.find((call) => call.tool === tool);
}

export function resultText(call) {
  return String(call?.result?.result ?? "");
}

export function ok(detail) {
  return { ok: true, detail };
}

export function bad(detail) {
  return { ok: false, detail };
}

export function firstLine(text) {
  const line = text.split("\n").find((item) => item.trim() !== "") ?? "";
  return line.length > 200 ? `${line.slice(0, 200)}…` : line;
}
