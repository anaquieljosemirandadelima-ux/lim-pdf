import assert from "node:assert/strict";
import { allTools } from "../src/lib/all-tools";
import { proTools } from "../src/lib/pro-tools";
import { releaseTools } from "../src/lib/release-tools";
import { getNextToolSlugs, type ExperienceToolSlug } from "../src/lib/tool-experience";

const tools = [...allTools, ...proTools, ...releaseTools];
const valid = new Set<ExperienceToolSlug>(tools.map((tool) => tool.slug as ExperienceToolSlug));
for (const tool of tools) {
  const slug = tool.slug as ExperienceToolSlug; const next = getNextToolSlugs(slug);
  assert.ok(next.length >= 1 && next.length <= 3, `${slug}: deve sugerir de 1 a 3 próximas ações`);
  assert.equal(new Set(next).size, next.length, `${slug}: sugestões duplicadas`);
  assert.ok(!next.includes(slug), `${slug}: não deve sugerir a própria ferramenta`);
  next.forEach((nextSlug) => assert.ok(valid.has(nextSlug), `${slug}: sugestão inexistente ${nextSlug}`));
}
assert.deepEqual(getNextToolSlugs("ocr-pdf"), ["converter-pdf", "pdf-para-word", "editar-pdf"]);
assert.deepEqual(getNextToolSlugs("editar-pdf"), ["preflight-pdf", "compactar-pdf", "proteger-pdf"]);
assert.deepEqual(getNextToolSlugs("converter-pdf"), ["ocr-pdf", "editar-pdf", "preflight-pdf"]);
assert.deepEqual(getNextToolSlugs("normalizar-paginas-pdf"), ["preflight-pdf", "compactar-pdf", "editar-pdf"]);
console.log(`tool-experience: ${tools.length} ferramentas validadas`);
