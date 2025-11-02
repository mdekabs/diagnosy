import { expect } from "chai";
import sinon from "sinon";
import jwt from "jsonwebtoken";
import { logger } from "../../config/index.js";
import { verifyJWT } from "../../utils/auth.js";

describe("verifyJWT", () => {
  let loggerInfoStub, loggerWarnStub;
  const JWT_SECRET = "test-secret";
  let validToken, invalidToken;

  // Setup: Mock logger and generate tokens
  beforeEach(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    loggerInfoStub = sinon.stub(logger, "info");
    loggerWarnStub = sinon.stub(logger, "warn");

    // Generate valid token
    validToken = jwt.sign({ id: "user123", isAdmin: false }, JWT_SECRET, { expiresIn: "1h" });

    // Invalid token (wrong secret)
    invalidToken = jwt.sign({ id: "user123" }, "wrong-secret", { expiresIn: "1h" });
  });

  // Cleanup: Restore stubs
  afterEach(() => {
    loggerInfoStub.restore();
    loggerWarnStub.restore();
    delete process.env.JWT_SECRET;
  });

  describe("Success Cases", () => {
    it("verifies valid token without blacklist check", async () => {
      const result = await verifyJWT(validToken, null);
      expect(result).to.be.an("object");
      expect(result.sub).to.equal("user123");
      expect(result.isAdmin).to.equal(false);
      expect(loggerInfoStub.calledWith(`Token verified for User ID: user123`)).to.be.true;
      expect(loggerWarnStub.calledWith("Token blacklisting check function was not provided to verifyJWT.")).to.be.true;
    });

    it("verifies valid token with passing blacklist check", async () => {
      const isBlacklistedCheck = sinon.stub().resolves(false);
      const result = await verifyJWT(validToken, isBlacklistedCheck);
      expect(result.sub).to.equal("user123");
      expect(isBlacklistedCheck.calledOnceWith(validToken)).to.be.true;
      expect(loggerInfoStub.calledWith(`Token verified for User ID: user123`)).to.be.true;
      expect(loggerWarnStub.notCalled).to.be.true;
    });
  });

  describe("Error Cases", () => {
    it("throws error for missing token", async () => {
      await expect(verifyJWT(null)).to.be.rejectedWith("Token missing.");
      expect(loggerWarnStub.calledWith("Token verification failed: Token missing.")).to.be.false; // No warn, direct throw
    });

    it("throws error for blacklisted token", async () => {
      const isBlacklistedCheck = sinon.stub().resolves(true);
      await expect(verifyJWT(validToken, isBlacklistedCheck)).to.be.rejectedWith("Token is blacklisted.");
      expect(isBlacklistedCheck.calledOnceWith(validToken)).to.be.true;
      expect(loggerWarnStub.calledWith("Token verification failed: Token is blacklisted.")).to.be.true;
    });

    it("throws error for invalid token", async () => {
      await expect(verifyJWT(invalidToken, null)).to.be.rejectedWith(/Invalid token: signature/);
      expect(loggerWarnStub.calledWithMatch(/JWT verification failed: signature/)).to.be.true;
    });

    it("throws error for token with missing user ID", async () => {
      const noIdToken = jwt.sign({ notId: "user123" }, JWT_SECRET, { expiresIn: "1h" });
      await expect(verifyJWT(noIdToken, null)).to.be.rejectedWith("Invalid token: Missing user ID.");
      expect(loggerWarnStub.calledWith("JWT verification failed: Missing User ID in payload.")).to.be.true;
    });
  });

  describe("Edge Cases", () => {
    it("handles expired token", async () => {
      const expiredToken = jwt.sign({ id: "user123" }, JWT_SECRET, { expiresIn: "-1s" });
      await expect(verifyJWT(expiredToken, null)).to.be.rejectedWith(/Invalid token: jwt expired/);
      expect(loggerWarnStub.calledWithMatch(/JWT verification failed: jwt expired/)).to.be.true;
    });

    it("handles malformed token", async () => {
      await expect(verifyJWT("not-a-token", null)).to.be.rejectedWith(/Invalid token: jwt malformed/);
      expect(loggerWarnStub.calledWithMatch(/JWT verification failed: jwt malformed/)).to.be.true;
    });
  });
});
