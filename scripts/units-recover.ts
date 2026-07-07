import { diagnoseUnitsStore, recoverUnits } from "../lib/unit-store";

async function main() {
  console.log("GET /api/admin/units/recover (diagnose)");
  const diagnosis = await diagnoseUnitsStore();
  console.log(JSON.stringify(diagnosis, null, 2));

  console.log("\nPOST /api/admin/units/recover (recover)");
  const result = await recoverUnits();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
