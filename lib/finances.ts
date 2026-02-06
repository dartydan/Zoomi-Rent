import type { ManualExpense } from "./manual-expenses-store";
import type { MachineInfo, Unit } from "./unit";

function machineCost(m: MachineInfo): number {
  const repair = m.additionalCosts?.length
    ? m.additionalCosts.reduce((s, e) => s + e.amount, 0)
    : m.repairCosts;
  return m.purchaseCost + repair;
}

/** Sum of acquisition + repair/additional costs across all units. */
export function computeMoneyOut(units: Unit[]): number {
  return units.reduce((total, unit) => {
    return total + machineCost(unit.washer) + machineCost(unit.dryer);
  }, 0);
}

function dateInRange(dateStr: string, startDate: string, endDate: string): boolean {
  const d = dateStr.split("T")[0];
  if (!d || d.length !== 10) return false;
  return d >= startDate && d <= endDate;
}

export type ExpenseTransaction = {
  date: string;
  amount: number;
  description: string;
  unitId: string;
};

/** List of expense transactions in date range. */
export function getExpenseTransactions(
  units: Unit[],
  manualExpenses: ManualExpense[],
  startDate: string,
  endDate: string
): ExpenseTransaction[] {
  const items: ExpenseTransaction[] = [];
  for (const e of manualExpenses) {
    const d = e.date.split("T")[0];
    if (dateInRange(d, startDate, endDate)) {
      items.push({
        date: d,
        amount: e.amount,
        description: e.description,
        unitId: "",
      });
    }
  }
  for (const unit of units) {
    const unitDate = unit.createdAt.split("T")[0];
    for (const machine of [unit.washer, unit.dryer] as const) {
      const machineLabel = machine === unit.washer ? "Washer" : "Dryer";
      const acqDate = machine.acquisitionDate ?? unitDate;
      if (dateInRange(acqDate, startDate, endDate) && machine.purchaseCost > 0) {
        items.push({
          date: acqDate,
          amount: machine.purchaseCost,
          description: `${machineLabel} acquisition`,
          unitId: unit.id,
        });
      }
      if (machine.additionalCosts?.length) {
        for (const e of machine.additionalCosts) {
          const entryDate = (e.date ?? unitDate).split("T")[0];
          if (dateInRange(entryDate, startDate, endDate)) {
            items.push({
              date: entryDate,
              amount: e.amount,
              description: e.description || `${machineLabel} repair`,
              unitId: unit.id,
            });
          }
        }
      } else if (dateInRange(unitDate, startDate, endDate) && machine.repairCosts > 0) {
        items.push({
          date: unitDate,
          amount: machine.repairCosts,
          description: `${machineLabel} repair`,
          unitId: unit.id,
        });
      }
    }
  }
  items.sort((a, b) => b.date.localeCompare(a.date));
  return items;
}

/** Sum of costs that fall within the date range. Uses acquisitionDate, additionalCosts[].date, or unit createdAt as fallback. Dates are YYYY-MM-DD for timezone-safe comparison. */
export function computeMoneyOutForPeriod(
  units: Unit[],
  manualExpenses: ManualExpense[],
  startDate: string,
  endDate: string
): number {
  let total = 0;
  for (const e of manualExpenses) {
    const d = e.date.split("T")[0];
    if (dateInRange(d, startDate, endDate)) total += e.amount;
  }
  for (const unit of units) {
    const unitDate = unit.createdAt.split("T")[0];
    for (const machine of [unit.washer, unit.dryer]) {
      const acqDate = machine.acquisitionDate ?? unitDate;
      if (dateInRange(acqDate, startDate, endDate)) {
        total += machine.purchaseCost;
      }
      if (machine.additionalCosts?.length) {
        for (const e of machine.additionalCosts) {
          const entryDate = (e.date ?? unitDate).split("T")[0];
          if (dateInRange(entryDate, startDate, endDate)) total += e.amount;
        }
      } else if (dateInRange(unitDate, startDate, endDate)) {
        total += machine.repairCosts;
      }
    }
  }
  return total;
}
