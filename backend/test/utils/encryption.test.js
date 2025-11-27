import { expect } from 'chai';
import sinon from 'sinon';
import crypto from 'crypto';
import { logger } from '../../config/index.js';

describe('Encryption Utilities — AES-256-GCM with versioning', () => {
  let sandbox;
  let encryptText;
  let decryptText;
  let DERIVED_KEYS;

  // Fake 32-byte keys for v1 and v2
  const mockKeyV1 = Buffer.alloc(32, 'a');
  const mockKeyV2 = Buffer.alloc(32, 'b');

  const loadModule = async () => {
    // Force fresh import by cache-busting the URL
    const mod = await import(`../../utils/encryption.js?t=${Date.now()}`);
    encryptText = mod.encryptText;
    decryptText = mod.decryptText;
    DERIVED_KEYS = mod.DERIVED_KEYS;
  };

  beforeEach(async () => {
    sandbox = sinon.createSandbox();

    // Reset environment variables for key derivation
    process.env.ENCRYPTION_KEY_V1 = 'fake-key-v1-32bytes!!!!!!!!!!!';
    process.env.ENCRYPTION_SALT_V1 = 'fake-salt-v1';
    process.env.ENCRYPTION_KEY_V2 = 'fake-key-v2-32bytes!!!!!!!!!!!';
    process.env.ENCRYPTION_SALT_V2 = 'fake-salt-v2';

    // Stub pbkdf2Sync so key derivation is deterministic
    sandbox.stub(crypto, 'pbkdf2Sync')
      .onCall(0).returns(mockKeyV1) // v1
      .onCall(1).returns(mockKeyV2); // v2

    await loadModule();

    // Stub logger to avoid console noise
    sandbox.stub(logger, 'error');
  });

  afterEach(() => {
    sandbox.restore();
  });

  // ───────────────────────────────────────────────
  describe('encryptText', () => {
    it('returns empty string on invalid input', () => {
      expect(encryptText('')).to.equal('');
      expect(encryptText(null)).to.equal('');
      expect(encryptText(42)).to.equal('');
      expect(logger.error.called).to.be.false;
    });

    it('encrypts using CURRENT_VERSION (v1)', () => {
      const iv = Buffer.alloc(12, 0x11);
      const tag = Buffer.alloc(16, 0x99);

      sandbox.stub(crypto, 'randomBytes').returns(iv);

      const cipher = {
        update: sinon.stub().returns(Buffer.from('cipher-body')),
        final: sinon.stub().returns(Buffer.alloc(0)),
        getAuthTag: sinon.stub().returns(tag),
      };

      sandbox.stub(crypto, 'createCipheriv').returns(cipher);

      const out = encryptText('Hello AES-GCM!');

      const expected = [
        'v1',
        iv.toString('base64'),
        tag.toString('base64'),
        Buffer.from('cipher-body').toString('base64')
      ].join(':');

      expect(out).to.equal(expected);
      expect(crypto.createCipheriv.calledOnceWith(
        'aes-256-gcm',
        mockKeyV1,
        iv
      )).to.be.true;
    });
  });

  // ───────────────────────────────────────────────
  describe('decryptText', () => {
    const buildPayload = (
      version = 'v1',
      iv = Buffer.alloc(12),
      tag = Buffer.alloc(16),
      data = Buffer.from('hello')
    ) => `${version}:${iv.toString('base64')}:${tag.toString('base64')}:${data.toString('base64')}`;

    it('returns empty string and logs error on malformed input', () => {
      expect(decryptText('')).to.equal('');
      expect(decryptText('bad:format')).to.equal('');
      expect(decryptText('v1:only:three')).to.equal('');

      expect(logger.error.called).to.be.true;
    });

    it('decrypts valid v1 payload', () => {
      const iv = Buffer.alloc(12, 0x22);
      const tag = Buffer.alloc(16, 0x44);
      const data = Buffer.from('my secret');

      const payload = buildPayload('v1', iv, tag, data);

      const decipher = {
        setAuthTag: sinon.stub(),
        update: sinon.stub().returns(Buffer.from('my ')),
        final: sinon.stub().returns(Buffer.from('secret')),
      };

      sandbox.stub(crypto, 'createDecipheriv').returns(decipher);

      const out = decryptText(payload);

      expect(out).to.equal('my secret');
      expect(decipher.setAuthTag.calledWith(tag)).to.be.true;
      expect(crypto.createDecipheriv.calledWith(
        'aes-256-gcm',
        mockKeyV1,
        iv
      )).to.be.true;
    });

    it('decrypts v1 data even when CURRENT_VERSION is v1 (no rotation yet)', () => {
      const payload = buildPayload('v1');

      sandbox.stub(crypto, 'createDecipheriv').returns({
        setAuthTag: () => {},
        update: d => d,
        final: () => Buffer.alloc(0),
      });

      const out = decryptText(payload);
      expect(out).to.equal('hello');
    });
  });

  // ───────────────────────────────────────────────
  it('round-trip encrypt → decrypt works', () => {
    const iv = Buffer.alloc(12, 0xaa);
    const tag = Buffer.alloc(16, 0xbb);

    sandbox.stub(crypto, 'randomBytes').returns(iv);

    sandbox.stub(crypto, 'createCipheriv').returns({
      update: buf => Buffer.from(buf),
      final: () => Buffer.alloc(0),
      getAuthTag: () => tag,
    });

    const msg = 'Works perfectly!';
    const encrypted = encryptText(msg);

    sandbox.stub(crypto, 'createDecipheriv').returns({
      setAuthTag: () => {},
      update: d => d,
      final: () => Buffer.alloc(0),
    });

    const decrypted = decryptText(encrypted);
    expect(decrypted).to.equal(msg);
  });
});
