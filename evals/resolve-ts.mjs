// Resolve hook for evals/register.mjs: a relative specifier without an extension resolves to `<specifier>.ts`, or to
// `<specifier>/index.ts` for a folder (the project's bundler-style imports).
export async function resolve(specifier, context, next) {
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]sx?$|\.json$/.test(specifier)) {
    for (const candidate of [`${specifier}.ts`, `${specifier}/index.ts`]) {
      try {
        return await next(candidate, context);
      } catch {
        // Try the next form, then the default resolution.
      }
    }
  }
  return next(specifier, context);
}
