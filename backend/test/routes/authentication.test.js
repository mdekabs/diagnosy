import chai from 'chai';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../app.js'; // Adjust path if necessary
import User from '../../models/user.js'; // Adjust path if necessary

const { expect } = chai;

describe('Authentication Routes Integration Tests', function () {
  this.timeout(15000); // allow time for real DB + Redis ops

  const baseUrl = '/api/auth';
  let token;
  let userId;

  before(async () => {
    // DB should already be connected by app.js, but ensure
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.DB);
    }
  });

  beforeEach(async () => {
    // Clear user collection before each test
    await User.deleteMany({});
  });

  after(async () => {
    await mongoose.connection.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post(`${baseUrl}/register`)
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
        });

      expect(res.status).to.equal(200);
      expect(res.body.type).to.equal('success');
      expect(res.body.message).to.equal('Registration successful');

      // User should now exist in DB
      const user = await User.findOne({ email: 'test@example.com' });
      expect(user).to.exist;
    });

    it('should fail if email already exists', async () => {
      await User.create({
        username: 'existing',
        email: 'taken@example.com',
        password: 'password123',
      });

      const res = await request(app)
        .post(`${baseUrl}/register`)
        .send({
          username: 'any',
          email: 'taken@example.com',
          password: 'password123',
        });

      expect(res.status).to.equal(409);
      expect(res.body.type).to.equal('error');
      expect(res.body.message).to.equal('Email is already in use.');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await User.create({
        username: 'loginuser',
        email: 'login@example.com',
        password: 'mypassword',
      });
    });

    it('should login a user and return token + userId', async () => {
      const res = await request(app)
        .post(`${baseUrl}/login`)
        .send({
          username: 'loginuser',
          password: 'mypassword',
        });

      expect(res.status).to.equal(200);
      expect(res.body.type).to.equal('success');
      expect(res.body.data).to.have.property('token');
      expect(res.body.data).to.have.property('userId');

      token = res.body.data.token;
      userId = res.body.data.userId;
    });

    it('should fail with incorrect password', async () => {
      const res = await request(app)
        .post(`${baseUrl}/login`)
        .send({
          username: 'loginuser',
          password: 'wrongpassword',
        });

      expect(res.status).to.equal(401);
      expect(res.body.type).to.equal('error');
      expect(res.body.message).to.equal('Incorrect password.');
    });
  });

  describe('GET /auth/me', () => {
    beforeEach(async () => {
      // Register user
      await request(app).post(`${baseUrl}/register`).send({
        username: 'meuser',
        email: 'me@example.com',
        password: 'password123',
      });

      // Login to get token
      const loginRes = await request(app)
        .post(`${baseUrl}/login`)
        .send({ username: 'meuser', password: 'password123' });

      token = loginRes.body.data.token;
      userId = loginRes.body.data.userId;
    });

    it('should return user profile for valid token', async () => {
      const res = await request(app)
        .get(`${baseUrl}/me`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).to.equal(200);
      expect(res.body.type).to.equal('success');
      expect(res.body.data).to.deep.include({
        userId,
        email: 'me@example.com',
        username: 'meuser',
      });
    });

    it('should return 401 if token is missing', async () => {
      const res = await request(app).get(`${baseUrl}/me`);
      expect(res.status).to.equal(401);
      expect(res.body.type).to.equal('error');
    });
  });

  describe('POST /auth/logout', () => {
    beforeEach(async () => {
      await request(app).post(`${baseUrl}/register`).send({
        username: 'logoutuser',
        email: 'logout@example.com',
        password: 'password123',
      });

      const loginRes = await request(app)
        .post(`${baseUrl}/login`)
        .send({ username: 'logoutuser', password: 'password123' });

      token = loginRes.body.data.token;
    });

    it('should log out and blacklist token', async () => {
      const res = await request(app)
        .post(`${baseUrl}/logout`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).to.equal(200);
      expect(res.body.type).to.equal('success');
      expect(res.body.message).to.equal('Logout successful');
    });
  });
});

