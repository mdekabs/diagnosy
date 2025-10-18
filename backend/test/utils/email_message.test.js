import { expect } from 'chai';
import generatePasswordResetEmail from '../../utils/email_message.js';

describe('generatePasswordResetEmail', () => {
    it('should return an object with subject and message properties', () => {
        const host = 'example.com';
        const token = 'abc123';
        const result = generatePasswordResetEmail(host, token);

        expect(result).to.be.an('object');
        expect(result).to.have.property('subject').that.equals('Password Reset');
        expect(result).to.have.property('message').that.is.a('string');
    });

    it('should include the correct host and token in the reset link', () => {
        const host = 'test.com';
        const token = 'xyz789';
        const result = generatePasswordResetEmail(host, token);

        expect(result.message).to.include(`http://${host}/reset/${token}`);
    });

    it('should contain the correct email content structure', () => {
        const host = 'example.com';
        const token = 'abc123';
        const result = generatePasswordResetEmail(host, token);

        expect(result.message).to.match(/You are receiving this because/);
        expect(result.message).to.match(/Please click on the following link/);
        expect(result.message).to.match(/If you did not request this/);
    });

    it('should handle different host values correctly', () => {
        const host1 = 'localhost:3000';
        const host2 = 'api.example.com';
        const token = 'testtoken';

        const result1 = generatePasswordResetEmail(host1, token);
        const result2 = generatePasswordResetEmail(host2, token);

        expect(result1.message).to.include(`http://${host1}/reset/${token}`);
        expect(result2.message).to.include(`http://${host2}/reset/${token}`);
    });

    it('should handle different token values correctly', () => {
        const host = 'example.com';
        const token1 = 'token123';
        const token2 = 'token456';

        const result1 = generatePasswordResetEmail(host, token1);
        const result2 = generatePasswordResetEmail(host, token2);

        expect(result1.message).to.include(`http://${host}/reset/${token1}`);
        expect(result2.message).to.include(`http://${host}/reset/${token2}`);
    });
});
