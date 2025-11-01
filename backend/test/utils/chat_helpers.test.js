import { expect } from "chai";
import sinon from "sinon";
import mongoose from "mongoose";
import {
  STATUS,
  M,
  DISCLAIMER,
  CRISIS_RESPONSE,
  CLASSIFICATION_PROMPT,
  CHAT_PROMPT,
  CONTINUE_PROMPT,
  toId,
  isCrisis,
  isBlocked,
} from "../../utils/chat_helpers.js";

describe("Chat Constants and Helpers", () => {
  // ────── Constants ──────
  describe("Constants", () => {
    it("defines STATUS correctly", () => {
      expect(STATUS).to.be.an("object");
      expect(STATUS.SUCCESS).to.equal("success");
    });

    it("defines M messages correctly", () => {
      expect(M).to.be.an("object");
      expect(M.NO_INPUT).to.equal("Please share how you're feeling or what's on your mind.");
      expect(M.CHAT_NOT_FOUND).to.equal("No active conversation found. Start by sharing your feelings.");
      expect(M.RESPONSE_SUCCESS).to.equal("I'm here to listen and support you.");
      expect(M.REFUSAL).to.equal(
        "I specialize in stress, anxiety, and emotional well-being. Please share how you're feeling."
      );
    });

    it("defines DISCLAIMER correctly", () => {
      expect(DISCLAIMER).to.be.a("string");
      expect(DISCLAIMER).to.include("+234 800 2255 6362");
      expect(DISCLAIMER).to.include("not a therapist");
    });

    it("defines CRISIS_RESPONSE correctly", () => {
      expect(CRISIS_RESPONSE).to.be.a("string");
      expect(CRISIS_RESPONSE).to.include("Call +234 800 2255 6362");
      expect(CRISIS_RESPONSE).to.include("You're not alone");
    });
  });

  // ────── Prompts ──────
  describe("Prompt Generators", () => {
    describe("CLASSIFICATION_PROMPT", () => {
      it("generates correct classification prompt", () => {
        const input = "I'm feeling stressed";
        const prompt = CLASSIFICATION_PROMPT(input);
        expect(prompt).to.be.a("string");
        expect(prompt).to.match(/\[OFF_TOPIC\|CRISIS\|SAFE\]/);
        expect(prompt).to.include(`User Message: "${input}"`);
        expect(prompt).to.include("self-harm or suicidal intent");
      });

      it("escapes special characters in input", () => {
        const input = "I'm stressed\nabout work";
        const prompt = CLASSIFICATION_PROMPT(input);
        expect(prompt).to.include(`User Message: "I'm stressed\nabout work"`);
      });
    });

    describe("CHAT_PROMPT", () => {
      it("generates correct chat prompt", () => {
        const input = "I feel anxious";
        const prompt = CHAT_PROMPT(input);
        expect(prompt).to.be.a("string");
        expect(prompt).to.match(/mental wellness companion/);
        expect(prompt).to.match(/under 150 words/);
        expect(prompt).to.include(`User input: "${input}"`);
        expect(prompt).to.not.match(/disclaimer/i);
      });
    });

    describe("CONTINUE_PROMPT", () => {
      it("generates correct continue prompt with history", () => {
        const history = "user: I'm sad | assistant: I'm here for you";
        const input = "What can I do?";
        const prompt = CONTINUE_PROMPT(history, input);
        expect(prompt).to.be.a("string");
        expect(prompt).to.include(history);
        expect(prompt).to.include(`User: "${input}"`);
        expect(prompt).to.match(/120 words/);
        expect(prompt).to.include(CRISIS_RESPONSE);
      });

      it("handles empty history gracefully", () => {
        const input = "I'm tired";
        const prompt = CONTINUE_PROMPT("", input);
        expect(prompt).to.be.a("string");
        expect(prompt).to.include("Previous Context: No previous context");
        expect(prompt).to.include(`User: "${input}"`);
        expect(prompt).to.include(CRISIS_RESPONSE);
        expect(prompt).to.match(/120 words/);
      });
    });
  });

  // ────── Helpers ──────
  describe("Helper Functions", () => {
    describe("toId", () => {
      it("converts valid string to ObjectId", () => {
        const id = new mongoose.Types.ObjectId().toString();
        const result = toId(id);
        expect(result).to.be.instanceOf(mongoose.Types.ObjectId);
        expect(result.toString()).to.equal(id);
      });

      it("throws CastError on invalid ObjectId", () => {
        expect(() => toId("invalid-id")).to.throw(mongoose.Error.CastError, /toId/);
      });
    });

    describe("isCrisis", () => {
      it("detects crisis keywords", () => {
        expect(isCrisis("I want to kill myself")).to.be.true;
        expect(isCrisis("No point living anymore")).to.be.true;
        expect(isCrisis("I'm thinking of suicide")).to.be.true;
      });

      it("returns false for non-crisis messages", () => {
        expect(isCrisis("I'm just tired")).to.be.false;
        expect(isCrisis("")).to.be.false;
      });

      it("is case-insensitive for crisis keywords", () => {
        expect(isCrisis("KILL MYSELF")).to.be.true;
        expect(isCrisis("end It")).to.be.true;
      });
    });

    describe("isBlocked", () => {
      it("detects blocked phrases", () => {
        expect(isBlocked("What's the weather like?")).to.be.true;
        expect(isBlocked("Tell me a joke")).to.be.true;
        expect(isBlocked("Solve this math")).to.be.true;
      });

      it("returns false for allowed phrases", () => {
        expect(isBlocked("I'm feeling anxious")).to.be.false;
        expect(isBlocked("")).to.be.false;
      });

      it("is case-insensitive for blocked phrases", () => {
        expect(isBlocked("WEATHER forecast")).to.be.true;
        expect(isBlocked("CODE python")).to.be.true;
      });
    });
  });
});
