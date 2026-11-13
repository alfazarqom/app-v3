import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";

const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const ajv = new Ajv2020({ allErrors: true, strict: false });

const contracts = [
  ["schemas/blueprint.schema.json", "blueprint.json"],
  ["schemas/mock-user.schema.json", "mock/user.json"],
  ["schemas/mock-products.schema.json", "mock/products.json"]
];

let failed = false;
for (const [schemaPath, dataPath] of contracts) {
  const validate = ajv.compile(readJson("../" + schemaPath));
  const data = readJson("../" + dataPath);
  if (validate(data)) {
    console.log(`PASS ${dataPath} matches ${schemaPath}`);
  } else {
    failed = true;
    console.error(`FAIL ${dataPath} does not match ${schemaPath}`);
    for (const error of validate.errors ?? []) {
      console.error(`- ${error.instancePath || "/"}: ${error.message}`);
    }
  }
}

if (failed) process.exitCode = 1;
