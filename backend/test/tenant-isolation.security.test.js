const test = require("node:test");
const assert = require("node:assert/strict");

const prisma = require("../src/prisma/client");
const { runWithTenantContext } = require("../src/tenant/context");

const {
  TENANT_MODELS,
  mergeCampusWhere,
  enforceMutationDataForModel,
  maybeSanitizeTenantResult,
  assertRawQueryAllowed,
  TENANT_SANITIZER_ENABLED,
} = prisma.__tenantInternals;

test("tenant models list contains expected scoped models", () => {
  assert.equal(TENANT_MODELS.has("Teacher"), true);
  assert.equal(TENANT_MODELS.has("Timetable"), true);
  assert.equal(TENANT_MODELS.has("Campus"), false);
});

test("cross-tenant where campus is overridden safely", () => {
  const scoped = mergeCampusWhere(
    {
      id: "abc",
      campusId: "malicious-campus",
      OR: [{ campusId: "other-campus" }, { name: "x" }],
    },
    "tenant-campus"
  );

  assert.deepEqual(scoped, {
    AND: [
      {
        id: "abc",
        OR: [{ name: "x" }],
      },
      { campusId: "tenant-campus" },
    ],
  });
});

test("nested tenant mutation payload campusId is recursively overridden", () => {
  const payload = {
    name: "Teacher A",
    campusId: "attacker-campus",
    teacherAvailability: {
      create: {
        campusId: "attacker-campus",
        dayId: "day-1",
        timeSlotId: "slot-1",
        isAvailable: true,
      },
      createMany: {
        data: [
          {
            campusId: "attacker-campus",
            dayId: "day-2",
            timeSlotId: "slot-2",
            isAvailable: true,
          },
        ],
      },
    },
    campus: {
      connect: { id: "campus-free-form" },
    },
  };

  const hardened = enforceMutationDataForModel("Teacher", payload, "tenant-campus");

  assert.equal(hardened.campusId, "tenant-campus");
  assert.equal(hardened.teacherAvailability.create.campusId, "tenant-campus");
  assert.equal(hardened.teacherAvailability.createMany.data[0].campusId, "tenant-campus");

  // Non-tenant nested relation payload remains untouched by recursive injector
  assert.deepEqual(hardened.campus, payload.campus);
});

test("sanitizer removes mismatched nested tenant relations", () => {
  const raw = {
    id: "teacher-1",
    campusId: "tenant-campus",
    teacherAvailability: [
      { id: "a1", campusId: "tenant-campus" },
      { id: "a2", campusId: "other-campus" },
    ],
  };

  const sanitized = maybeSanitizeTenantResult("Teacher", raw, "tenant-campus");
  assert.equal(Array.isArray(sanitized.teacherAvailability), true);
  assert.equal(sanitized.teacherAvailability.length, 1);
  assert.equal(sanitized.teacherAvailability[0].id, "a1");
});

test("raw query is blocked without tenant campus scope", () => {
  assert.throws(
    () => {
      runWithTenantContext({ campusId: "tenant-campus", userId: "u1", role: "INSTITUTION_OWNER" }, () => {
        assertRawQueryAllowed("SELECT * FROM \"Teacher\"");
      });
    },
    (error) => error?.code === "TENANT_RAW_BLOCKED"
  );
});

test("raw query is allowed when explicit campusId appears", () => {
  assert.doesNotThrow(() => {
    runWithTenantContext({ campusId: "tenant-campus", userId: "u1", role: "INSTITUTION_OWNER" }, () => {
      assertRawQueryAllowed('SELECT * FROM "Teacher" WHERE "campusId" = $1');
    });
  });
});

test("nested updateMany where is forced to tenant campus", () => {
  const payload = {
    teacherAvailability: {
      updateMany: {
        where: { campusId: "other-campus", isAvailable: true },
        data: { campusId: "other-campus", isAvailable: false },
      },
    },
  };

  const hardened = enforceMutationDataForModel("Teacher", payload, "tenant-campus");

  assert.deepEqual(hardened.teacherAvailability.updateMany.where, {
    AND: [{ isAvailable: true }, { campusId: "tenant-campus" }],
  });
  assert.equal(hardened.teacherAvailability.updateMany.data.campusId, "tenant-campus");
});

test("post-query sanitizer feature flag is exposed", () => {
  assert.equal(typeof TENANT_SANITIZER_ENABLED, "boolean");
});

test("system override is denied with invalid secure flag", async () => {
  const previousFlag = process.env.INTERNAL_SYSTEM_ACCESS_FLAG;
  process.env.INTERNAL_SYSTEM_ACCESS_FLAG = "expected-flag";

  await assert.rejects(
    async () => prisma.$runAsSystem(async () => "ok", { internalSystemFlag: "wrong-flag" }),
    (error) => error?.code === "TENANT_SYSTEM_ACCESS_DENIED"
  );

  process.env.INTERNAL_SYSTEM_ACCESS_FLAG = previousFlag;
});
