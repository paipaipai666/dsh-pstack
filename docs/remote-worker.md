# Remote worker contract

`pstack_remote` sends one task to a machine you run. It never supplies that machine. This page is
the whole contract the machine has to satisfy; anything that can stream `dsh --json` events can be a
worker.

## Two ways in

| transport | what the machine needs | what the row does |
| --- | --- | --- |
| `ssh` | an SSH account, `dsh` on `PATH`, and the workspace directory | `ssh -o BatchMode=yes <host> 'cd <workspace> && dsh --profile <profile> --permission-mode <mode> --json'`, task on stdin |
| `http` | any process that serves `POST /jobs` | sends a JSON envelope, then reads the response body as NDJSON |
| `local` | a command on this machine | used by tests and by a machine whose DSH binary is not called `dsh` |

The SSH path runs the real CLI, so the remote side only needs the DSH release you already trust.
The HTTP path exists for machines that should not receive a shell login.

## `POST /jobs`

The request body is the envelope:

```json
{
  "workspacePath": "/srv/repo",
  "task": "the text the model wrote",
  "profile": "headless",
  "permissionMode": "workspace-write",
  "addDir": ["/srv/shared"]
}
```

The answer must be `200` with `content-type: application/x-ndjson`; its body is the event stream,
one JSON object per line, exactly what `dsh --profile headless --json` writes. `pstack_remote`
stores each line and shows it to the model without interpreting it, so a worker may forward the raw
CLI output or add its own event lines.

Two response details matter:

- `x-remote-job-id` is optional. When present, it is kept on the job record so you can correlate the
  two sides; the tool never calls back into the worker by itself.
- A non-2xx status fails the job before any event is read. Put the reason in the response body
  because the model sees the status line only.

Cancellation is the client closing the connection. The worker should kill its child process when
that happens; `pstack_remote` also sends `DELETE` only as a hint if a future version implements it,
so do not depend on it.

## Authentication

Set `tokenEnv` on the target and export the value in the Host environment. The tool sends
`authorization: Bearer <value>` when the variable is non-empty and sends nothing when it is unset.
The worker is responsible for checking it. Never expose a worker without one: it runs model-written
work with whatever permissions the envelope asks for.

## What the worker does not get

- No retries. One request is one job.
- No resumption. If the Host process exits, the job is reported as failed with
  `the Host that started this job exited`; the record is not adopted by the next Host.
- No shared filesystem. The workspace path is meaningful only on the remote machine.
- No output translation. Raw event lines are returned; the model reads them as data.

## Minimal worker

This is a complete Node worker for a POSIX host. It proves the contract; harden it before trusting
it with real work.

```js
import { spawn } from "node:child_process";
import { createServer } from "node:http";

const TOKEN = process.env.REMOTE_TOKEN ?? "";

createServer((request, response) => {
  if (request.method !== "POST" || request.url !== "/jobs") {
    response.writeHead(404).end();
    return;
  }
  if (TOKEN !== "" && request.headers.authorization !== `Bearer ${TOKEN}`) {
    response.writeHead(401).end("missing token");
    return;
  }
  let body = "";
  request.on("data", (chunk) => (body += chunk));
  request.on("end", () => {
    const envelope = JSON.parse(body);
    const child = spawn(
      "dsh",
      [
        "--profile", envelope.profile,
        "--permission-mode", envelope.permissionMode,
        "--json",
        "--add-dir", ...(envelope.addDir ?? []),
      ],
      { cwd: envelope.workspacePath, stdio: ["pipe", "pipe", "inherit"] },
    );
    response.writeHead(200, { "content-type": "application/x-ndjson" });
    child.stdout.pipe(response);
    child.stdin.end(envelope.task);
    child.on("close", () => response.end());
    request.on("close", () => child.kill("SIGTERM"));
  });
}).listen(3082, "127.0.0.1");
```

Bind loopback or a private address. A public bind needs TLS and a real authentication story, which
this contract does not provide.

## Registering it

```yaml
- id: pstack-remote
  name: "@paipaipai666/dsh-pstack/remote"
  config:
    mode: ask
    targets:
      - name: builder
        transport: ssh
        host: builder.example.net
        workspaceRoot: /srv/repo
      - name: sandbox
        transport: http
        url: http://10.0.0.4:3082
        tokenEnv: REMOTE_TOKEN
```

`mode: ask` is the default: every `run` and `cancel` goes through the approval prompt. `allow`
skips that prompt and belongs only in a profile you trust; `deny` keeps the targets registered
while making dispatch impossible.