/**
 * The npm package name this bundle ships as.
 *
 * The client module loader keys every factory by the id written into the
 * bundle banner, and the composition keys each row by the package name it
 * names in `cordis.patch.yml`. A fork published under a scope must therefore
 * register under the scoped name: a bare `dsh-pstack` banner id makes the same
 * bundle execute twice (once for the row, once for the unresolved id) and the
 * loader rejects it with `duplicate factory registration`.
 *
 * Remote invocation descriptors carry the same string, so the Host and the
 * Client agree on who owns a method. `tests/package-name.test.ts` keeps this
 * constant equal to `package.json#name`.
 */
export const PACKAGE_NAME = "@paipaipai666/dsh-pstack";
