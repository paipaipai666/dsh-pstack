/** Related official plugins for the pstack plugin configuration dialog. */

import { useEffect, useState, type ReactElement } from "react";
import type { BundleInfo, ChangeResult } from "@deepseek-ai/dsh-api-remotes/client";

import {
  IconAlert,
  IconBrowser,
  IconCheck,
  IconCheckCircle,
  IconGitBranch,
  IconMonitor,
  IconPlug,
  IconRefresh,
  IconRepeat,
  IconSearch,
  IconTerminal,
  IconUsers,
  type IconComponent,
} from "./icons.tsx";
import { ensurePstackStyles } from "./styles.ts";
import { messageOf } from "./message.ts";
import { Toast, type ToastMessage } from "./toast.tsx";
import { Button, IconButton, Spinner, Status, Switch, type StatusTone } from "./ui.tsx";
import type { PstackTranslations, PluginsKey } from "./locales/index.ts";

ensurePstackStyles();

export interface PluginManagerApi {
  listBundles(): Promise<readonly BundleInfo[]>;
  setBundleEnabled(name: string, enabled: boolean): Promise<ChangeResult>;
}

type PluginGroupId = "recommended" | "normal" | "conflict";

interface RelatedPlugin {
  readonly name: string;
  readonly titleKey: PluginsKey;
  readonly descriptionKey: PluginsKey;
  readonly icon: IconComponent;
}

interface PluginGroup {
  readonly id: PluginGroupId;
  readonly titleKey: PluginsKey;
  readonly descriptionKey: PluginsKey;
  readonly plugins: readonly RelatedPlugin[];
}

const PLUGIN_GROUPS: readonly PluginGroup[] = [
  {
    id: "recommended",
    titleKey: "groupRecommended",
    descriptionKey: "groupRecommendedDescription",
    plugins: [
      {
        name: "@deepseek-ai/dsh-experimental-forge-bundle",
        titleKey: "recommendedForgeTitle",
        descriptionKey: "recommendedForgeDescription",
        icon: IconGitBranch,
      },
      {
        name: "@deepseek-ai/dsh-experimental-session-search",
        titleKey: "recommendedSessionSearchTitle",
        descriptionKey: "recommendedSessionSearchDescription",
        icon: IconSearch,
      },
    ],
  },
  {
    id: "normal",
    titleKey: "groupNormal",
    descriptionKey: "groupNormalDescription",
    plugins: [
      {
        name: "@deepseek-ai/dsh-browser-use",
        titleKey: "recommendedBrowserTitle",
        descriptionKey: "recommendedBrowserDescription",
        icon: IconBrowser,
      },
      {
        name: "@deepseek-ai/dsh-cua-bundle",
        titleKey: "recommendedCuaTitle",
        descriptionKey: "recommendedCuaDescription",
        icon: IconMonitor,
      },
      {
        name: "@deepseek-ai/dsh-experimental-terminal-bundle",
        titleKey: "recommendedTerminalTitle",
        descriptionKey: "recommendedTerminalDescription",
        icon: IconTerminal,
      },
      {
        name: "@deepseek-ai/dsh-mcp-client",
        titleKey: "recommendedMcpTitle",
        descriptionKey: "recommendedMcpDescription",
        icon: IconPlug,
      },
      {
        name: "@deepseek-ai/dsh-experimental-ralph-bundle",
        titleKey: "recommendedRalphTitle",
        descriptionKey: "recommendedRalphDescription",
        icon: IconRepeat,
      },
    ],
  },
  {
    id: "conflict",
    titleKey: "groupConflict",
    descriptionKey: "groupConflictDescription",
    plugins: [
      {
        name: "@deepseek-ai/dsh-experimental-agent-team-profile",
        titleKey: "recommendedAgentTeamTitle",
        descriptionKey: "recommendedAgentTeamDescription",
        icon: IconUsers,
      },
    ],
  },
];

const ALL = "__all__";

type PluginNoticeTone = "success" | "warn" | "error" | "neutral";

interface PluginNotice {
  readonly tone: PluginNoticeTone;
  readonly text: string;
}

export function RecommendedPluginsView(props: {
  api: PluginManagerApi | undefined;
  translations: PstackTranslations;
}): ReactElement {
  const [bundles, setBundles] = useState<readonly BundleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState<string | undefined>();
  const [messages, setMessages] = useState<Record<string, PluginNotice>>({});
  const [toast, setToast] = useState<ToastMessage | undefined>();
  const { api, translations } = props;
  const t = translations.plugins;
  const common = translations.common;

  const load = async (): Promise<void> => {
    if (api === undefined) {
      setLoading(false);
      setError(t("loadFailed", { message: t("managerUnavailable") }));
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      setBundles(await api.listBundles());
    } catch (reason) {
      setError(t("loadFailed", { message: pluginMessage(reason, t) }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [api, t]);

  const byName = new Map(bundles.map((bundle) => [bundle.name, bundle]));
  const available = (bundle: BundleInfo | undefined): boolean =>
    bundle !== undefined &&
    bundle.availability !== "missing" &&
    bundle.error === undefined &&
    bundle.readOnlyReason === undefined;
  const switchable = (bundle: BundleInfo | undefined, group: PluginGroupId): boolean =>
    available(bundle) && (group !== "conflict" || bundle?.enabled === true);
  const recommended = PLUGIN_GROUPS.find((group) => group.id === "recommended")!;
  const recommendedEnabled = recommended.plugins.filter(
    (plugin) => byName.get(plugin.name)?.enabled === true,
  ).length;
  const enableable = recommended.plugins.filter((plugin) => {
    const bundle = byName.get(plugin.name);
    return switchable(bundle, "recommended") && bundle?.enabled !== true;
  }).length;

  const toggle = async (bundle: BundleInfo): Promise<void> => {
    if (api === undefined) return;
    setBusy(bundle.name);
    setToast(undefined);
    setMessages((current) => {
      const next = { ...current };
      delete next[bundle.name];
      return next;
    });
    try {
      const change = await api.setBundleEnabled(bundle.name, !bundle.enabled);
      setMessages((current) => ({
        ...current,
        [bundle.name]: changeNotice(t, bundle.name, change),
      }));
      await load();
    } catch (reason) {
      setMessages((current) => ({
        ...current,
        [bundle.name]: {
          tone: "error",
          text: t("pluginChangeFailed", { name: bundle.name, reason: pluginMessage(reason, t) }),
        },
      }));
    } finally {
      setBusy(undefined);
    }
  };

  const enableAll = async (): Promise<void> => {
    if (api === undefined) return;
    const targets = recommended.plugins
      .map((plugin) => byName.get(plugin.name))
      .filter(
        (bundle): bundle is BundleInfo =>
          bundle !== undefined && switchable(bundle, "recommended") && !bundle.enabled,
      );
    if (targets.length === 0) return;
    setBusy(ALL);
    setToast(undefined);
    let settled = 0;
    let restarts = 0;
    let unsettled = 0;
    for (const bundle of targets) {
      try {
        const change = await api.setBundleEnabled(bundle.name, true);
        if (change.application === "restart-required") restarts += 1;
        if (change.application === "applied") settled += 1;
        else if (change.application !== "restart-required") unsettled += 1;
      } catch {
        unsettled += 1;
      }
    }
    await load();
    setBusy(undefined);
    setToast(
      unsettled > 0
        ? { tone: "error", text: t("enableAllPartial", { settled, restarts, unsettled }) }
        : restarts > 0
          ? { tone: "warn", text: t("enableAllRestart", { count: restarts }) }
          : { tone: "success", text: t("enableAllDone", { count: settled }) },
    );
  };

  return (
    <section>
      <header className="pstack-section-head">
        <div>
          <p className="pstack-section-desc">{t("pluginsSubtitle")}</p>
        </div>
        <div className="pstack-section-actions">
          <Status
            tone={
              recommendedEnabled === recommended.plugins.length
                ? "success"
                : recommendedEnabled === 0
                  ? "neutral"
                  : "brand"
            }
            label={t("pluginsSummary", {
              enabled: recommendedEnabled,
              total: recommended.plugins.length,
            })}
          />
          <Button
            variant="outline"
            size="sm"
            icon={busy === ALL ? <Spinner size={13} /> : <IconCheckCircle size={13} />}
            disabled={loading || busy !== undefined || enableable === 0}
            onClick={() => void enableAll()}
          >
            {busy === ALL
              ? t("enableAllBusy")
              : enableable > 0
                ? t("enableAllCount", { count: enableable })
                : recommendedEnabled === recommended.plugins.length
                  ? t("enableAllComplete")
                  : t("enableAll")}
          </Button>
          <IconButton
            label={common("refresh")}
            disabled={loading || busy !== undefined}
            onClick={() => void load()}
          >
            {loading ? <Spinner size={14} /> : <IconRefresh size={14} />}
          </IconButton>
        </div>
      </header>
      {error === undefined ? null : (
        <div className="pstack-notice" data-tone="error">
          <IconAlert size={14} />
          <span>{error}</span>
        </div>
      )}
      <Toast message={toast} />
      <div className="pstack-plugin-groups">
        {PLUGIN_GROUPS.map((group) => {
          const enabledInGroup = group.plugins.filter(
            (plugin) => byName.get(plugin.name)?.enabled === true,
          ).length;
          return (
            <section className="pstack-plugin-group" key={group.id}>
              <header className="pstack-plugin-group-head">
                <div>
                  <h4 className="pstack-plugin-group-title">{t(group.titleKey)}</h4>
                  <p className="pstack-plugin-group-desc">{t(group.descriptionKey)}</p>
                </div>
                <Status
                  tone={
                    group.id === "conflict" ? "error" : enabledInGroup > 0 ? "success" : "neutral"
                  }
                  label={`${enabledInGroup}/${group.plugins.length}`}
                />
              </header>
              <ul className="pstack-plugin-list">
                {group.plugins.map((plugin) => {
                  const bundle = byName.get(plugin.name);
                  const status = bundleStatus(bundle, group.id, t);
                  const canSwitch = switchable(bundle, group.id);
                  const title = t(plugin.titleKey);
                  const action = bundle?.enabled === true ? t("disablePlugin") : t("enablePlugin");
                  const PluginIcon = plugin.icon;
                  const message = messages[plugin.name];
                  return (
                    <li key={plugin.name}>
                      <article
                        className="pstack-plugin-card"
                        data-conflict={group.id === "conflict" ? "true" : undefined}
                      >
                        <span className="pstack-plugin-icon">
                          <PluginIcon size={18} />
                        </span>
                        <div className="pstack-plugin-main">
                          <div className="pstack-plugin-title-row">
                            <span className="pstack-plugin-name">{title}</span>
                            <Status
                              tone={status.tone}
                              label={status.label}
                              title={bundle?.error?.diagnostic ?? bundle?.readOnlyReason}
                            />
                          </div>
                          <p className="pstack-plugin-desc">{t(plugin.descriptionKey)}</p>
                          <code className="pstack-plugin-id">{plugin.name}</code>
                          {message === undefined ? null : (
                            <span className="pstack-inline-message" data-tone={message.tone}>
                              <NoticeIcon tone={message.tone} />
                              {message.text}
                            </span>
                          )}
                        </div>
                        <div className="pstack-plugin-end">
                          <Switch
                            checked={bundle?.enabled === true}
                            disabled={!canSwitch || busy !== undefined}
                            label={`${action} ${title}`}
                            onChange={() =>
                              bundle === undefined ? undefined : void toggle(bundle)
                            }
                          />
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </section>
  );
}

function pluginMessage(reason: unknown, t: PstackTranslations["plugins"]): string {
  const message = messageOf(reason);
  return message === "plugin manager is not available yet" ? t("managerUnavailable") : message;
}

function bundleStatus(
  bundle: BundleInfo | undefined,
  group: PluginGroupId,
  t: PstackTranslations["plugins"],
): { label: string; tone: StatusTone } {
  if (bundle === undefined || bundle.availability === "missing") {
    return { label: t("pluginMissing"), tone: "warn" };
  }
  if (bundle.error !== undefined) return { label: t("pluginUnavailable"), tone: "error" };
  if (bundle.readOnlyReason !== undefined) {
    return { label: t("pluginReadOnly"), tone: "neutral" };
  }
  if (group === "conflict") return { label: t("pluginConflict"), tone: "error" };
  return bundle.enabled
    ? { label: t("pluginEnabled"), tone: "success" }
    : { label: t("pluginDisabled"), tone: "neutral" };
}

function changeNotice(
  t: PstackTranslations["plugins"],
  name: string,
  change: ChangeResult,
): PluginNotice {
  switch (change.application) {
    case "applied":
      return { tone: "success", text: t("pluginChangeApplied", { name }) };
    case "restart-required":
      return {
        tone: "warn",
        text:
          change.restartReason === undefined
            ? t("pluginChangeRestart", { name })
            : t("pluginChangeRestartReason", { name, reason: change.restartReason }),
      };
    case "overridden":
      return { tone: "warn", text: t("pluginChangeOverridden", { name }) };
    case "cancelled":
      return { tone: "neutral", text: t("pluginChangeCancelled", { name }) };
    case "failed":
      return {
        tone: "error",
        text: t("pluginChangeFailed", {
          name,
          reason: describeChangeError(t, change.error),
        }),
      };
  }
}

function describeChangeError(
  t: PstackTranslations["plugins"],
  error: ChangeResult["error"],
): string {
  if (error === undefined) return t("pluginChangeUnknownReason");
  const parts = [error.code, error.diagnostic].filter(
    (part): part is string => part !== undefined && part.trim() !== "",
  );
  return parts.length === 0 ? t("pluginChangeUnknownReason") : parts.join(": ");
}

function NoticeIcon({ tone }: { readonly tone: PluginNoticeTone }): ReactElement | null {
  if (tone === "success") return <IconCheck size={12} />;
  if (tone === "neutral") return null;
  return <IconAlert size={12} />;
}
