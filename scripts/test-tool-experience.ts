import assert from "node:assert/strict";
import { allTools, type AllToolSlug } from "../src/lib/all-tools";
import { getNextToolSlugs } from "../src/lib/tool-experience";

const valid = new Set<AllToolSlug>(allTools.map((tool) => tool.slug));

for (const tool of allTools) {
  const next = getNextToolSlugs(tool.slug);
  assert.ok(next.length >= 1 && next.length <= 3, `${tool.slug}: deve sugerir de 1 a 3 próximas ações`);
  assert.equal(new Set(next).size, next.length, `${tool.slug}: sugestões duplicadas`);
  assert.ok(!next.includes(tool.slug), `${tool.slug}: não deve sugerir a própria ferramenta`);
  next.forEach((slug) => assert.ok(valid.has(slug), `${tool.slug}: sugestão inexistente ${slug}`));
}

console.log(`tool-experience: ${allTools.length} ferramentas validadas`);
