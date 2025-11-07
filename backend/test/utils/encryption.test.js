import { expect } from 'chai';
import sinon from 'sinon';
import crypto from 'crypto';
import { logger } from '../../config/index.js';
import { encryptText, decryptText } from '../../utils/encryption.js';

describe('Encrypt Utilities', () => {
  let cryptoStub, loggerStub;

  beforeEach(() => {
    // Mock crypto methods
    cryptoStub = {
      randomBytes: sinon.stub(crypto, 'randomBytes'),
      createCipheriv: sinon.stub(crypto, 'createCipheriv'),
      createDecipheriv: sinon.stub(crypto, 'createDecipheriv'),
      pbkdf2Sync: sinon.stub(crypto, 'pbkdf2Sync'),
    };

    // Mock logger.error
    loggerStub = sinon.stub(logger, 'error');

    // Setup default mocks
    cryptoStub.pbkdf2Sync.returns(Buffer.alloc(32, 'key')); // Mock 32-byte key
  });

  afterEach(() => {
    // Restore mocks
    sinon.restore();
  });

  describe('encryptText', () => {
    it('should return empty string for non-string input', () => {
      expect(encryptText(null)).to.equal('');
      expect(encryptText(undefined)).to.equal('');
      expect(encryptText(123)).to.equal('');
      expect(encryptText({})).to.equal('');
      expect(loggerStub.called).to.be.false;
    });

    it('should return empty string for empty string input', () => {
      expect(encryptText('')).to.equal('');
      expect(loggerStub.called).to.be.false;
    });

    it('should encrypt a valid string and return base64', () => {
      const iv = Buffer.alloc(16, 'iv');
      const cipherMock = {
        update: sinon.stub().returns('encrypted'),
        final: sinon.stub().returns('final'),
      };
      cryptoStub.randomBytes.returns(iv);
      cryptoStub.createCipheriv.returns(cipherMock);

      const input = 'Hello, world!';
      const result = encryptText(input);

      expect(cryptoStub.randomBytes.calledOnceWith(16)).to.be.true;
      expect(cryptoStub.createCipheriv.calledOnceWith('aes-256-cbc', sinon.match.any, iv)).to.be.true;
      expect(cipherMock.update.calledOnceWith(input, 'utf8', 'base64')).to.be.true;
      expect(cipherMock.final.calledOnceWith('base64')).to.be.true;
      expect(result).to.equal(Buffer.concat([iv, Buffer.from('encryptedfinal', 'base64')]).toString('base64'));
      expect(loggerStub.called).to.be.false;
    });
  });

  describe('decryptText', () => {
    it('should return empty string for non-string input', () => {
      expect(decryptText(null)).to.equal('');
      expect(decryptText(undefined)).to.equal('');
      expect(decryptText(123)).to.equal('');
      expect(decryptText({})).to.equal('');
      expect(loggerStub.called).to.be.false;
    });

    it('should return empty string for empty string input', () => {
      expect(decryptText('')).to.equal('');
      expect(loggerStub.called).to.be.false;
    });

    it('should return empty string and log error for invalid encrypted data (too short)', () => {
      const context = { test: 'context' };
      const result = decryptText('short', context);

      expect(result).to.equal('');
      expect(loggerStub.calledOnceWith('Decryption failed', { error: 'Invalid encrypted data', context })).to.be.true;
    });

    it('should decrypt a valid encrypted string', () => {
      const originalText = 'Hello, world!';
      const iv = Buffer.alloc(16, 'iv');
      const encrypted = Buffer.from('encrypted', 'utf8').toString('base64');
      const encryptedBuffer = Buffer.concat([iv, Buffer.from(encrypted, 'base64')]);
      const encryptedText = encryptedBuffer.toString('base64');

      const decipherMock = {
        update: sinon.stub().returns('decrypted'),
        final: sinon.stub().returns('final'),
      };
      cryptoStub.createDecipheriv.returns(decipherMock);

      const result = decryptText(encryptedText);

      expect(cryptoStub.createDecipheriv.calledOnceWith('aes-256-cbc', sinon.match.any, iv)).to.be.true;
      expect(decipherMock.update.calledOnceWith(encrypted, 'base64', 'utf8')).to.be.true;
      expect(decipherMock.final.calledOnceWith('utf8')).to.be.true;
      expect(result).to.equal('decryptedfinal');
      expect(loggerStub.called).to.be.false;
    });

    it('should return empty string and log error for decryption failure', () => {
      const iv = Buffer.alloc(16, 'iv');
      const encrypted = Buffer.from('encrypted', 'utf8').toString('base64');
      const encryptedBuffer = Buffer.concat([iv, Buffer.from(encrypted, 'base64')]);
      const encryptedText = encryptedBuffer.toString('base64');
      const context = { test: 'context' };

      cryptoStub.createDecipheriv.throws(new Error('Decryption error'));

      const result = decryptText(encryptedText, context);

      expect(result).to.equal('');
      expect(loggerStub.calledOnceWith('Decryption failed', { error: 'Decryption error', context })).to.be.true;
    });
  });
});
