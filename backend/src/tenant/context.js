const { AsyncLocalStorage } = require("async_hooks");

const tenantContextStorage = new AsyncLocalStorage();

const runWithTenantContext = (context, callback) => {
  return tenantContextStorage.run(context, callback);
};

const getTenantContext = () => {
  return tenantContextStorage.getStore() || null;
};

module.exports = {
  runWithTenantContext,
  getTenantContext,
};
