// Export the existing typed showcase content for the sample-PDF builder.
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const contentModule = { exports: {} };
  cache.set(file, contentModule.exports);
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const localRequire = (name) => {
    if (!name.startsWith(".")) throw new Error("Only local content imports are supported");
    return load(path.resolve(path.dirname(file), `${name}.ts`));
  };
  vm.runInNewContext(code, { exports: contentModule.exports, module: contentModule, require: localRequire }, { filename: file });
  return contentModule.exports;
}
const { research } = load(path.join(root, "src/content/mock-data.ts"));
const { researchDocuments } = load(path.join(root, "src/content/showcase-data.ts"));
process.stdout.write(JSON.stringify(research.map(publication => ({ publication, document: researchDocuments.find(doc => doc.publicationSlug === publication.slug) }))));
