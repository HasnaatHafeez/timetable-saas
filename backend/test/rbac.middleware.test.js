const test = require("node:test");
const assert = require("node:assert/strict");

const { requirePermission } = require("../src/middlewares/rbac.middleware");
const { PERMISSIONS } = require("../src/config/permissions");

const createResponse = () => {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
};

const runPermissionCheck = ({ requiredPermission, role, userId = "u-1" }) => {
  const middleware = requirePermission(requiredPermission);
  const req = {
    user: {
      id: userId,
      role,
    },
  };
  const res = createResponse();
  let nextCalled = false;

  middleware(req, res, () => {
    nextCalled = true;
  });

  return { req, res, nextCalled };
};

test("hierarchy expansion: audit:read_all includes audit:read_own", () => {
  const { nextCalled, res } = runPermissionCheck({
    requiredPermission: PERMISSIONS.AUDIT_READ_OWN,
    role: "INSTITUTION_OWNER",
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});

test("OR permission: read_own satisfies [read_all, read_own]", () => {
  const { req, nextCalled, res } = runPermissionCheck({
    requiredPermission: [PERMISSIONS.AUDIT_READ_ALL, PERMISSIONS.AUDIT_READ_OWN],
    role: "STAFF_ADMIN",
    userId: "staff-1",
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(req.scope, { type: "OWN", userId: "staff-1" });
});

test("scope assignment: read_all maps to ALL scope", () => {
  const { req, nextCalled, res } = runPermissionCheck({
    requiredPermission: [PERMISSIONS.AUDIT_READ_ALL, PERMISSIONS.AUDIT_READ_OWN],
    role: "INSTITUTION_OWNER",
    userId: "owner-1",
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(req.scope, { type: "ALL" });
});

test("scope assignment: read_own maps to OWN scope with userId", () => {
  const { req, nextCalled, res } = runPermissionCheck({
    requiredPermission: PERMISSIONS.AUDIT_READ_OWN,
    role: "STAFF_ADMIN",
    userId: "staff-2",
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(req.scope, { type: "OWN", userId: "staff-2" });
});

test("deny default: unknown permission returns 403", () => {
  const { nextCalled, res } = runPermissionCheck({
    requiredPermission: "audit:unknown",
    role: "STAFF_ADMIN",
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, { message: "Access denied" });
});
