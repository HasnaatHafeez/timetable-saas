BEGIN;

DO $$
BEGIN
    RAISE NOTICE 'Starting strict multi-tenancy migration';
END $$;

-- 1) Add campus ownership columns as nullable first
ALTER TABLE "Section" ADD COLUMN IF NOT EXISTS "campusId" TEXT;
ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS "campusId" TEXT;
ALTER TABLE "TeacherAvailability" ADD COLUMN IF NOT EXISTS "campusId" TEXT;

-- Lock all tables participating in backfill paths
LOCK TABLE "AcademicLevel" IN ACCESS EXCLUSIVE MODE;
LOCK TABLE "Department" IN ACCESS EXCLUSIVE MODE;
LOCK TABLE "Teacher" IN ACCESS EXCLUSIVE MODE;
LOCK TABLE "Section" IN ACCESS EXCLUSIVE MODE;
LOCK TABLE "Subject" IN ACCESS EXCLUSIVE MODE;
LOCK TABLE "TeacherAvailability" IN ACCESS EXCLUSIVE MODE;

-- 2) Backfill campusId from existing ownership chains
UPDATE "Section" s
SET "campusId" = al."campusId"
FROM "AcademicLevel" al
WHERE s."academicLevelId" = al."id"
    AND s."campusId" IS NULL;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "Section" WHERE "campusId" IS NULL) THEN
        RAISE EXCEPTION 'Section.campusId contains NULL values after Section backfill';
    END IF;
    RAISE NOTICE 'Section campusId backfill complete';
END $$;

UPDATE "Subject" sub
SET "campusId" = d."campusId"
FROM "Department" d
WHERE sub."departmentId" = d."id"
    AND sub."campusId" IS NULL;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "Subject" WHERE "campusId" IS NULL) THEN
        RAISE EXCEPTION 'Subject.campusId contains NULL values after Subject backfill';
    END IF;
    RAISE NOTICE 'Subject campusId backfill complete';
END $$;

UPDATE "TeacherAvailability" ta
SET "campusId" = t."campusId"
FROM "Teacher" t
WHERE ta."teacherId" = t."id"
    AND ta."campusId" IS NULL;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "TeacherAvailability" WHERE "campusId" IS NULL) THEN
        RAISE EXCEPTION 'TeacherAvailability.campusId contains NULL values after TeacherAvailability backfill';
    END IF;
    RAISE NOTICE 'TeacherAvailability campusId backfill complete';
END $$;

-- 3) Validation (DO blocks)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "Section" WHERE "campusId" IS NULL) THEN
        RAISE EXCEPTION 'Section.campusId contains NULL values';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "Subject" WHERE "campusId" IS NULL) THEN
        RAISE EXCEPTION 'Subject.campusId contains NULL values';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "TeacherAvailability" WHERE "campusId" IS NULL) THEN
        RAISE EXCEPTION 'TeacherAvailability.campusId contains NULL values';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "Section" s
        JOIN "AcademicLevel" al ON al."id" = s."academicLevelId"
        WHERE s."campusId" <> al."campusId"
    ) THEN
        RAISE EXCEPTION 'Cross-tenant mismatch: Section.campusId differs from AcademicLevel.campusId';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "Subject" s
        JOIN "Department" d ON d."id" = s."departmentId"
        WHERE s."campusId" <> d."campusId"
    ) THEN
        RAISE EXCEPTION 'Cross-tenant mismatch: Subject.campusId differs from Department.campusId';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "TeacherAvailability" ta
        JOIN "Teacher" t ON t."id" = ta."teacherId"
        WHERE ta."campusId" <> t."campusId"
    ) THEN
        RAISE EXCEPTION 'Cross-tenant mismatch: TeacherAvailability.campusId differs from Teacher.campusId';
    END IF;
END $$;

-- 4) Enforce strict ownership (NOT NULL)
ALTER TABLE "Section" ALTER COLUMN "campusId" SET NOT NULL;
ALTER TABLE "Subject" ALTER COLUMN "campusId" SET NOT NULL;
ALTER TABLE "TeacherAvailability" ALTER COLUMN "campusId" SET NOT NULL;

-- 5) Create indexes (idempotent)
CREATE INDEX IF NOT EXISTS "AcademicLevel_campusId_idx" ON "AcademicLevel"("campusId");
CREATE INDEX IF NOT EXISTS "Department_campusId_idx" ON "Department"("campusId");
CREATE INDEX IF NOT EXISTS "Room_campusId_idx" ON "Room"("campusId");
CREATE INDEX IF NOT EXISTS "Section_campusId_idx" ON "Section"("campusId");
CREATE INDEX IF NOT EXISTS "Section_academicLevelId_idx" ON "Section"("academicLevelId");
CREATE INDEX IF NOT EXISTS "Subject_campusId_idx" ON "Subject"("campusId");
CREATE INDEX IF NOT EXISTS "Subject_departmentId_idx" ON "Subject"("departmentId");
CREATE INDEX IF NOT EXISTS "Teacher_campusId_idx" ON "Teacher"("campusId");
CREATE INDEX IF NOT EXISTS "TeacherAvailability_campusId_idx" ON "TeacherAvailability"("campusId");
CREATE INDEX IF NOT EXISTS "TeacherAvailability_teacherId_idx" ON "TeacherAvailability"("teacherId");
CREATE INDEX IF NOT EXISTS "Timetable_campusId_idx" ON "Timetable"("campusId");

DO $$
BEGIN
    RAISE NOTICE 'Index creation complete';
END $$;

-- Final cross-table integrity audits (must pass before commit)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "Section" s
        JOIN "AcademicLevel" al ON al."id" = s."academicLevelId"
        WHERE s."campusId" <> al."campusId"
    ) THEN
        RAISE EXCEPTION 'Final audit failed: Section ↔ AcademicLevel campus mismatch detected';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "Subject" s
        JOIN "Department" d ON d."id" = s."departmentId"
        WHERE s."campusId" <> d."campusId"
    ) THEN
        RAISE EXCEPTION 'Final audit failed: Subject ↔ Department campus mismatch detected';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "TeacherAvailability" ta
        JOIN "Teacher" t ON t."id" = ta."teacherId"
        WHERE ta."campusId" <> t."campusId"
    ) THEN
        RAISE EXCEPTION 'Final audit failed: TeacherAvailability ↔ Teacher campus mismatch detected';
    END IF;
END $$;

COMMIT;

-- 6) Post-migration verification
SELECT COUNT(*) AS "Section_null_campusId" FROM "Section" WHERE "campusId" IS NULL;
SELECT COUNT(*) AS "Subject_null_campusId" FROM "Subject" WHERE "campusId" IS NULL;
SELECT COUNT(*) AS "TeacherAvailability_null_campusId" FROM "TeacherAvailability" WHERE "campusId" IS NULL;
SELECT COUNT(*) AS "Teacher_null_campusId" FROM "Teacher" WHERE "campusId" IS NULL;
SELECT COUNT(*) AS "Room_null_campusId" FROM "Room" WHERE "campusId" IS NULL;
SELECT COUNT(*) AS "Department_null_campusId" FROM "Department" WHERE "campusId" IS NULL;
SELECT COUNT(*) AS "AcademicLevel_null_campusId" FROM "AcademicLevel" WHERE "campusId" IS NULL;
SELECT COUNT(*) AS "Timetable_null_campusId" FROM "Timetable" WHERE "campusId" IS NULL;

