# Diagnosy

Diagnosy is a Node.js-based API that provides health-related chat functionality for authenticated and guest users. Users can submit health symptoms to receive advice powered by a Gemini service, with chat history stored in MongoDB for authenticated users and Redis for guests. The API supports user authentication, registration, password reset, and guest access, with JWT-based authentication, Redis caching, and asynchronous email processing via queues.

## Features
- **Authentication**:
  - Register and log in users with JWT tokens.
  - Guest access with temporary IDs and tokens.
  - Password reset via email with queue-based processing.
  - Token blacklisting for logout.
- **Chat Functionality**:
  - Create health-related chat sessions for authenticated or guest users.
  - Retrieve chat history for authenticated users.
- **Caching**: Redis-based caching for improved performance.
- **Logging**: Winston-based logging with daily rotation and sensitive data filtering.
- **Email Processing**: Asynchronous email sending via Bull queues.
- **API Documentation**: Swagger UI for endpoint exploration.
- **Testing**: Unit tests for controllers using Mocha, Chai, and Sinon.

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (user data, chat history), Redis (guest chats, caching, token blacklisting)
- **Authentication**: JSON Web Tokens (JWT)
- **Queue**: Bull for email processing
- **Logging**: Winston with daily rotation
- **API Docs**: Swagger (OpenAPI 3.0)
- **Testing**: Mocha, Chai, Sinon
- **Dependencies**: Mongoose, Redis, Bull, Express-validator, Swagger-jsdoc, Swagger-ui-express


## Installation

1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd diagnosy/backend

   npm Installation
## Set up .env
    use the sampel .env.example files

## start mongodb and redis on your server

## start the email worker
    npm start worker

## start server
    npm start

## API Usage
    The API is accessible at http://localhost:3000/api. 
    Explore endpoints via Swagger UI at http://localhost:3000/api-docs






## Project Structure
## Contributors
**Michael Adebayo**

Title: Fullstack Engineer

[GitHub Profile](https://github.com/MikeRock51)

[LinkedIn Profile](https://www.linkedin.com/in/michael-adebayo-637507251/)

[Portfolio](https://mikerock.tech)

**Ekabua Mawoda**

Title: Backend Engineer

[GitHub Profile](github.com/mdekabs)

[LinkedIn Profile](linkedin/in/emawoda)

[Portfolio](www.mdstorms.cloud)
