import type { ReflowInput, WorkOrderDoc } from "./types.js";
import { dt } from "../utils/date-utils.js";

export class ConstraintChecker {
  validate(input: ReflowInput, updated: WorkOrderDoc[]): void {
    this.validateDependencies(updated);
    this.validateNoOverlap(updated);
    this.validateMaintenanceNotMoved(input, updated);
  }

  private validateDependencies(workOrders: WorkOrderDoc[]): void {
    const byId = new Map(workOrders.map((w) => [w.docId, w]));
    for (const w of workOrders) {
      const start = dt(w.data.startDate);

      for (const p of w.data.dependsOnWorkOrderIds) {
        const parent = byId.get(p);
        if (!parent) throw new Error(`Dependency validation: missing parent ${p} for ${w.docId}`);

        const parentEnd = dt(parent.data.endDate);
        if (start.toMillis() < parentEnd.toMillis()) {
          throw new Error(
            `Dependency violation: ${w.docId} starts ${w.data.startDate} before parent ${p} ends ${parent.data.endDate}`
          );
        }
      }
    }
  }

  private validateNoOverlap(workOrders: WorkOrderDoc[]): void {
    const byCenter = new Map<string, WorkOrderDoc[]>();
    for (const w of workOrders) {
      const arr = byCenter.get(w.data.workCenterId) ?? [];
      arr.push(w);
      byCenter.set(w.data.workCenterId, arr);
    }

    for (const [centerId, arr] of byCenter.entries()) {
      arr.sort((a, b) => dt(a.data.startDate).toMillis() - dt(b.data.startDate).toMillis());

      for (let i = 1; i < arr.length; i++) {
        const prev = arr[i - 1];
        const cur = arr[i];

        const prevEnd = dt(prev.data.endDate);
        const curStart = dt(cur.data.startDate);

        if (curStart.toMillis() < prevEnd.toMillis()) {
          throw new Error(
            `Overlap violation on center ${centerId}: ${prev.docId} (${prev.data.startDate}..${prev.data.endDate}) overlaps ${cur.docId} (${cur.data.startDate}..${cur.data.endDate})`
          );
        }
      }
    }
  }

  private validateMaintenanceNotMoved(input: ReflowInput, updated: WorkOrderDoc[]): void {
    const originalById = new Map(input.workOrders.map((w) => [w.docId, w]));

    for (const u of updated) {
      const orig = originalById.get(u.docId);
      if (!orig) continue;

      if (!orig.data.isMaintenance) continue;

      if (orig.data.startDate !== u.data.startDate || orig.data.endDate !== u.data.endDate) {
        throw new Error(`Maintenance work order moved (not allowed): ${u.docId}`);
      }
    }
  }
}
