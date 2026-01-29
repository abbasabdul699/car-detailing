export type CustomerType = "new" | "returning";

export function getCustomerTypeFromHistory({
  completedServiceCount,
  lastCompletedServiceAt,
  referenceDate,
}: {
  completedServiceCount?: number | null;
  lastCompletedServiceAt?: string | Date | null;
  referenceDate?: string | Date | null;
}): CustomerType {
  const count = completedServiceCount ?? 0;
  const last = lastCompletedServiceAt
    ? new Date(lastCompletedServiceAt)
    : null;
  const ref = referenceDate ? new Date(referenceDate) : new Date();

  if (!last || Number.isNaN(last.getTime()) || count <= 0) {
    return "new";
  }

  if (count > 1) {
    return "returning";
  }

  return last.getTime() < ref.getTime() ? "returning" : "new";
}

if (process.env.NODE_ENV !== "production") {
  const ref = new Date("2026-01-01T12:00:00Z");
  console.assert(
    getCustomerTypeFromHistory({ completedServiceCount: 0, referenceDate: ref }) === "new",
    "[customerType] expected new when no completed services"
  );
  console.assert(
    getCustomerTypeFromHistory({
      completedServiceCount: 1,
      lastCompletedServiceAt: "2025-12-31T12:00:00Z",
      referenceDate: ref
    }) === "returning",
    "[customerType] expected returning when prior completed service exists"
  );
  console.assert(
    getCustomerTypeFromHistory({
      completedServiceCount: 1,
      lastCompletedServiceAt: "2026-01-01T12:00:00Z",
      referenceDate: ref
    }) === "new",
    "[customerType] expected new when only service equals reference event"
  );
}
