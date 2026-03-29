const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const controllerPath = require.resolve("../src/controllers/auth.controller");
const prismaPath = require.resolve("../src/prisma/client");
const tokenPath = require.resolve("../src/utils/token");
const emailPath = require.resolve("../src/services/email.service");
const bcryptPath = require.resolve("bcrypt");

function createResponse() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };
}

function withMockedAuthController({ prismaMock, tokenMock, emailMock, bcryptMock }) {
  const originalModules = new Map();

  const inject = (modulePath, exportsObject) => {
    originalModules.set(modulePath, require.cache[modulePath]);
    require.cache[modulePath] = {
      id: modulePath,
      filename: modulePath,
      loaded: true,
      exports: exportsObject,
    };
  };

  inject(prismaPath, prismaMock);
  inject(tokenPath, tokenMock);
  inject(emailPath, emailMock);
  inject(bcryptPath, bcryptMock);

  delete require.cache[controllerPath];
  const controller = require("../src/controllers/auth.controller");

  const restore = () => {
    delete require.cache[controllerPath];
    for (const [modulePath, originalModule] of originalModules.entries()) {
      if (originalModule) {
        require.cache[modulePath] = originalModule;
      } else {
        delete require.cache[modulePath];
      }
    }
  };

  return { controller, restore };
}

test("login returns 400 when email or password is missing", async () => {
  const prismaMock = {
    user: {
      findFirst: async () => {
        throw new Error("findFirst should not be called");
      },
    },
  };

  const { controller, restore } = withMockedAuthController({
    prismaMock,
    tokenMock: { generateToken: () => "unused" },
    emailMock: { sendPasswordResetEmail: async () => {} },
    bcryptMock: {
      compare: async () => false,
      hash: async () => "unused",
    },
  });

  try {
    const req = { body: { email: "" } };
    const res = createResponse();

    await controller.login(req, res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.payload, { message: "Email and password are required" });
  } finally {
    restore();
  }
});

test("login succeeds with valid credentials", async () => {
  const prismaMock = {
    user: {
      findFirst: async () => ({
        id: "u-1",
        name: "User One",
        email: "user@example.com",
        role: "INSTITUTION_OWNER",
        password: "hashed-password",
      }),
    },
  };

  const { controller, restore } = withMockedAuthController({
    prismaMock,
    tokenMock: { generateToken: () => "jwt-token" },
    emailMock: { sendPasswordResetEmail: async () => {} },
    bcryptMock: {
      compare: async () => true,
      hash: async () => "unused",
    },
  });

  try {
    const req = { body: { email: "user@example.com", password: "correct-password" } };
    const res = createResponse();

    await controller.login(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.message, "Login successful");
    assert.equal(res.payload.token, "jwt-token");
    assert.equal(res.payload.user.id, "u-1");
  } finally {
    restore();
  }
});

test("forgotPassword stores hashed token and sends reset email", async () => {
  const updates = [];
  const emails = [];

  const prismaMock = {
    user: {
      findFirst: async () => ({ id: "u-99", email: "owner@example.com" }),
      update: async (args) => {
        updates.push(args);
        return { id: "u-99" };
      },
    },
  };

  const { controller, restore } = withMockedAuthController({
    prismaMock,
    tokenMock: { generateToken: () => "unused" },
    emailMock: {
      sendPasswordResetEmail: async (args) => {
        emails.push(args);
      },
    },
    bcryptMock: {
      compare: async () => false,
      hash: async () => "unused",
    },
  });

  const previousFrontendUrl = process.env.FRONTEND_URL;
  process.env.FRONTEND_URL = "https://app.example.com";

  try {
    const req = { body: { email: "owner@example.com" } };
    const res = createResponse();

    await controller.forgotPassword(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.message, "If the email exists, password reset instructions have been sent.");
    assert.equal(updates.length, 1);
    assert.equal(emails.length, 1);

    const updatePayload = updates[0].data;
    assert.equal(typeof updatePayload.resetPasswordToken, "string");
    assert.equal(updatePayload.resetPasswordToken.length, 64);
    assert.equal(updatePayload.resetPasswordExpiresAt instanceof Date, true);

    const sentLink = emails[0].resetLink;
    assert.equal(sentLink.startsWith("https://app.example.com/reset-password?token="), true);

    const resetToken = decodeURIComponent(sentLink.split("token=")[1]);
    const expectedHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    assert.equal(updatePayload.resetPasswordToken, expectedHash);
  } finally {
    if (previousFrontendUrl === undefined) {
      delete process.env.FRONTEND_URL;
    } else {
      process.env.FRONTEND_URL = previousFrontendUrl;
    }
    restore();
  }
});

test("resetPassword returns 400 for invalid token", async () => {
  const prismaMock = {
    user: {
      findFirst: async () => null,
      update: async () => {
        throw new Error("update should not run when token is invalid");
      },
    },
  };

  const { controller, restore } = withMockedAuthController({
    prismaMock,
    tokenMock: { generateToken: () => "unused" },
    emailMock: { sendPasswordResetEmail: async () => {} },
    bcryptMock: {
      compare: async () => false,
      hash: async () => "unused",
    },
  });

  try {
    const req = { body: { token: "bad-token", newPassword: "new-password-123" } };
    const res = createResponse();

    await controller.resetPassword(req, res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.payload, { message: "Reset token is invalid or expired" });
  } finally {
    restore();
  }
});

test("resetPassword updates password and clears reset token", async () => {
  const updates = [];

  const prismaMock = {
    user: {
      findFirst: async () => ({ id: "u-22" }),
      update: async (args) => {
        updates.push(args);
        return { id: "u-22" };
      },
    },
  };

  const { controller, restore } = withMockedAuthController({
    prismaMock,
    tokenMock: { generateToken: () => "unused" },
    emailMock: { sendPasswordResetEmail: async () => {} },
    bcryptMock: {
      compare: async () => false,
      hash: async () => "new-hashed-password",
    },
  });

  try {
    const req = { body: { token: "valid-token", newPassword: "new-password-123" } };
    const res = createResponse();

    await controller.resetPassword(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.payload, { message: "Password reset successful" });
    assert.equal(updates.length, 1);
    assert.deepEqual(updates[0], {
      where: { id: "u-22" },
      data: {
        password: "new-hashed-password",
        resetPasswordToken: null,
        resetPasswordExpiresAt: null,
      },
    });
  } finally {
    restore();
  }
});
