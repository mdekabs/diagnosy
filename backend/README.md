
# Diagnosy Service

Diagnosy is a service that provides symptom and diagnosis guidance, user management, and chat functionality for medical inquiries.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Routes](#routes)
- [Dependencies](#dependencies)
- [Contributing](#contributing)
- [License](#license)

## Installation

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/mdekabs/diagnosy.git
   ```

2. **Navigate to the Project Directory:**
   ```bash
   cd diagnosy
   ```

3. **Install Dependencies:**
   ```bash
   npm install or npm i
   ```

4. **Configure Environment Variables:**
   - Create a `.env` file in the project root.
   - Add necessary environment variables (DB, DB_PASSWORD, API_KEY).

5. **Start the Server:**
   ```bash
   npm run server
   ```

## Usage

To use Diagnosy, follow the installation steps and start the server. The service exposes various routes for user management, authentication, and chat interactions.

## Routes

- **Create a New User:**
  ```
  POST /users
  ```
  
- **User Sign-In:**
  ```
  GET /sign_in
  ```

- **User Sign-Out:**
  ```
  GET /sign_out
  ```

- **Retrieve Authenticated User Information:**
  ```
  GET /users/me
  ```

- **Initiate a Chat Interaction:**
  ```
  GET /chat
  ```

For detailed information on each route, refer to the [api_documentation]section in the code repository.

## Dependencies

- [Express](https://expressjs.com/) - Web application framework for Node.js.
- [Readline-sync](https://www.npmjs.com/package/readline-sync) - Synchronous Readline for interactively running JavaScript.
- [OpenaiService](#) - Custom service for interacting with the OpenAI API.
- [Sha1](https://www.npmjs.com/package/sha1) - Library for generating SHA-1 hash.

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
