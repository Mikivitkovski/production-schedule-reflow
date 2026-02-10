import { DateTime } from "luxon";
import type { ReflowInput, ReflowOutput, WorkCenterDoc, WorkOrderDoc } from "./types.js";
import { addWorkingMinutes, dt, maxDt, minutesBetween, nextWorkingInstant, toIso } from "../utils/date-utils.js";

type CenterIndex = {
  center: WorkCenterDoc;
  maintenanceOrdersFixed: WorkOrderDoc[];
};

function buildCenterIndex(workCenters: WorkCenterDoc[], workOrders: WorkOrderDoc[]): Map<string, CenterIndex> {
  const map = new Map<string, CenterIndex>();
  for (const c of workCenters) {
    map.set(c.docId, { center: c, maintenanceOrdersFixed: [] });
  }
  for (const wo of workOrders) {
    if (wo.data.isMaintenance) {
      const entry = map.get(wo.data.workCenterId);
      if (!entry) throw new Error(`Unknown workCenterId on workOrder ${wo.docId}: ${wo.data.workCenterId}`);
      entry.maintenanceOrdersFixed.push(wo);
    }
  }
  for (const entry of map.values()) {
    entry.maintenanceOrdersFixed.sort((a, b) => dt(a.data.startDate).toMillis() - dt(b.data.startDate).toMillis());
  }
  return map;
}

function topoSort(workOrders: WorkOrderDoc[]): WorkOrderDoc[] {
  const byId = new Map(workOrders.map((w) => [w.docId, w]));
  const indeg = new Map<string, number>();
  const children = new Map<string, string[]>();

  for (const w of workOrders) {
    indeg.set(w.docId, 0);
    children.set(w.docId, []);
  }

  for (const w of workOrders) {
    for (const p of w.data.dependsOnWorkOrderIds) {
      if (!byId.has(p)) throw new Error(`WorkOrder ${w.docId} depends on missing parent ${p}`);
      indeg.set(w.docId, (indeg.get(w.docId) ?? 0) + 1);
      children.get(p)!.push(w.docId);
    }
  }

  const q: string[] = [];
  for (const [id, d] of indeg.entries()) if (d === 0) q.push(id);

  q.sort((a, b) => dt(byId.get(a)!.data.startDate).toMillis() - dt(byId.get(b)!.data.startDate).toMillis());

  const out: WorkOrderDoc[] = [];
  while (q.length) {
    const id = q.shift()!;
    out.push(byId.get(id)!);

    for (const ch of children.get(id)!) {
      indeg.set(ch, (indeg.get(ch) ?? 0) - 1);
      if (indeg.get(ch) === 0) q.push(ch);
    }
  }

  if (out.length !== workOrders.length) {
    const cyclic = [...indeg.entries()].filter(([, d]) => d > 0).map(([id]) => id);
    throw new Error(`Cycle detected in dependencies. Involved workOrders: ${cyclic.join(", ")}`);
  }
  return out;
}

export class ReflowService {
  reflow(input: ReflowInput): ReflowOutput {
    const workOrders = input.workOrders;
    const workCenters = input.workCenters;

    const centerIndex = buildCenterIndex(workCenters, workOrders);
    const ordered = topoSort(workOrders);

    const explanation: Record<string, string[]> = {};
    const updatedById = new Map<string, WorkOrderDoc>();

    const scheduledEnd = new Map<string, DateTime>();
    const nextFreeByCenter = new Map<string, DateTime>();

    const globalStart = ordered.length ? dt(ordered[0].data.startDate) : DateTime.utc();
    for (const c of workCenters) {
      nextFreeByCenter.set(c.docId, globalStart);
    }

    for (const wo of ordered) {
      explanation[wo.docId] = [];
      const centerEntry = centerIndex.get(wo.data.workCenterId);
      if (!centerEntry) throw new Error(`Unknown workCenterId ${wo.data.workCenterId} on ${wo.docId}`);
      const center = centerEntry.center;

      const parents = wo.data.dependsOnWorkOrderIds;
      let parentsEndMax = dt("1970-01-01T00:00:00Z");
      for (const p of parents) {
        const pe = scheduledEnd.get(p);
        if (!pe) throw new Error(`Parent ${p} not scheduled yet (unexpected topo failure)`);
        parentsEndMax = maxDt(parentsEndMax, pe);
      }
      if (parents.length) {
        explanation[wo.docId].push(`Dependency: waits for parents until ${toIso(parentsEndMax)}.`);
      }

      const originalStart = dt(wo.data.startDate);
      const originalEnd = dt(wo.data.endDate);

      const centerFree = nextFreeByCenter.get(center.docId)!;
      if (centerFree.toMillis() > originalStart.toMillis()) {
        explanation[wo.docId].push(`Work center busy until ${toIso(centerFree)}.`);
      }

      let candidate = originalStart;
      candidate = maxDt(candidate, parentsEndMax);
      candidate = maxDt(candidate, centerFree);

      if (wo.data.isMaintenance) {
        updatedById.set(wo.docId, wo);
        scheduledEnd.set(wo.docId, originalEnd);

        const newCenterFree = maxDt(centerFree, originalEnd);
        nextFreeByCenter.set(center.docId, newCenterFree);
        explanation[wo.docId].push("Fixed maintenance: not rescheduled.");
        continue;
      }

      const blocked = [...center.data.maintenanceWindows];
      for (const fixed of centerEntry.maintenanceOrdersFixed) {
        blocked.push({
          startDate: fixed.data.startDate,
          endDate: fixed.data.endDate,
          reason: `Fixed maintenance work order ${fixed.docId}`
        });
      }

      const snappedStart = nextWorkingInstant(candidate, center.data.shifts, blocked);
      if (snappedStart.toMillis() !== candidate.toMillis()) {
        explanation[wo.docId].push(`Adjusted start to working time: ${toIso(snappedStart)}.`);
      }

      const { end: newEnd } = addWorkingMinutes(snappedStart, wo.data.durationMinutes, center.data.shifts, blocked);

      const updated: WorkOrderDoc = {
        ...wo,
        data: {
          ...wo.data,
          startDate: toIso(snappedStart),
          endDate: toIso(newEnd)
        }
      };

      updatedById.set(wo.docId, updated);
      scheduledEnd.set(wo.docId, newEnd);
      nextFreeByCenter.set(center.docId, newEnd);

      for (const w of blocked) {
        const wStart = dt(w.startDate);
        if (wStart.toMillis() >= snappedStart.toMillis() && wStart.toMillis() <= newEnd.toMillis()) {
          explanation[wo.docId].push(`Avoided maintenance block (${w.reason ?? "maintenance window"}) starting ${w.startDate}.`);
          break;
        }
      }

      if (minutesBetween(originalStart, snappedStart) !== 0) {
        explanation[wo.docId].push(`Moved start by ${minutesBetween(originalStart, snappedStart)} minutes.`);
      }
      if (minutesBetween(originalEnd, newEnd) !== 0) {
        explanation[wo.docId].push(`Moved end by ${minutesBetween(originalEnd, newEnd)} minutes.`);
      }
    }

    const updatedWorkOrders = workOrders.map((w) => updatedById.get(w.docId) ?? w);

    const changes = updatedWorkOrders
      .map((u) => {
        const old = workOrders.find((x) => x.docId === u.docId)!;
        const oldStart = dt(old.data.startDate);
        const oldEnd = dt(old.data.endDate);
        const newStart = dt(u.data.startDate);
        const newEnd = dt(u.data.endDate);

        const deltaS = minutesBetween(oldStart, newStart);
        const deltaE = minutesBetween(oldEnd, newEnd);

        if (deltaS === 0 && deltaE === 0) return null;

        return {
          workOrderDocId: u.docId,
          oldStartDate: old.data.startDate,
          oldEndDate: old.data.endDate,
          newStartDate: u.data.startDate,
          newEndDate: u.data.endDate,
          deltaStartMinutes: deltaS,
          deltaEndMinutes: deltaE,
          reasons: explanation[u.docId] ?? []
        };
      })
      .filter(Boolean) as any;

    return {
      updatedWorkOrders,
      changes,
      explanationByWorkOrderId: explanation
    };
  }
}
