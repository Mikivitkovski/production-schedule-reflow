import type { ReflowInput, WorkCenterDoc, WorkOrderDoc } from "../src/reflow/types.js";

const wc2: WorkCenterDoc = {
  docId: "wc-2",
  docType: "workCenter",
  data: {
    name: "Extrusion Line 2",
    shifts: [
      { dayOfWeek: 1, startHour: 8, endHour: 17 },
      { dayOfWeek: 2, startHour: 8, endHour: 17 },
      { dayOfWeek: 3, startHour: 8, endHour: 17 },
      { dayOfWeek: 4, startHour: 8, endHour: 17 },
      { dayOfWeek: 5, startHour: 8, endHour: 17 }
    ],
    maintenanceWindows: []
  }
};

const wo: WorkOrderDoc = {
  docId: "wo-shift",
  docType: "workOrder",
  data: {
    workOrderNumber: "WO-SHIFT",
    manufacturingOrderId: "mo-x",
    workCenterId: "wc-2",
    startDate: "2026-02-09T16:00:00Z",
    endDate: "2026-02-09T17:00:00Z",
    durationMinutes: 180,
    isMaintenance: false,
    dependsOnWorkOrderIds: []
  }
};

export const scenario2: ReflowInput = {
  workCenters: [wc2],
  workOrders: [wo]
};
