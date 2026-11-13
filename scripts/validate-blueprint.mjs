import { readFileSync } from "node:fs";
import { validateContracts } from "./blueprint-validator-lib.mjs";

const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const errors = validateContracts({
  blueprint: readJson("../blueprint.json"),
  users: readJson("../mock/user.json"),
  products: readJson("../mock/products.json")
});
if (errors.length) {
  console.error("Blueprint validation failed:");
  for (const error of errors) console.error("- " + error);
  process.exitCode = 1;
} else {
  console.log("Blueprint validation passed: F-01..F-29, registered routes, ownership policy, mock users, and tour products.");
}
