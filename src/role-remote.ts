/**
 * Remote metadata for the pstack role settings page.
 *
 * The Host registers these descriptors with Typert and the Client mounts the
 * same contribution. The descriptors and their parsers are browser-safe and
 * import no Node runtime.
 */

import type {
  InvocationDescriptor,
  InvocationParameterDescriptor,
  RemoteResult,
  TypertClientRemote,
  TypertCodec,
  TypertRemoteInfo,
  TypertRemoteMethod,
  TypertSchema,
} from "@deepseek-ai/dsh-typert-protocol";
import type { TypertContribution } from "@deepseek-ai/dsh-typert-registry";

import type { CatalogueResult } from "./models.ts";
import { type BudgetApplyRequest, parseBudgetApplyRequest } from "./budget.ts";
import {
  parseBudgetApplyResult,
  parseCatalogueResult,
  parseRoleFileSnapshot,
  parseSaveRoleRequest,
  parseSaveRoleResult,
  type BudgetApplyResult,
  type RoleFileSnapshot,
  type SaveRoleRequest,
  type SaveRoleResult,
} from "./role-wire.ts";

/** npm package owning these methods. */
export const REMOTE_PACKAGE = "dsh-pstack";

/** Cordis service key and wire namespace. */
export const ROLES_SERVICE = "pstackRoles";

type StrictCodec<Value> = Extract<TypertCodec<Value>, { readonly mode: "strict" }>;

function codec<Value>(typeSymbol: string, parse: (value: unknown) => Value): StrictCodec<Value> {
  return {
    mode: "strict",
    typeSymbol,
    create: (): TypertSchema<Value> => ({ parse }),
    decode: parse,
  };
}

function parameter(
  name: string,
  typeSymbol: string,
  parse: (value: unknown) => unknown,
): InvocationParameterDescriptor {
  return { name, wire: name, source: "json", codec: codec(typeSymbol, parse) };
}

interface DirectOptions<Output> {
  readonly method: string;
  readonly parameters: readonly InvocationParameterDescriptor[];
  readonly result: StrictCodec<Output>;
  readonly cancellation?: boolean;
}

function directMethod<Input extends object, Output>(
  options: DirectOptions<Output>,
): TypertRemoteMethod<Input, Output> {
  const descriptor: InvocationDescriptor = {
    id: `${REMOTE_PACKAGE}#${ROLES_SERVICE}/${options.method}`,
    service: ROLES_SERVICE,
    namespace: ROLES_SERVICE,
    method: options.method,
    invocation: { kind: "direct" },
    parameters: options.parameters,
    result: options.result,
    ...(options.cancellation === true ? { cancellation: { parameter: "signal" } } : {}),
  };
  const method = {
    ...descriptor,
    input(): { create: () => TypertSchema<Input> } {
      return {
        create: () => ({
          parse(value: unknown): Input {
            if (typeof value !== "object" || value === null || Array.isArray(value)) {
              throw new TypeError("the method input must be an object");
            }
            const record = value as Record<string, unknown>;
            const parsed: Record<string, unknown> = {};
            for (const item of options.parameters) {
              if (item.codec.mode !== "strict") throw new TypeError("expected a strict codec");
              parsed[item.wire] = item.codec.create().parse(record[item.wire]);
            }
            return parsed as Input;
          },
        }),
      };
    },
    invoke(
      remote: TypertClientRemote,
      input: Input,
      signal?: AbortSignal,
    ): Promise<RemoteResult<Output>> {
      const namespace = Reflect.get(remote as object, ROLES_SERVICE) as Record<
        string,
        (...args: unknown[]) => Promise<RemoteResult<Output>>
      >;
      const values = options.parameters.map(
        (item) => (input as Record<string, unknown>)[item.wire],
      );
      if (options.cancellation === true) values.push(signal);
      return namespace[options.method]!(...values);
    },
  };
  return method as TypertRemoteMethod<Input, Output>;
}

const statusMethod = directMethod<Record<string, never>, RoleFileSnapshot>({
  method: "status",
  parameters: [],
  result: codec("PstackRoleFileSnapshot", parseRoleFileSnapshot),
});

const catalogueMethod = directMethod<Record<string, never>, CatalogueResult>({
  method: "catalogue",
  parameters: [],
  result: codec("PstackRoleCatalogue", parseCatalogueResult),
  cancellation: true,
});

const saveMethod = directMethod<{ request: SaveRoleRequest }, SaveRoleResult>({
  method: "save",
  parameters: [parameter("request", "PstackSaveRoleRequest", parseSaveRoleRequest)],
  result: codec("PstackSaveRoleResult", parseSaveRoleResult),
  cancellation: true,
});

const budgetMethod = directMethod<{ request: BudgetApplyRequest }, BudgetApplyResult>({
  method: "budget",
  parameters: [parameter("request", "PstackBudgetApplyRequest", parseBudgetApplyRequest)],
  result: codec("PstackBudgetApplyResult", parseBudgetApplyResult),
  cancellation: true,
});

/** Typed Client face installed by `$mount()`. */
export interface PstackRolesNamespace {
  readonly pstackRoles: {
    status(): Promise<RemoteResult<RoleFileSnapshot>>;
    catalogue(signal?: AbortSignal): Promise<RemoteResult<CatalogueResult>>;
    save(request: SaveRoleRequest, signal?: AbortSignal): Promise<RemoteResult<SaveRoleResult>>;
    budget(
      request: BudgetApplyRequest,
      signal?: AbortSignal,
    ): Promise<RemoteResult<BudgetApplyResult>>;
  };
}

/** Mountable contribution shared by Host registration and Client `$mount`. */
export const pstackRolesRemote: TypertRemoteInfo = {
  package: REMOTE_PACKAGE,
  descriptors: [statusMethod, catalogueMethod, saveMethod, budgetMethod] as InvocationDescriptor[],
  methods: {
    [`${ROLES_SERVICE}/status`]: statusMethod,
    [`${ROLES_SERVICE}/catalogue`]: catalogueMethod,
    [`${ROLES_SERVICE}/save`]: saveMethod,
    [`${ROLES_SERVICE}/budget`]: budgetMethod,
  } as TypertRemoteInfo["methods"],
};

/** Register the Host's strict invocation definitions in `ctx.typert.local`. */
export const pstackRolesHostContribution: TypertContribution = {
  package: REMOTE_PACKAGE,
  face: "host",
  schemas: [],
  model: { services: [], events: [], objects: [] },
  invocations: pstackRolesRemote.descriptors,
};
