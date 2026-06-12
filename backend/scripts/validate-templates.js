// Run the pattern validator against every seeded template and report drift.
// Usage: node scripts/validate-templates.js
//
// This exercises the M2 validator against real, hand-written patterns. A
// template that fails here either has a genuine arithmetic error (fix the
// seed) or uses phrasing the validator cannot model (it is skipped, which
// only affects badge coverage, never correctness).

process.env.DB_PATH = process.env.DB_PATH || require('path').join(__dirname, '../data-validate.db');

const { getAllTemplates, getTemplateById } = require('../lib/models/templateModel');
const { validatePattern } = require('../lib/engine');

const templates = getAllTemplates();
let verifiedCount = 0;
let issueCount = 0;

for (const summary of templates) {
  const template = getTemplateById(summary.id);
  const steps = (template.defaultPattern || []).map((instruction, index) => ({
    row: index + 1,
    instruction,
  }));
  const result = validatePattern(steps);
  const status = result.verified ? 'VERIFIED' : result.issues.length ? 'ISSUES ' : 'unproven';
  if (result.verified) verifiedCount += 1;
  issueCount += result.issues.length;

  console.log(
    `${status}  ${template.id}  ${template.name}  (checked ${result.checkedSteps}/${result.countedSteps})`
  );
  for (const issue of result.issues) {
    console.log(`    row ${issue.row}: expected ${issue.expected}, declared ${issue.declared}`);
    console.log(`      ${issue.instruction.slice(0, 110)}`);
  }
}

console.log(`\n${verifiedCount}/${templates.length} templates verified, ${issueCount} arithmetic issues found.`);
