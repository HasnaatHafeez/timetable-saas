const fs = require("node:fs");
const path = require("node:path");

const CONTROLLERS_DIR = path.resolve(__dirname, "../src/controllers");
const ROOT_DIR = path.resolve(__dirname, "..");
const AUTH_CONTROLLER_RELATIVE_PATH = "src/controllers/auth.controller.js";

const CHECKS = [
  { label: "req.user.role", regex: /\breq\.user\.role\b/ },
  { label: "role ===", regex: /\brole\s*===/ },
  { label: "role.includes", regex: /\brole\.includes\b/ },
];

const shouldScanFile = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  return ext === ".js" || ext === ".ts";
};

const walkFiles = (dirPath) => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }

    if (entry.isFile() && shouldScanFile(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
};

const findViolations = (filePath) => {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const violations = [];

  lines.forEach((line, index) => {
    const matchedCheck = CHECKS.find((check) => check.regex.test(line));
    if (!matchedCheck) return;

    violations.push({
      filePath,
      line: index + 1,
      pattern: matchedCheck.label,
      snippet: line.trim(),
    });
  });

  return violations;
};

const main = () => {
  if (!fs.existsSync(CONTROLLERS_DIR)) {
    console.error(`RBAC lint failed: controllers directory not found at ${CONTROLLERS_DIR}`);
    process.exit(1);
  }

  const files = walkFiles(CONTROLLERS_DIR);
  const violations = files.flatMap(findViolations);

  if (violations.length === 0) {
    console.log("RBAC lint passed");
    process.exit(0);
  }

  const formattedViolations = violations.map((violation) => {
    const relativePath = path.relative(ROOT_DIR, violation.filePath).replace(/\\/g, "/");
    return {
      ...violation,
      relativePath,
    };
  });

  console.warn("RBAC lint violations found in controllers:");
  for (const violation of formattedViolations) {
    console.warn(`- ${violation.relativePath}:${violation.line} [${violation.pattern}] ${violation.snippet}`);
  }

  const blockingViolations = formattedViolations.filter(
    (violation) => violation.relativePath !== AUTH_CONTROLLER_RELATIVE_PATH
  );

  if (blockingViolations.length > 0) {
    console.error("RBAC lint failed. Role-based checks are only allowed in auth.controller.js.");
    process.exit(1);
  }

  console.log("RBAC lint passed");
  process.exit(0);
};

main();
