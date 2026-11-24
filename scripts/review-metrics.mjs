#!/usr/bin/env node
import { readFileSync } from "node:fs";

const BUCKET_EDGES = [
  { name: "small", max: 50 },
  { name: "medium", max: 500 },
  { name: "large", max: Number.POSITIVE_INFINITY },
];

export function sizeBucket(lines) {
  for (const edge of BUCKET_EDGES) {
    if (lines <= edge.max) {
      return edge.name;
    }
  }
  return "large";
}

function isAutomated(pr) {
  return typeof pr.headRefName === "string" && pr.headRefName.startsWith("auto/");
}

function median(values) {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function hoursBetween(from, to) {
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return null;
  }
  return (end - start) / 3_600_000;
}

function group(prs) {
  const merged = prs.filter((pr) => pr.state === "MERGED");
  const rejected = prs.filter((pr) => pr.state === "CLOSED");
  const hours = merged
    .map((pr) => (pr.mergedAt ? hoursBetween(pr.createdAt, pr.mergedAt) : null))
    .filter((value) => value !== null);
  return {
    total: prs.length,
    merged: merged.length,
    rejected: rejected.length,
    mergeRate: prs.length === 0 ? 0 : merged.length / prs.length,
    medianHoursToMerge: median(hours),
  };
}

export function summarizePRs(prs) {
  const automated = prs.filter(isAutomated);
  const human = prs.filter((pr) => !isAutomated(pr));
  const merged = prs.filter((pr) => pr.state === "MERGED");
  const reverts = merged.filter((pr) => /^revert\b/i.test(pr.title)).length;
  const buckets = BUCKET_EDGES.map((edge) => {
    const name = edge.name;
    const members = prs.filter((pr) => sizeBucket(pr.additions + pr.deletions) === name);
    return {
      name,
      automated: members.filter(isAutomated).length,
      human: members.filter((pr) => !isAutomated(pr)).length,
    };
  });
  return {
    automated: group(automated),
    human: group(human),
    reverts,
    revertRate: merged.length === 0 ? 0 : reverts / merged.length,
    buckets,
  };
}

function hours(value) {
  if (value === null) {
    return "n/a";
  }
  return value < 10 ? value.toFixed(1) : Math.round(value).toString();
}

function percent(value) {
  return `${Math.round(value * 100)}%`;
}

export function renderMetrics(metrics) {
  const lines = [
    "| kind | opened | merged | rejected | merge rate | median hours to merge |",
    "| --- | --- | --- | --- | --- | --- |",
    `| automated | ${metrics.automated.total} | ${metrics.automated.merged} | ${metrics.automated.rejected} | ${percent(metrics.automated.mergeRate)} | ${hours(metrics.automated.medianHoursToMerge)} |`,
    `| human | ${metrics.human.total} | ${metrics.human.merged} | ${metrics.human.rejected} | ${percent(metrics.human.mergeRate)} | ${hours(metrics.human.medianHoursToMerge)} |`,
    "",
    `Reverts: ${metrics.reverts} of ${metrics.automated.merged + metrics.human.merged} merged pull requests (${percent(metrics.revertRate)}).`,
    "",
    "| size | automated | human |",
    "| --- | --- | --- |",
    ...metrics.buckets.map(
      (bucket) => `| ${bucket.name} | ${bucket.automated} | ${bucket.human} |`,
    ),
    "",
    "This table does not tell you whether the review caught anything. A high merge rate " +
      "and a low revert rate are also what a review that waves everything through looks " +
      "like; compare the automated rows against human rows of the same size before " +
      "reading either as an improvement.",
  ];
  return lines.join("\n");
}

function readInput(argv) {
  const fileIndex = argv.indexOf("--file");
  if (fileIndex !== -1) {
    return readFileSync(argv[fileIndex + 1], "utf8");
  }
  return readFileSync(0, "utf8");
}

function main() {
  const argv = process.argv.slice(2);
  let prs;
  try {
    prs = JSON.parse(readInput(argv));
  } catch (error) {
    console.error(`review-metrics: could not read the pull request list: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  if (!Array.isArray(prs)) {
    console.error("review-metrics: expected a JSON array of pull requests");
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`${renderMetrics(summarizePRs(prs))}\n`);
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  main();
}
