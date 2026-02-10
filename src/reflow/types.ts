export type Doc<TType extends string, TData> = {
  docId: string;
  docType: TType;
  data: TData;
};

export type Shift = {
  dayOfWeek: number;
  startHour: number;
  endHour: number;
};

export type MaintenanceWindow = {
  startDate: string;
  endDate: string;
  reason?: string;
};

export type WorkOrderData = {
  workOrderNumber: string;
  manufacturingOrderId: string;
  workCenterId: string;

  startDate: string;
  endDate: string;
  durationMinutes: number;

  isMaintenance: boolean;
  dependsOnWorkOrderIds: string[];
};

export type WorkCenterData = {
  name: string;
  shifts: Shift[];
  maintenanceWindows: MaintenanceWindow[];
};

export type ManufacturingOrderData = {
  manufacturingOrderNumber: string;
  itemId: string;
  quantity: number;
  dueDate: string;
};

export type WorkOrderDoc = Doc<"workOrder", WorkOrderData>;
export type WorkCenterDoc = Doc<"workCenter", WorkCenterData>;
export type ManufacturingOrderDoc = Doc<"manufacturingOrder", ManufacturingOrderData>;

export type ReflowInput = {
  workOrders: WorkOrderDoc[];
  workCenters: WorkCenterDoc[];
  manufacturingOrders?: ManufacturingOrderDoc[];
};

export type ReflowChange = {
  workOrderDocId: string;
  oldStartDate: string;
  oldEndDate: string;
  newStartDate: string;
  newEndDate: string;
  deltaStartMinutes: number;
  deltaEndMinutes: number;
  reasons: string[];
};

export type ReflowOutput = {
  updatedWorkOrders: WorkOrderDoc[];
  changes: ReflowChange[];
  explanationByWorkOrderId: Record<string, string[]>;
};
