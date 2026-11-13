import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateContracts } from "../scripts/blueprint-validator-lib.mjs";
import Ajv2020 from "ajv/dist/2020.js";

const json = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const baseline = () => ({ blueprint: json("../blueprint.json"), users: json("../mock/user.json"), products: json("../mock/products.json") });

test("accepts the v1.4.0 baseline fixtures", () => {
  assert.deepEqual(validateContracts(baseline()), []);
});

test("rejects a missing requirement ID", () => {
  const data = baseline();
  data.blueprint.Requirements.items.pop();
  assert.ok(validateContracts(data).some((error) => error.includes("F-01 through F-29")));
});

test("rejects an unregistered BottomNav route", () => {
  const data = baseline();
  data.blueprint.AppShell.children.find((item) => item.component === "BottomNav").items[0].route = "/missing";
  assert.ok(validateContracts(data).some((error) => error.includes("BottomNav route")));
});

test("rejects a dynamic parameter contract mismatch", () => {
  const data = baseline();
  data.blueprint.Routing.dynamicParameters.routeParameters.find((item) => item.route === "/tours/:tourId").parameters[0].name = "id";
  assert.ok(validateContracts(data).some((error) => error.includes("Dynamic parameter names")));
});

test("rejects booking access without owner verification", () => {
  const data = baseline();
  data.blueprint.Routing.resourceOwnership.booking.publicAccess = true;
  assert.ok(validateContracts(data).some((error) => error.includes("Booking ownership policy")));
});

test("rejects inconsistent guest credentials", () => {
  const data = baseline();
  data.users.users.find((item) => item.isGuest).credentials = { password: "not-allowed" };
  assert.ok(validateContracts(data).some((error) => error.includes("Guest user")));
});

test("rejects product remaining capacity above total capacity", () => {
  const data = baseline();
  data.products.products[0].availability.remaining = data.products.products[0].availability.capacity + 1;
  assert.ok(validateContracts(data).some((error) => error.includes("capacity/remaining")));
});

test("JSON Schemas accept the committed valid fixtures", () => {
  const ajv = new Ajv2020({ allErrors: true });
  const validateUsers = ajv.compile(json("../schemas/mock-user.schema.json"));
  const validateProducts = ajv.compile(json("../schemas/mock-products.schema.json"));
  const data = baseline();
  assert.equal(validateUsers(data.users), true);
  assert.equal(validateProducts(data.products), true);
});

test("JSON Schemas reject unknown user fields and invalid product ratings", () => {
  const ajv = new Ajv2020({ allErrors: true });
  const validateUsers = ajv.compile(json("../schemas/mock-user.schema.json"));
  const validateProducts = ajv.compile(json("../schemas/mock-products.schema.json"));
  const data = baseline();
  data.users.users[0].unexpected = true;
  assert.equal(validateUsers(data.users), false);
  const invalidProducts = baseline().products;
  invalidProducts.products[0].rating.average = 5.1;
  assert.equal(validateProducts(invalidProducts), false);
});
