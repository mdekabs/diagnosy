import { expect } from 'chai';
import sinon from 'sinon';
import nodemailer from 'nodemailer';
import sendMail from '../../utils/send_mail.js';

describe('sendMail', () => {
  let createTransportStub;
  let sendMailStub;
  let transporter;

  beforeEach(() => {
    // Mock environment variables
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_SERVICE = 'gmail';
    process.env.SMTP_MAIL = 'test@example.com';
    process.env.SMTP_PASSWORD = 'password';

    // Mock nodemailer.createTransport and sendMail
    sendMailStub = sinon.stub().resolves();
    transporter = { sendMail: sendMailStub };
    createTransportStub = sinon.stub(nodemailer, 'createTransport').returns(transporter);
  });

  afterEach(() => {
    // Restore stubs and environment variables
    sinon.restore();
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_SERVICE;
    delete process.env.SMTP_MAIL;
    delete process.env.SMTP_PASSWORD;
  });

  it('should create transporter with correct SMTP configuration', async () => {
    const options = {
      email: 'recipient@example.com',
      subject: 'Test Subject',
      message: 'Test Message',
    };

    await sendMail(options);

    expect(createTransportStub.calledOnce).to.be.true;
    expect(createTransportStub.calledWith({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      service: process.env.SMTP_SERVICE,
      auth: {
        user: process.env.SMTP_MAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    })).to.be.true;
  });

  it('should call sendMail with correct mail options', async () => {
    const options = {
      email: 'recipient@example.com',
      subject: 'Test Subject',
      message: 'Test Message',
    };

    await sendMail(options);

    expect(sendMailStub.calledOnce).to.be.true;
    expect(sendMailStub.calledWith({
      from: process.env.SMTP_MAIL,
      to: options.email,
      subject: options.subject,
      text: options.message,
    })).to.be.true;
  });

  it('should handle different email options correctly', async () => {
    const options = {
      email: 'another@example.com',
      subject: 'Different Subject',
      message: 'Different Message',
    };

    await sendMail(options);

    expect(sendMailStub.calledWith({
      from: process.env.SMTP_MAIL,
      to: options.email,
      subject: options.subject,
      text: options.message,
    })).to.be.true;
  });

  it('should throw an error if sendMail fails', async () => {
    const options = {
      email: 'recipient@example.com',
      subject: 'Test Subject',
      message: 'Test Message',
    };

    const error = new Error('SMTP Error');
    sendMailStub.rejects(error);

    try {
      await sendMail(options);
      expect.fail('Expected sendMail to throw an error');
    } catch (err) {
      expect(err).to.equal(error);
    }
  });

  it('should use environment variables for transporter configuration', async () => {
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_PORT = '465';
    process.env.SMTP_SERVICE = 'testmail';
    process.env.SMTP_MAIL = 'new@example.com';
    process.env.SMTP_PASSWORD = 'newpassword';

    const options = {
      email: 'recipient@example.com',
      subject: 'Test Subject',
      message: 'Test Message',
    };

    await sendMail(options);

    expect(createTransportStub.calledWith({
      host: 'smtp.test.com',
      port: '465',
      secure: false,
      service: 'testmail',
      auth: {
        user: 'new@example.com',
        pass: 'newpassword',
      },
    })).to.be.true;
  });
});
