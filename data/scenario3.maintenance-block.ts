import type { ReflowInput, WorkCenterDoc, WorkOrderDoc } from "../src/reflow/types.js";

const wc3: WorkCenterDoc = {
  docId: "wc-3",
  docType: "workCenter",
  data: {
    name: "Extrusion Line 3",
    shifts: [
      { dayOfWeek: 1, startHour: 8, endHour: 17 },
      { dayOfWeek: 2, startHour: 8, endHour: 17 },
      { dayOfWeek: 3, startHour: 8, endHour: 17 },
      { dayOfWeek: 4, startHour: 8, endHour: 17 },
      { dayOfWeek: 5, startHour: 8, endHour: 17 }
    ],
    maintenanceWindows: [
      {
        startDate: "2026-02-09T12:00:00Z",
        endDate: "2026-02-09T14:00:00Z",
        reason: "Planned maintenance window"
      }
    ]
  }
};

const fixedMaint: WorkOrderDoc = {
  docId: "wo-maint-fixed",
  docType: "workOrder",
  data: {
    workOrderNumber: "WO-MAINT-FIXED",
    manufacturingOrderId: "mo-y",
    workCenterId: "wc-3",
    startDate: "2026-02-09T09:30:00Z",
    endDate: "2026-02-09T10:30:00Z",
    durationMinutes: 60,
    isMaintenance: true,
    dependsOnWorkOrderIds: []
  }
};


const woBefore: WorkOrderDoc = {
  docId: "wo-prod-1",
  docType: "workOrder",
  data: {
    workOrderNumber: "WO-PROD-1",
    manufacturingOrderId: "mo-y",
    workCenterId: "wc-3",
    startDate: "2026-02-09T08:00:00Z",
    endDate: "2026-02-09T09:30:00Z",
    durationMinutes: 90,
    isMaintenance: false,
    dependsOnWorkOrderIds: []
  }
};

const woCollide: WorkOrderDoc = {
  docId: "wo-prod-2",
  docType: "workOrder",
  data: {
    workOrderNumber: "WO-PROD-2",
    manufacturingOrderId: "mo-y",
    workCenterId: "wc-3",
    startDate: "2026-02-09T10:30:00Z",
    endDate: "2026-02-09T12:30:00Z",
    durationMinutes: 240,
    isMaintenance: false,
    dependsOnWorkOrderIds: ["wo-prod-1"]
  }
};

export const scenario3: ReflowInput = {
  workCenters: [wc3],
  workOrders: [woBefore, fixedMaint, woCollide]
};
