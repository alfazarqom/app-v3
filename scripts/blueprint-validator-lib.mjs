const ACCESS_LEVELS = new Set(["public", "guest-allowed", "authenticated"]);
const unique = (values) => new Set(values).size === values.length;
const routeParams = (route) => [...route.matchAll(/:([A-Za-z][A-Za-z0-9_]*)/g)].map((m) => m[1]);
const add = (errors, condition, message) => { if (!condition) errors.push(message); };

export function validateContracts({ blueprint, users, products }) {
  const errors = [];
  const requirements = blueprint?.Requirements?.items ?? [];
  const expectedIds = Array.from({ length: 29 }, (_, i) => `F-${String(i + 1).padStart(2, "0")}`);
  const ids = requirements.map((item) => item.id);
  add(errors, blueprint?.blueprint?.version === "1.4.0" && blueprint?.blueprint?.revision === "1.4.0", "Blueprint version and revision must be 1.4.0.");
  add(errors, blueprint?.Requirements?.baseline === "v1.4.0" && blueprint?.Requirements?.previousBaseline === "v1.3.0", "Requirement baseline must be v1.4.0 with previous baseline v1.3.0.");
  add(errors, ids.length === 29 && expectedIds.every((id) => ids.includes(id)) && unique(ids), "Requirement IDs must be exactly F-01 through F-29 with no duplicates.");
  for (const item of requirements) add(errors, Array.isArray(item.acceptanceCriteria) && item.acceptanceCriteria.length > 0, `${item.id} must have acceptance criteria.`);

  const content = blueprint?.AppShell?.children?.find((item) => item.component === "Content");
  const appPages = content?.children ?? [];
  const standalonePages = blueprint?.StandalonePages?.pages ?? [];
  const routes = [...appPages, ...standalonePages];
  const routePaths = routes.map((item) => item.route);
  add(errors, routes.length > 0 && routePaths.every((route) => typeof route === "string"), "Every registered page must declare a route.");
  add(errors, unique(routePaths), "Registered route paths must be unique.");
  for (const route of routes) add(errors, ACCESS_LEVELS.has(route.access), `Route ${route.route} has missing or invalid access.`);
  const pageIds = routes.map((item) => item.id);
  add(errors, pageIds.every(Boolean) && unique(pageIds), "Page IDs must be present and unique across AppShell and StandalonePages.");

  const registry = new Set(blueprint?.ComponentRegistry?.registeredComponents ?? []);
  const componentRefs = new Set();
  const collect = (value) => {
    if (Array.isArray(value)) return value.forEach(collect);
    if (!value || typeof value !== "object") return;
    if (typeof value.component === "string") componentRefs.add(value.component);
    Object.values(value).forEach(collect);
  };
  collect(blueprint);
  for (const component of componentRefs) add(errors, registry.has(component), `Unregistered component reference: ${component}`);

  const shellRoutes = new Set(appPages.map((item) => item.route));
  const bottomNav = blueprint?.AppShell?.children?.find((item) => item.component === "BottomNav");
  for (const item of bottomNav?.items ?? []) add(errors, shellRoutes.has(item.route), `BottomNav route is not registered in AppShell: ${item.route}`);

  const routeParamContracts = blueprint?.Routing?.dynamicParameters?.routeParameters ?? [];
  const dynamicRoutes = routes.filter((item) => routeParams(item.route).length > 0);
  add(errors, unique(routeParamContracts.map((item) => item.route)), "Dynamic route parameter contracts must have unique route entries.");
  add(errors, dynamicRoutes.length === routeParamContracts.length, "Every dynamic route must have exactly one parameter contract.");
  for (const route of dynamicRoutes) {
    const contract = routeParamContracts.find((item) => item.route === route.route);
    const declared = (contract?.parameters ?? []).map((item) => item.name);
    const expected = routeParams(route.route);
    add(errors, Boolean(contract) && unique(declared) && expected.length === declared.length && expected.every((name) => declared.includes(name)), `Dynamic parameter names do not match route template: ${route.route}`);
  }

  const ownership = blueprint?.Routing?.resourceOwnership?.booking;
  const bookingPages = standalonePages.filter((item) => ["/bookings", "/bookings/:bookingId"].includes(item.route));
  add(errors, bookingPages.length === 2 && bookingPages.every((item) => item.access === "guest-allowed" && item.ownershipPolicy === "booking-owner-verification-required"), "Booking history and detail must be guest-allowed only with owner verification.");
  add(errors, ownership?.strategy === "owner-only" && ownership?.verification === "server-side-on-every-booking-data-request" && ownership?.denyBeforeDataDisclosure === true && ownership?.publicAccess === false, "Booking ownership policy must require backend owner verification on every request.");
  add(errors, ownership?.authenticatedOwner === "authenticated-user-id-must-match-booking-owner" && ownership?.guestOwner === "backend-must-verify-guest-booking-proof", "Authenticated and guest booking ownership checks must be explicit.");
  for (const path of ["/profile", "/notifications"]) add(errors, routes.find((item) => item.route === path)?.access === "authenticated", `${path} must require authenticated access.`);
  for (const path of ["/booking", "/checkout", "/booking/confirmation"]) add(errors, standalonePages.find((item) => item.route === path)?.access === "guest-allowed", `${path} must preserve guest checkout access.`);

  add(errors, blueprint?.App?.guestAccess?.allowedAccessLevels?.join("|") === "public|guest-allowed", "App guest access levels are inconsistent.");
  add(errors, blueprint?.Routing?.accessPolicy?.guest === blueprint?.App?.guestAccess?.accessPolicy, "App and Routing guest policies must match.");
  add(errors, blueprint?.DesignSystem?.layout?.safeAreaPolicy?.owner === "application-layout", "Application layout must own safe-area handling.");
  add(errors, blueprint?.DesignSystem?.layout?.safeAreaPolicy?.prohibitDuplicateInsets === true, "Duplicate safe-area insets must be prohibited.");

  add(errors, users?.fixtureMetadata?.classification === "mock-only" && users?.fixtureMetadata?.notForProduction === true && users?.fixtureMetadata?.productionUsage === "prohibited" && users?.fixtureMetadata?.credentialUsage === "fixture-only", "User fixture must be explicitly mock-only and prohibited for production authentication.");
  add(errors, unique((users?.users ?? []).map((item) => item.id)), "Mock user IDs must be unique.");
  for (const user of users?.users ?? []) {
    add(errors, ["guest", "customer"].includes(user.role), `Invalid role for user ${user.id}.`);
    add(errors, ["active", "inactive", "suspended"].includes(user.status), `Invalid status for user ${user.id}.`);
    if (user.isGuest) add(errors, user.role === "guest" && user.authProvider === "guest" && user.phone === null && user.credentials === null, `Guest user ${user.id} must not have phone credentials.`);
    else add(errors, user.role === "customer" && user.authProvider === "phone" && /^\\+[1-9][0-9]{7,14}$/.test(user.phone ?? "") && typeof user.credentials?.password === "string" && user.credentials.password.length > 0, `Authenticated user ${user.id} must have a valid phone and password fixture.`);
  }
  add(errors, (users?.users ?? []).some((item) => item.isGuest === true), "A Guest fixture is required.");
  add(errors, (users?.users ?? []).some((item) => item.isGuest === false), "An authenticated phone fixture is required.");

  add(errors, products?.fixtureMetadata?.classification === "mock-only" && products?.fixtureMetadata?.notForProduction === true && products?.fixtureMetadata?.imageAssets === "placeholder-only", "Product fixture must be marked mock-only with placeholder images.");
  const productItems = products?.products ?? [];
  add(errors, unique(productItems.map((item) => item.id)), "Mock product IDs must be unique.");
  add(errors, unique(productItems.map((item) => item.slug)), "Mock product slugs must be unique.");
  for (const item of productItems) {
    add(errors, item.type === "tour" && item.price?.currency === "IDR" && Number.isFinite(item.price?.amount) && item.price.amount >= 0, `Product ${item.id} has invalid tour or price data.`);
    add(errors, Number.isFinite(item.duration?.value) && item.duration.value >= 1 && item.duration.value <= 365 && ["hours", "days"].includes(item.duration?.unit), `Product ${item.id} has invalid duration.`);
    add(errors, Number.isFinite(item.rating?.average) && item.rating.average >= 0 && item.rating.average <= 5 && Number.isInteger(item.rating?.count) && item.rating.count >= 0, `Product ${item.id} has invalid rating.`);
    add(errors, Number.isInteger(item.availability?.capacity) && item.availability.capacity >= 0 && Number.isInteger(item.availability?.remaining) && item.availability.remaining >= 0 && item.availability.remaining <= item.availability.capacity, `Product ${item.id} has invalid capacity/remaining values.`);
    add(errors, ["available", "limited", "sold_out", "unavailable"].includes(item.availability?.status), `Product ${item.id} has invalid availability status.`);
  }
  return errors;
}
