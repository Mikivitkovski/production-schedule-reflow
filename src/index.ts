import { ReflowService } from "./reflow/reflow.service.js";
import { ConstraintChecker } from "./reflow/constraint-checker.js";
import type { ReflowInput, ReflowOutput } from "./reflow/types.js";

import { scenario1 } from "../data/scenario1.delay-cascade.js";
import { scenario2 } from "../data/scenario2.shift-spill.js";
import { scenario3 } from "../data/scenario3.maintenance-block.js";

function pickScenario(arg?: string): ReflowInput {
  switch (arg) {
    case "1":
      return scenario1;
    case "2":
      return scenario2;
    case "3":
      return scenario3;
    default:
      return scenario1;
  }
}

function printResult(name: string, _input: ReflowInput, result: ReflowOutput) {
  console.log("\n==============================");
  console.log(`Scenario: ${name}`);
  console.log("==============================\n");

  console.log("Updated Work Orders:");
  for (const wo of result.updatedWorkOrders) {
    console.log(
      `- ${wo.docId} (${wo.data.workCenterId}) ${wo.data.startDate} -> ${wo.data.endDate} | dur=${wo.data.durationMinutes} | maint=${wo.data.isMaintenance}`
    );
  }

  console.log("\nChanges:");
  if (!result.changes.length) console.log("(no changes)");
  for (const ch of result.changes) {
    console.log(
      `- ${ch.workOrderDocId}: start Δ${ch.deltaStartMinutes}min, end Δ${ch.deltaEndMinutes}min`
    );
    for (const r of ch.reasons) console.log(`    • ${r}`);
  }

  console.log("\nExplanation (by work order):");
  for (const [id, reasons] of Object.entries(result.explanationByWorkOrderId)) {
    console.log(`- ${id}`);
    for (const r of reasons) console.log(`    • ${r}`);
  }

  console.log("");
}

const arg = process.argv[2];
const input = pickScenario(arg);
const service = new ReflowService();
const checker = new ConstraintChecker();

const result = service.reflow(input);
checker.validate(input, result.updatedWorkOrders);

const scenarioName =
  arg === "2"
    ? "Shift spill"
    : arg === "3"
      ? "Maintenance block + fixed maintenance"
      : "Delay cascade";

printResult(scenarioName, input, result);

console.log("VALID ✅");
