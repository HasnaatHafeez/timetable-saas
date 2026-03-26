const { PrismaClient } = require("@prisma/client");
const { getTenantContext, runWithTenantContext } = require("../tenant/context");
const auditLogService = require("../services/auditLog.service");

const basePrisma = new PrismaClient();
const TENANT_SANITIZER_ENABLED = String(process.env.TENANT_POST_QUERY_SANITIZER_ENABLED || "true").toLowerCase() !== "false";

const TENANT_MODELS = new Set([
  "AcademicLevel",
  "Department",
  "Section",
  "Subject",
  "Teacher",
  "Room",
  "TimeSlot",
  "WorkingDay",
  "Holiday",
  "TeacherAvailability",
  "Timetable",
]);

const MUTATION_OPERATIONS = new Set([
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
]);

const toDelegateName = (modelName) => {
  if (!modelName) return "";
  return `${modelName.charAt(0).toLowerCase()}${modelName.slice(1)}`;
};

const createTenantError = (message, statusCode = 400, code = "TENANT_CONTEXT_REQUIRED") => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

const getModelMeta = (modelName) => basePrisma._runtimeDataModel?.models?.[modelName] || null;

const getRelationFieldMap = (modelName) => {
  const meta = getModelMeta(modelName);
  const map = new Map();
  if (!meta?.fields) return map;

  for (const field of meta.fields) {
    if (field.kind === "object") {
      map.set(field.name, field);
    }
  }

  return map;
};

const removeCampusFilters = (value) => {
  if (Array.isArray(value)) {
    const mapped = value
      .map((item) => removeCampusFilters(item))
      .filter((item) => item !== undefined);
    return mapped;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const next = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === "campusId") continue;

    const child = removeCampusFilters(item);
    if (child !== undefined) {
      next[key] = child;
    }
  }

  if (Object.keys(next).length === 0) {
    return undefined;
  }

  return next;
};

const mergeCampusWhere = (where, campusId) => {
  const cleanedWhere = removeCampusFilters(where);
  if (!cleanedWhere || Object.keys(cleanedWhere).length === 0) {
    return { campusId };
  }

  return {
    AND: [cleanedWhere, { campusId }],
  };
};

const ensureTenantState = () => {
  const tenantContext = getTenantContext();

  if (tenantContext?.isSystem === true) {
    return {
      isSystem: true,
      campusId: null,
      userId: tenantContext?.userId || null,
      requestId: tenantContext?.requestId || null,
    };
  }

  const campusId = tenantContext?.campusId || null;
  if (!campusId) {
    throw createTenantError("Tenant campus context is required");
  }

  return {
    isSystem: false,
    campusId,
    userId: tenantContext?.userId || null,
    requestId: tenantContext?.requestId || null,
  };
};

const getRecordIdFromWhere = (where) => {
  if (!where || typeof where !== "object") return null;

  const idValue = where.id;
  if (idValue === undefined || idValue === null) return null;

  if (typeof idValue === "object") {
    if (Object.prototype.hasOwnProperty.call(idValue, "equals")) {
      return idValue.equals;
    }
    return null;
  }

  return idValue;
};

const enforceMutationDataForModel = (modelName, data, campusId) => {
  if (Array.isArray(data)) {
    return data.map((item) => enforceMutationDataForModel(modelName, item, campusId));
  }

  if (!data || typeof data !== "object") {
    return data;
  }

  const nextData = { ...data };

  if (!TENANT_MODELS.has(modelName)) {
    return nextData;
  }

  nextData.campusId = campusId;

  const relationFields = getRelationFieldMap(modelName);
  for (const [fieldName, field] of relationFields.entries()) {
    if (!(fieldName in nextData)) continue;
    nextData[fieldName] = enforceNestedRelationMutation(field.type, nextData[fieldName], campusId);
  }

  return nextData;
};

const enforceNestedRelationMutation = (relatedModelName, relationPayload, campusId) => {
  if (Array.isArray(relationPayload)) {
    return relationPayload.map((item) => enforceNestedRelationMutation(relatedModelName, item, campusId));
  }

  if (!relationPayload || typeof relationPayload !== "object") {
    return relationPayload;
  }

  if (!TENANT_MODELS.has(relatedModelName)) {
    return relationPayload;
  }

  const nextPayload = { ...relationPayload };

  if (Object.prototype.hasOwnProperty.call(nextPayload, "create")) {
    nextPayload.create = enforceMutationDataForModel(relatedModelName, nextPayload.create, campusId);
  }

  if (nextPayload.createMany && typeof nextPayload.createMany === "object") {
    nextPayload.createMany = {
      ...nextPayload.createMany,
      data: enforceMutationDataForModel(relatedModelName, nextPayload.createMany.data, campusId),
    };
  }

  if (Object.prototype.hasOwnProperty.call(nextPayload, "update")) {
    nextPayload.update = enforceMutationDataForModel(relatedModelName, nextPayload.update, campusId);
  }

  if (Object.prototype.hasOwnProperty.call(nextPayload, "upsert")) {
    const upsertPayload = nextPayload.upsert;
    if (Array.isArray(upsertPayload)) {
      nextPayload.upsert = upsertPayload.map((item) => ({
        ...item,
        create: enforceMutationDataForModel(relatedModelName, item?.create, campusId),
        update: enforceMutationDataForModel(relatedModelName, item?.update, campusId),
      }));
    } else if (upsertPayload && typeof upsertPayload === "object") {
      nextPayload.upsert = {
        ...upsertPayload,
        create: enforceMutationDataForModel(relatedModelName, upsertPayload.create, campusId),
        update: enforceMutationDataForModel(relatedModelName, upsertPayload.update, campusId),
      };
    }
  }

  if (Object.prototype.hasOwnProperty.call(nextPayload, "updateMany")) {
    const updateManyPayload = nextPayload.updateMany;
    if (Array.isArray(updateManyPayload)) {
      nextPayload.updateMany = updateManyPayload.map((item) => ({
        ...item,
        where: mergeCampusWhere(item?.where, campusId),
        data: enforceMutationDataForModel(relatedModelName, item?.data, campusId),
      }));
    } else if (updateManyPayload && typeof updateManyPayload === "object") {
      nextPayload.updateMany = {
        ...updateManyPayload,
        where: mergeCampusWhere(updateManyPayload.where, campusId),
        data: enforceMutationDataForModel(relatedModelName, updateManyPayload.data, campusId),
      };
    }
  }

  if (Object.prototype.hasOwnProperty.call(nextPayload, "connectOrCreate")) {
    const connectOrCreatePayload = nextPayload.connectOrCreate;
    if (Array.isArray(connectOrCreatePayload)) {
      nextPayload.connectOrCreate = connectOrCreatePayload.map((item) => ({
        ...item,
        where: mergeCampusWhere(item?.where, campusId),
        create: enforceMutationDataForModel(relatedModelName, item?.create, campusId),
      }));
    } else if (connectOrCreatePayload && typeof connectOrCreatePayload === "object") {
      nextPayload.connectOrCreate = {
        ...connectOrCreatePayload,
        where: mergeCampusWhere(connectOrCreatePayload.where, campusId),
        create: enforceMutationDataForModel(relatedModelName, connectOrCreatePayload.create, campusId),
      };
    }
  }

  return nextPayload;
};

const applyRelationScoping = (modelName, args, campusId) => {
  if (!args || typeof args !== "object") return args;

  const scopedArgs = { ...args };

  if (scopedArgs.where) {
    scopedArgs.where = mergeCampusWhere(scopedArgs.where, campusId);
  }

  const relationFields = getRelationFieldMap(modelName);

  const scopeRelationNode = (relatedModelName, relationField, relationValue) => {
    if (relationValue === true) {
      if (relationField.isList && TENANT_MODELS.has(relatedModelName)) {
        return { where: { campusId } };
      }
      return true;
    }

    if (!relationValue || typeof relationValue !== "object") {
      return relationValue;
    }

    const nextValue = { ...relationValue };

    if (TENANT_MODELS.has(relatedModelName) && relationField.isList) {
      nextValue.where = mergeCampusWhere(nextValue.where, campusId);
    }

    if (nextValue.where && TENANT_MODELS.has(relatedModelName) && !relationField.isList) {
      nextValue.where = mergeCampusWhere(nextValue.where, campusId);
    }

    if (nextValue.include) {
      nextValue.include = scopeRelationSelection(relatedModelName, nextValue.include);
    }

    if (nextValue.select) {
      nextValue.select = scopeRelationSelection(relatedModelName, nextValue.select);
    }

    return nextValue;
  };

  const scopeRelationSelection = (targetModelName, selection) => {
    if (!selection || typeof selection !== "object") {
      return selection;
    }

    const targetRelationFields = getRelationFieldMap(targetModelName);
    const nextSelection = { ...selection };

    for (const [fieldName, selectionValue] of Object.entries(nextSelection)) {
      const relationField = targetRelationFields.get(fieldName);
      if (!relationField) continue;

      nextSelection[fieldName] = scopeRelationNode(relationField.type, relationField, selectionValue);
    }

    return nextSelection;
  };

  if (scopedArgs.include) {
    scopedArgs.include = scopeRelationSelection(modelName, scopedArgs.include);
  }

  if (scopedArgs.select) {
    scopedArgs.select = scopeRelationSelection(modelName, scopedArgs.select);
  }

  return scopedArgs;
};

const sanitizeTenantResult = (modelName, result, campusId) => {
  if (!TENANT_SANITIZER_ENABLED) {
    return result;
  }

  if (Array.isArray(result)) {
    return result
      .map((item) => sanitizeTenantResult(modelName, item, campusId))
      .filter((item) => item !== null && item !== undefined);
  }

  if (!result || typeof result !== "object") {
    return result;
  }

  if (TENANT_MODELS.has(modelName) && Object.prototype.hasOwnProperty.call(result, "campusId")) {
    if (result.campusId !== campusId) {
      return null;
    }
  }

  const relationFields = getRelationFieldMap(modelName);
  if (relationFields.size === 0) {
    return result;
  }

  const nextResult = { ...result };
  for (const [fieldName, field] of relationFields.entries()) {
    if (!(fieldName in nextResult)) continue;

    const sanitized = sanitizeTenantResult(field.type, nextResult[fieldName], campusId);
    if (field.isList) {
      nextResult[fieldName] = Array.isArray(sanitized) ? sanitized : [];
      continue;
    }

    nextResult[fieldName] = sanitized;
  }

  return nextResult;
};

const logMutationAudit = ({ type = "USER_ACTION", model, operation, campusId, userId, requestId, before = null, after = null, extra = null }) => {
  const payload = {
    type: "TENANT_MUTATION_AUDIT",
    model,
    action: operation,
    campusId,
    userId: userId || null,
    requestId: requestId || null,
    timestamp: new Date().toISOString(),
  };

  console.info(JSON.stringify(payload));

  // Fire-and-forget to keep mutation path non-blocking.
  auditLogService.logEvent({
    type,
    model,
    action: operation,
    campusId,
    userId,
    metadata: {
      before,
      after,
      requestId,
      extra,
    },
  });
};

const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!model || !TENANT_MODELS.has(model)) {
          return query(args);
        }

        const tenantState = ensureTenantState();
        if (tenantState.isSystem) {
          return query(args);
        }

        const { campusId, userId, requestId } = tenantState;
        const delegate = basePrisma[toDelegateName(model)];

        if (["findMany", "findFirst", "findFirstOrThrow", "count", "aggregate", "groupBy"].includes(operation)) {
          const nextArgs = applyRelationScoping(model, args || {}, campusId);
          const result = await query(nextArgs);
          return sanitizeTenantResult(model, result, campusId);
        }

        if (["findUnique", "findUniqueOrThrow"].includes(operation)) {
          if (!args?.where) {
            throw createTenantError("findUnique/findUniqueOrThrow requires where clause", 400, "TENANT_QUERY_INVALID");
          }

          const nextArgs = applyRelationScoping(model, args || {}, campusId);
          const result = await delegate.findFirst(nextArgs);

          if (!result && operation === "findUniqueOrThrow") {
            throw createTenantError("Record not found for selected campus", 404, "TENANT_ACCESS_DENIED");
          }

          return sanitizeTenantResult(model, result, campusId);
        }

        if (operation === "create") {
          const nextArgs = { ...(args || {}) };
          nextArgs.data = enforceMutationDataForModel(model, nextArgs.data, campusId);

          const result = await query(nextArgs);
          logMutationAudit({ model, operation, campusId, userId, requestId, after: result });
          return sanitizeTenantResult(model, result, campusId);
        }

        if (operation === "createMany") {
          const nextArgs = { ...(args || {}) };
          nextArgs.data = enforceMutationDataForModel(model, nextArgs.data, campusId);

          const result = await query(nextArgs);
          logMutationAudit({ model, operation, campusId, userId, requestId, after: { count: result?.count || 0 } });
          return sanitizeTenantResult(model, result, campusId);
        }

        if (operation === "upsert") {
          const nextArgs = { ...(args || {}) };
          nextArgs.where = mergeCampusWhere(nextArgs.where, campusId);
          nextArgs.create = enforceMutationDataForModel(model, nextArgs.create, campusId);
          nextArgs.update = enforceMutationDataForModel(model, nextArgs.update, campusId);

          const result = await query(nextArgs);
          logMutationAudit({ model, operation, campusId, userId, requestId, after: result });
          return sanitizeTenantResult(model, result, campusId);
        }

        if (operation === "updateMany") {
          const nextArgs = { ...(args || {}) };
          nextArgs.where = mergeCampusWhere(nextArgs.where, campusId);
          nextArgs.data = enforceMutationDataForModel(model, nextArgs.data, campusId);

          const result = await query(nextArgs);
          logMutationAudit({ model, operation, campusId, userId, requestId, after: { count: result?.count || 0 } });
          return result;
        }

        if (operation === "deleteMany") {
          const nextArgs = { ...(args || {}) };
          nextArgs.where = mergeCampusWhere(nextArgs.where, campusId);

          const result = await query(nextArgs);
          logMutationAudit({ model, operation, campusId, userId, requestId, after: { count: result?.count || 0 } });
          return result;
        }

        if (operation === "update") {
          const recordId = getRecordIdFromWhere(args?.where);
          if (recordId === null || recordId === undefined) {
            throw createTenantError("update requires where.id for tenant-safe mutation", 400, "TENANT_QUERY_INVALID");
          }

          const readArgs = applyRelationScoping(
            model,
            {
              where: { id: recordId },
              select: args?.select,
              include: args?.include,
            },
            campusId
          );

          const before = await delegate.findFirst(readArgs);
          if (!before) {
            throw createTenantError("Record not found for selected campus", 403, "TENANT_ACCESS_DENIED");
          }

          const mutationResult = await delegate.updateMany({
            where: {
              id: recordId,
              campusId,
            },
            data: enforceMutationDataForModel(model, args?.data, campusId),
          });

          if (!mutationResult?.count) {
            throw createTenantError("Record not found for selected campus", 403, "TENANT_ACCESS_DENIED");
          }

          const updated = await delegate.findFirst(readArgs);
          logMutationAudit({
            model,
            operation,
            campusId,
            userId,
            requestId,
            before,
            after: updated,
            extra: { count: mutationResult?.count || 0 },
          });
          return sanitizeTenantResult(model, updated, campusId);
        }

        if (operation === "delete") {
          const recordId = getRecordIdFromWhere(args?.where);
          if (recordId === null || recordId === undefined) {
            throw createTenantError("delete requires where.id for tenant-safe mutation", 400, "TENANT_QUERY_INVALID");
          }

          const readArgs = applyRelationScoping(
            model,
            {
              where: { id: recordId },
              select: args?.select,
              include: args?.include,
            },
            campusId
          );

          const existing = await delegate.findFirst(readArgs);
          if (!existing) {
            throw createTenantError("Record not found for selected campus", 403, "TENANT_ACCESS_DENIED");
          }

          const mutationResult = await delegate.deleteMany({
            where: {
              id: recordId,
              campusId,
            },
          });

          if (!mutationResult?.count) {
            throw createTenantError("Record not found for selected campus", 403, "TENANT_ACCESS_DENIED");
          }

          logMutationAudit({
            model,
            operation,
            campusId,
            userId,
            requestId,
            before: existing,
            after: null,
            extra: { count: mutationResult?.count || 0 },
          });
          return sanitizeTenantResult(model, existing, campusId);
        }

        if (MUTATION_OPERATIONS.has(operation)) {
          logMutationAudit({ model, operation, campusId, userId, requestId });
        }

        return query(args);
      },
    },
  },
});

const assertRawQueryAllowed = (queryInput) => {
  const tenantContext = getTenantContext();
  if (tenantContext?.isSystem === true) {
    return;
  }

  const campusId = tenantContext?.campusId;
  if (!campusId) {
    throw createTenantError("Raw queries require tenant context", 400, "TENANT_CONTEXT_REQUIRED");
  }

  const queryText = (() => {
    if (typeof queryInput === "string") return queryInput;
    if (queryInput && typeof queryInput === "object" && typeof queryInput.sql === "string") return queryInput.sql;
    return String(queryInput || "");
  })();

  if (!/campusId/i.test(queryText)) {
    auditLogService.logEvent({
      type: "SECURITY",
      model: "RAW_QUERY",
      action: "BLOCKED",
      campusId,
      userId: tenantContext?.userId || null,
      metadata: {
        requestId: tenantContext?.requestId || null,
        extra: {
          reason: "missing_explicit_campus_scope",
        },
      },
    });
    throw createTenantError("Raw query blocked: missing explicit campusId scope", 403, "TENANT_RAW_BLOCKED");
  }
};

const prismaProxy = new Proxy(prisma, {
  get(target, prop, receiver) {
    if (prop === "$queryRaw" || prop === "$executeRaw" || prop === "$queryRawUnsafe" || prop === "$executeRawUnsafe") {
      const rawMethod = Reflect.get(target, prop, receiver);
      return (...methodArgs) => {
        assertRawQueryAllowed(methodArgs[0]);
        return rawMethod.apply(target, methodArgs);
      };
    }

    if (prop === "$runAsSystem") {
      return (callback, options = {}) => {
        if (typeof callback !== "function") {
          throw createTenantError("$runAsSystem requires a callback", 400, "TENANT_QUERY_INVALID");
        }

        const requiredFlag = process.env.INTERNAL_SYSTEM_ACCESS_FLAG;
        if (!requiredFlag || options.internalSystemFlag !== requiredFlag) {
          throw createTenantError("$runAsSystem denied: missing secure internal flag", 403, "TENANT_SYSTEM_ACCESS_DENIED");
        }

        return runWithTenantContext(
          {
            ...options,
            isSystem: true,
          },
          callback
        );
      };
    }

    const value = Reflect.get(target, prop, receiver);
    if (typeof value === "function") {
      return value.bind(target);
    }

    return value;
  },
});

Object.defineProperty(prismaProxy, "__tenantInternals", {
  value: {
    mergeCampusWhere,
    enforceMutationDataForModel,
    applyRelationScoping,
    sanitizeTenantResult,
    maybeSanitizeTenantResult: sanitizeTenantResult,
    assertRawQueryAllowed,
    createTenantError,
    TENANT_MODELS,
    TENANT_SANITIZER_ENABLED,
  },
  enumerable: false,
  configurable: false,
  writable: false,
});

module.exports = prismaProxy;
