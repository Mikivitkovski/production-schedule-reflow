import { describe, it, expect } from "vitest";

import { ReflowService } from "../reflow/reflow.service.js";
import { ConstraintChecker } from "../reflow/constraint-checker.js";

import { scenario1 } from "../../data/scenario1.delay-cascade.js";
import { scenario2 } from "../../data/scenario2.shift-spill.js";
import { scenario3 } from "../../data/scenario3.maintenance-block.js";

import type { WorkOrderDoc } from "../reflow/types.js";

describe("Production Schedule Reflow", () => {
  const service = new ReflowService();
  const checker = new ConstraintChecker();

  it("scenario1: delay cascade produces valid schedule", () => {
    const result = service.reflow(scenario1);
    expect(result.updatedWorkOrders.length).toBeGreaterThan(0);
    checker.validate(scenario1, result.updatedWorkOrders);
  });

  it("scenario2: shift spill produces valid schedule", () => {
    const result = service.reflow(scenario2);
    checker.validate(scenario2, result.updatedWorkOrders);
  });

  it("scenario3: maintenance window + fixed maintenance produces valid schedule", () => {
    const result = service.reflow(scenario3);
    checker.validate(scenario3, result.updatedWorkOrders);

    const fixed = result.updatedWorkOrders.find(
      (w: WorkOrderDoc) => w.docId === "wo-maint-fixed"
    );

    expect(fixed).toBeDefined();
    expect(fixed!.data.startDate).toBe("2026-02-09T09:30:00Z");
    expect(fixed!.data.endDate).toBe("2026-02-09T10:30:00Z");
  });
});
