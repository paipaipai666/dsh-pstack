/** Shared catalogue types, schema, and wire decoder. */

import type { JsonSchemaNode } from "@deepseek-ai/dsh-tools";

import { WireTypeError } from "./wire-error.ts";

export interface ModelEntry {
  readonly route: string;
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly contextWindow?: number;
  readonly maxTokens?: number;
  readonly efforts: readonly string[];
  readonly defaultEffort?: string;
  readonly error?: string;
}

export interface ProviderEntry {
  readonly provider: string;
  readonly name: string;
  readonly models: readonly ModelEntry[];
  readonly error?: string;
}

export interface CatalogueResult {
  readonly providers: readonly ProviderEntry[];
  readonly truncated: boolean;
  readonly providerFilter?: string;
}

export const CATALOGUE_OUTPUT_SCHEMA: JsonSchemaNode = {
  type: "object",
  additionalProperties: false,
  properties: {
    providers: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          provider: { type: "string" },
          name: { type: "string" },
          error: { type: "string" },
          models: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                route: { type: "string" },
                id: { type: "string" },
                name: { type: "string" },
                description: { type: "string" },
                contextWindow: { type: "integer" },
                maxTokens: { type: "integer" },
                efforts: { type: "array", items: { type: "string" } },
                defaultEffort: { type: "string" },
                error: { type: "string" },
              },
              required: ["route", "id", "name", "efforts"],
            },
          },
        },
        required: ["provider", "name", "models"],
      },
    },
    truncated: { type: "boolean" },
    providerFilter: { type: "string" },
  },
  required: ["providers", "truncated"],
};

function parseRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new WireTypeError(path, "an object");
  }
  return value as Record<string, unknown>;
}

function optionalString(
  record: Record<string, unknown>,
  key: string,
  path: string,
): string | undefined {
  const value = record[key];
  if (value !== undefined && typeof value !== "string") {
    throw new WireTypeError(`${path}.${key}`, "a string when present");
  }
  return value as string | undefined;
}

function optionalInteger(
  record: Record<string, unknown>,
  key: string,
  path: string,
): number | undefined {
  const value = record[key];
  if (value !== undefined && !Number.isSafeInteger(value)) {
    throw new WireTypeError(`${path}.${key}`, "an integer when present");
  }
  return value as number | undefined;
}

/** Parse the live model catalogue returned by the Host. */
export function parseCatalogueResult(value: unknown): CatalogueResult {
  const record = parseRecord(value, "catalogue");
  if (!Array.isArray(record["providers"])) {
    throw new WireTypeError("catalogue.providers", "an array");
  }
  if (typeof record["truncated"] !== "boolean") {
    throw new WireTypeError("catalogue.truncated", "a boolean");
  }
  const providerFilter = optionalString(record, "providerFilter", "catalogue");
  return {
    providers: record["providers"].map((provider, index) => {
      const path = `catalogue.providers[${index}]`;
      const entry = parseRecord(provider, path);
      if (typeof entry["provider"] !== "string" || typeof entry["name"] !== "string") {
        throw new WireTypeError(path, "provider and name strings");
      }
      if (!Array.isArray(entry["models"])) {
        throw new WireTypeError(`${path}.models`, "an array");
      }
      const providerError = optionalString(entry, "error", path);
      return {
        provider: entry["provider"],
        name: entry["name"],
        ...(providerError === undefined ? {} : { error: providerError }),
        models: entry["models"].map((model, modelIndex) => {
          const modelPath = `${path}.models[${modelIndex}]`;
          const item = parseRecord(model, modelPath);
          if (
            typeof item["route"] !== "string" ||
            typeof item["id"] !== "string" ||
            typeof item["name"] !== "string"
          ) {
            throw new WireTypeError(modelPath, "route, id, and name strings");
          }
          const efforts = item["efforts"];
          if (!Array.isArray(efforts) || efforts.some((effort) => typeof effort !== "string")) {
            throw new WireTypeError(`${modelPath}.efforts`, "an array of strings");
          }
          const description = optionalString(item, "description", modelPath);
          const contextWindow = optionalInteger(item, "contextWindow", modelPath);
          const maxTokens = optionalInteger(item, "maxTokens", modelPath);
          const defaultEffort = optionalString(item, "defaultEffort", modelPath);
          const modelError = optionalString(item, "error", modelPath);
          return {
            route: item["route"],
            id: item["id"],
            name: item["name"],
            ...(description === undefined ? {} : { description }),
            ...(contextWindow === undefined ? {} : { contextWindow }),
            ...(maxTokens === undefined ? {} : { maxTokens }),
            efforts,
            ...(defaultEffort === undefined ? {} : { defaultEffort }),
            ...(modelError === undefined ? {} : { error: modelError }),
          };
        }),
      };
    }),
    truncated: record["truncated"],
    ...(typeof providerFilter === "string" ? { providerFilter } : {}),
  };
}
