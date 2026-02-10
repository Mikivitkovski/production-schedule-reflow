import type { ReflowInput, WorkCenterDoc, WorkOrderDoc, ManufacturingOrderDoc } from "../src/reflow/types.js";

const wc1: WorkCenterDoc = {
  docId: "wc-1",
  docType: "workCenter",
  data: {
    name: "Extrusion Line 1",
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

const mo: ManufacturingOrderDoc = {
  docId: "mo-1",
  docType: "manufacturingOrder",
  data: {
    manufacturingOrderNumber: "MO-100",
    itemId: "PIPE-42",
    quantity: 1000,
    dueDate: "2026-02-09T17:00:00Z"
  }
};

const A: WorkOrderDoc = {
  docId: "wo-A",
  docType: "workOrder",
  data: {
    workOrderNumber: "WO-A",
    manufacturingOrderId: "mo-1",
    workCenterId: "wc-1",
    startDate: "2026-02-09T08:00:00Z",
    endDate: "2026-02-09T10:00:00Z",
    durationMinutes: 240,
    isMaintenance: false,
    dependsOnWorkOrderIds: []
  }
};

const B: WorkOrderDoc = {
  docId: "wo-B",
  docType: "workOrder",
  data: {
    workOrderNumber: "WO-B",
    manufacturingOrderId: "mo-1",
    workCenterId: "wc-1",
    startDate: "2026-02-09T10:00:00Z",
    endDate: "2026-02-09T12:00:00Z",
    durationMinutes: 120,
    isMaintenance: false,
    dependsOnWorkOrderIds: ["wo-A"]
  }
};

const C: WorkOrderDoc = {
  docId: "wo-C",
  docType: "workOrder",
  data: {
    workOrderNumber: "WO-C",
    manufacturingOrderId: "mo-1",
    workCenterId: "wc-1",
    startDate: "2026-02-09T12:00:00Z",
    endDate: "2026-02-09T14:00:00Z",
    durationMinutes: 180,
    isMaintenance: false,
    dependsOnWorkOrderIds: ["wo-B"]
  }
};

export const scenario1: ReflowInput = {
  workCenters: [wc1],
  workOrders: [A, B, C],
  manufacturingOrders: [mo]
};
