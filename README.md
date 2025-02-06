# Request Explorer

Request Explorer is a tool to inspect and manage HTTP requests in real-time. It uses Socket.IO and IndexedDB to display and store incoming requests, and offers features like pagination, request deletion, and dynamic URL generation.

## Technologies & Packages

- **Node.js** and **Express** – Server framework.
- **EJS** – Templating engine.
- **Socket.IO** – Real-time communication.
- **IndexedDB** – Browser-based database for storing requests.
- **Helmet** – Enhances security with HTTP headers and custom Content Security Policy.
- **UUID** – Generates unique IDs.
- **Express-rate-limit** – Protects endpoints from abuse.
- **Bootstrap 5** – For responsive UI styling.

## Installation & Local Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yocmen/request-explorer.git
   cd request-explorer
   ```

2. **Install dependencies:**

   ```bash
   yarn install
   ```

3. **Run the application:**

   ```bash
   yarn start
   ```

   The server will start on port 3000 (or the port specified by the environment).

4. **Access the application:**
   Open a browser and navigate to:
   `http://localhost:3000/`
   A unique explorer URL will be generated. Open that URL in another tab to inspect the requests.

## Per-URL Configuration

Each generated URL has its own response configuration stored in an SQLite database. To manage or update the response for a specific URL, navigate to /config/:id (where :id is the UUID). On this page, you can change the status code, response type, and body. This configuration is automatically applied to incoming requests for that URL.

## Security & Performance

- Enhanced security using Helmet with a custom Content Security Policy.
- Rate limiting to prevent abuse.
- IndexedDB is used with pagination to improve performance when handling many requests.

## Contribution Guidelines

We welcome contributions! Please follow these steps to contribute:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Make your changes and commit them (`git commit -m 'Add new feature'`).
4. Push to the branch (`git push origin feature-branch`).
5. Open a pull request.

## License

[MIT](LICENSE)
