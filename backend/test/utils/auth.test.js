import { expect } from 'chai';
import sinon from 'sinon';
import jwt from 'jsonwebtoken';
import { logger } from '../../config/index.js';
import { verifyJWT } from '../../utils/auth.js';

describe('verifyJWT', () => {
  let loggerInfoStub, loggerWarnStub;

  beforeEach(() => {
    // Mock logger methods
    loggerInfoStub = sinon.stub(logger, 'info');
    loggerWarnStub = sinon.stub(logger, 'warn');
  });

  afterEach(() => {
    // Restore mocks
    sinon.restore();
  });

  it('should throw an error if token is missing', async () => {
    try {
      await verifyJWT(undefined);
      expect.fail('Expected verifyJWT to throw an error');
    } catch (err) {
      expect(err.message).to.equal('Token missing.');
      expect(loggerWarnStub.called).to.be.false; // No warnings logged
      expect(loggerInfoStub.called).to.be.false; // No info logged
    }
  });

  it('should throw an error if token is blacklisted', async () => {
    const mockIsBlacklistedCheck = sinon.stub().resolves(true);
    try {
      await verifyJWT('some-token', mockIsBlacklistedCheck);
      expect.fail('Expected verifyJWT to throw an error');
    } catch (err) {
      expect(err.message).to.equal('Token is blacklisted.');
      expect(mockIsBlacklistedCheck.calledOnceWith('some-token')).to.be.true;
      expect(loggerWarnStub.calledOnceWith('Token verification failed: Token is blacklisted.')).to.be.true;
      expect(loggerInfoStub.called).to.be.false;
    }
  });

  it('should log a warning if no blacklisting check is provided', async () => {
    const mockToken = 'valid-token';
    const mockPayload = { id: '123', isAdmin: true };
    sinon.stub(jwt, 'verify').returns(mockPayload);

    const result = await verifyJWT(mockToken);

    expect(result).to.deep.equal({ sub: '123', isAdmin: true });
    expect(loggerWarnStub.calledOnceWith('Token blacklisting check function was not provided to verifyJWT.')).to.be.true;
    expect(loggerInfoStub.calledOnceWith('Token verified for User ID: 123')).to.be.true;
    expect(jwt.verify.calledOnceWith(mockToken, process.env.JWT_SECRET)).to.be.true;
  });

  it('should verify a valid token and return payload', async () => {
    const mockToken = 'valid-token';
    const mockPayload = { id: '123', isAdmin: false };
    const mockIsBlacklistedCheck = sinon.stub().resolves(false);
    sinon.stub(jwt, 'verify').returns(mockPayload);

    const result = await verifyJWT(mockToken, mockIsBlacklistedCheck);

    expect(result).to.deep.equal({ sub: '123', isAdmin: false });
    expect(mockIsBlacklistedCheck.calledOnceWith(mockToken)).to.be.true;
    expect(jwt.verify.calledOnceWith(mockToken, process.env.JWT_SECRET)).to.be.true;
    expect(loggerInfoStub.calledOnceWith('Token verified for User ID: 123')).to.be.true;
    expect(loggerWarnStub.called).to.be.false;
  });

  it('should throw an error for an invalid token', async () => {
    const mockToken = 'invalid-token';
    const mockIsBlacklistedCheck = sinon.stub().resolves(false);
    sinon.stub(jwt, 'verify').throws(new Error('Invalid signature'));

    try {
      await verifyJWT(mockToken, mockIsBlacklistedCheck);
      expect.fail('Expected verifyJWT to throw an error');
    } catch (err) {
      expect(err.message).to.equal('Invalid token: Invalid signature');
      expect(mockIsBlacklistedCheck.calledOnceWith(mockToken)).to.be.true;
      expect(jwt.verify.calledOnceWith(mockToken, process.env.JWT_SECRET)).to.be.true;
      expect(loggerWarnStub.calledOnceWith('JWT verification failed: Invalid signature')).to.be.true;
      expect(loggerInfoStub.called).to.be.false;
    }
  });

  it('should throw an error if token payload is missing id', async () => {
    const mockToken = 'valid-token-no-id';
    const mockPayload = { isAdmin: true }; // No id
    const mockIsBlacklistedCheck = sinon.stub().resolves(false);
    sinon.stub(jwt, 'verify').returns(mockPayload);

    try {
      await verifyJWT(mockToken, mockIsBlacklistedCheck);
      expect.fail('Expected verifyJWT to throw an error');
    } catch (err) {
      expect(err.message).to.equal('Invalid token: Missing user ID.');
      expect(mockIsBlacklistedCheck.calledOnceWith(mockToken)).to.be.true;
      expect(jwt.verify.calledOnceWith(mockToken, process.env.JWT_SECRET)).to.be.true;
      expect(loggerWarnStub.calledOnceWith('JWT verification failed: Missing User ID in payload.')).to.be.true;
      expect(loggerInfoStub.called).to.be.false;
    }
  });
});
