import { expect } from 'chai';
// Removed sinon import and usage, as attempting to stub ES Modules (like 'uuid')
// caused the 'TypeError: ES Modules cannot be stubbed' error.
import uuid from '../../utils/uuid.js';

// Standard UUID format regex (e.g., 123e4567-e89b-12d3-a456-426614174000)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('UUID Utility Module (Functional Tests)', () => {
    // The previous mocking setup failed due to ES Module constraints.
    // For this simple wrapper, we will rely on functional tests to verify
    // that the output is correct.

    it('should have a generate function defined', () => {
        expect(uuid.generate).to.be.a('function');
    });

    it('should return a valid UUID string matching the format', () => {
        const result = uuid.generate();

        // Assert the result is a string matching the UUID format
        expect(result).to.be.a('string');
        expect(result).to.match(UUID_REGEX);
    });

    it('should return a unique ID on successive calls', () => {
        const id1 = uuid.generate();
        const id2 = uuid.generate();

        // Assert that the two generated IDs are not the same (ensuring the V4 generation is working)
        expect(id1).to.not.equal(id2);

        // Sanity check to ensure both are valid UUIDs
        expect(id1).to.match(UUID_REGEX);
        expect(id2).to.match(UUID_REGEX);
    });
});

