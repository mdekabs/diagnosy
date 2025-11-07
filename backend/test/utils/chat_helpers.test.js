import { expect } from 'chai';
import sinon from 'sinon';
import mongoose from 'mongoose';
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
} from '../../utils/chat_helpers.js';

describe('Chat Helpers', () => {
  let objectIdStub;

  beforeEach(() => {
    // Mock mongoose.Types.ObjectId
    objectIdStub = sinon.stub().callsFake((id) => ({ id }));
    sinon.stub(mongoose, 'Types').value({ ObjectId: objectIdStub });
  });

  afterEach(() => {
    // Restore mocks
    sinon.restore();
  });

  describe('Constants', () => {
    it('should export STATUS correctly', () => {
      expect(STATUS).to.deep.equal({ SUCCESS: 'success' });
    });

    it('should export M correctly', () => {
      expect(M).to.deep.equal({
        NO_INPUT: "Please share how you're feeling or what's on your mind.",
        CHAT_NOT_FOUND: "No active conversation found. Start by sharing your feelings.",
        RESPONSE_SUCCESS: "I'm here to listen and support you.",
        REFUSAL: "I specialize in stress, anxiety, and emotional well-being. Please share how you're feeling.",
      });
    });

    it('should export DISCLAIMER correctly', () => {
      expect(DISCLAIMER).to.equal(
        "I'm not a therapist or doctor, but I can help give you first aid before you see a doctor. For crisis or suicidal thoughts, please contact +234 800 2255 6362 for proper direction."
      );
    });

    it('should export CRISIS_RESPONSE correctly', () => {
      expect(CRISIS_RESPONSE).to.equal(
        "I'm really concerned about what you just shared. **Please reach out for immediate help**: Call +234 800 2255 6362 to direct you to nearest help available. You're not alone."
      );
    });
  });

  describe('Prompt Generators', () => {
    it('should generate CLASSIFICATION_PROMPT with user input', () => {
      const input = 'I feel sad';
      const expected = `
Analyze the user's message below and respond with only one of these three tags, no other text: [OFF_TOPIC|CRISIS|SAFE].
OFF_TOPIC: The message is a general knowledge question or blocked phrase.
CRISIS: The message expresses self-harm or suicidal intent.
SAFE: The message is related to mental health, anxiety, or general well-being.
User Message: "I feel sad"
`.trim();
      expect(CLASSIFICATION_PROMPT(input)).to.equal(expected);
    });

    it('should generate CHAT_PROMPT with user input', () => {
      const input = 'I’m stressed out';
      const expected = `
You are a warm, supportive mental wellness companion.
- Your response must be under 150 words.
- Do not include the disclaimer in your response; it will be added by the system.
- User input: "I’m stressed out"
`.trim();
      expect(CHAT_PROMPT(input)).to.equal(expected);
    });

    it('should generate CONTINUE_PROMPT with history and user input', () => {
      const recentHistory = 'user: I’m anxious | assistant: I’m here to help';
      const input = 'I can’t sleep';
      const expected = `
Continue this mental health chat. Be warm, practical, and limit your response to 120 words.
Previous Context (Role: Content | ...): user: I’m anxious | assistant: I’m here to help
Crisis Response: "I'm really concerned about what you just shared. **Please reach out for immediate help**: Call +234 800 2255 6362 to direct you to nearest help available. You're not alone."

User: "I can’t sleep"
`.trim();
      expect(CONTINUE_PROMPT(recentHistory, input)).to.equal(expected);
    });
  });

  describe('Helper Functions', () => {
    describe('toId', () => {
      it('should convert string to ObjectId', () => {
        const id = '1234567890abcdef12345678';
        const result = toId(id);
        expect(objectIdStub.calledOnceWith(id)).to.be.true;
        expect(result).to.deep.equal({ id });
      });
    });

    describe('isCrisis', () => {
      it('should return true for crisis keywords', () => {
        const crisisMessages = [
          'I want to kill myself',
          'no point living',
          'I want to end it',
          'suicide thoughts',
          'I WANT TO DIE',
        ];
        crisisMessages.forEach((msg) => {
          expect(isCrisis(msg)).to.be.true;
        });
      });

      it('should return false for non-crisis messages', () => {
        const nonCrisisMessages = [
          'I’m feeling okay',
          'How’s the weather?',
          'I’m stressed',
          '',
          null,
        ];
        nonCrisisMessages.forEach((msg) => {
          expect(isCrisis(msg)).to.be.false;
        });
      });
    });

    describe('isBlocked', () => {
      it('should return true for blocked phrases', () => {
        const blockedMessages = [
          'What’s the weather like?',
          'Tell me a joke',
          'Stock price of AAPL',
          'Recipe for cake',
          'Solve this math problem',
          'WEATHER today',
        ];
        blockedMessages.forEach((msg) => {
          expect(isBlocked(msg)).to.be.true;
        });
      });

      it('should return false for non-blocked messages', () => {
        const nonBlockedMessages = [
          'I’m feeling anxious',
          'How can I manage stress?',
          '',
          null,
        ];
        nonBlockedMessages.forEach((msg) => {
          expect(isBlocked(msg)).to.be.false;
        });
      });
    });
  });
});
