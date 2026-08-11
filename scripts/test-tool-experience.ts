import assert from "node:assert/strict";
import { allTools } from "../src/lib/all-tools";
import { proTools } from "../src/lib/pro-tools";
import { getNextToolSlugs, type ExperienceToolSlug } from "../src/lib/tool-experience";

const tools = [...allTools, ...proTools];
const valid = new Set<ExperienceToolSlug>(tools.map((tool) => tool.slug as ExperienceToolSlug));

for (const tool of tools) {
  const slug = tool.slug as ExperienceToolSlug;
  const next = getNextToolSlugs(slug);
  assert.ok(next.length >= 1 && next.length <= 3, `${slug}: deve sugerir de 1 a 3 próximas ações`);
  assert.equal(new Set(next).size, next.length, `${slug}: sugestões duplicadas`);
  assert.ok(!next.includes(slug), `${slug}: não deve sugerir a própria ferramenta`);
  next.forEach((nextSlug) => assert.ok(valid.has(nextSlug), `${slug}: sugestão inexistente ${nextSlug}`));
}

assert.deepEqual(getNextToolSlugs("ocr-pdf"), ["pdf-para-word", "pdf-para-excel", "limpar-documento-digitalizado"]);
assert.deepEqual(getNextToolSlugs("assinatura-digital-pdf"), ["proteger-pdf", "pdf-a", "remover-metadados"]);
assert.deepEqual(getNextToolSlugs("editar-pdf"), ["compactar-pdf", "proteger-pdf", "assinar-pdf"]);

console.log(`tool-experience: ${tools.length} ferramentas validadas`);
