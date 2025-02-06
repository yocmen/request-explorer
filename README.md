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
   git clone https://github.com/yourusername/request-explorer.git
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

## Project Structure

- `/index.js` – Main server file initializing Express, Socket.IO, and setting up routes.
- `/views` – Contains EJS templates.
  - `index.ejs` – Homepage view with the generated explorer URL and stored URLs.
  - `explorer.ejs` – Displays requests with pagination.
- `/public/js` – Client-side JavaScript.
  - `index.js` – Handles IndexedDB operations for fetching stored URLs.
  - `explorer.js` – Manages IndexedDB, displays, and paginates requests.
- `/README.md` – Project documentation.

## Security & Performance

- Enhanced security using Helmet with a custom Content Security Policy.
- Rate limiting to prevent abuse.
- IndexedDB is used with pagination to improve performance when handling many requests.

## License

[MIT](LICENSE)
