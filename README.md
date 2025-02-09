# Request Explorer

A simple tool to inspect and manage HTTP requests with a modern interface.

## Features

- **Modern UI:** Uses Tailwind CSS with gradient backgrounds, rounded cards, and smooth transitions.
- **Real-time Updates:** Integrated with Socket.IO for live request updates.
- **Configurable Response:** Easily customize HTTP response settings via an intuitive configuration page.

## Setup

1. Clone the repository and navigate to the project directory:

   ```bash
   cd /Users/tech/Projects/requester
   ```

2. Install dependencies:

   ```bash
   yarn install
   ```

3. Build the CSS using Tailwind CSS:

   ```bash
   yarn build:css
   ```

   This will watch for changes and rebuild `/public/styles.css`.

4. Start the server:

   ```bash
   yarn start
   ```

## File Structure Overview

- **/views/**
  Contains EJS templates for the homepage, explorer, and configuration pages using the new modern look.

- **/src/styles.css**
  Tailwind’s base, components, and utilities are imported here.

- **/public/js/**
  Includes JavaScript for client-side interactions (e.g., fetching stored URLs, rendering requests).

- **tailwind.config.js**
  Contains content paths and a safelist to ensure dynamically built classes are included.

## Usage

- Open your browser to `http://localhost:3000/`
- A unique Request Explorer URL will be generated.
- Visit the unique URL to inspect live HTTP requests.
- Configure your response at `http://localhost:3000/config/<uniqueId>`.

## License

MIT
