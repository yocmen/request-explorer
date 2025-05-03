const express = require("express");
const bodyParser = require("body-parser");
const helmet = require("helmet"); // New import
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const http = require("http");
const rateLimit = require("express-rate-limit"); // New import
const { getConfig, setConfig } = require("./db");

const app = express();
const server = http.createServer(app); // wrap express in http server
const { Server } = require("socket.io");
const io = new Server(server);
const port = process.env.PORT || 3000;

// Enhanced Helmet configuration with custom CSP
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "'unsafe-inline'"],
      styleSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "'unsafe-inline'"],
      connectSrc: ["'self'"],
      // Allow data: URIs for background images
      imgSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
      frameAncestors: ["'none'"],
    },
  })
);

// Add static middleware to serve files from /Users/tech/Projects/requester/public
app.use(express.static(path.join(__dirname, "public")));

// Setup EJS for templating.
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Middleware to capture text and json bodies.
app.use(bodyParser.json({ limit: "1mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "1mb" }));
// Add text parser for 'text/plain'
app.use(bodyParser.text({ type: "text/plain" }));

// Apply rate limiter to prevent endpoint abuse.
const requestLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 60, // limit each IP to 60 requests per window
  message: "Too many requests, please try again later.",
});

// Remove activeRooms tracking

// Socket.IO connection handling.
io.on("connection", (socket) => {
  socket.on("join_room", (room) => {
    // Validate room ID (UUID v4 format)
    if (!/^[0-9a-fA-F\-]{36}$/.test(room)) {
      return;
    }
    socket.join(room);
  });
});

// Home page: generate a new unique URL.
app.get("/", (req, res) => {
  const uniqueId = uuidv4();
  const origin = req.protocol + "://" + req.get("host"); // Compute full origin
  res.render("index", { uniqueId, origin });
});

// New route to view the explorer/request logs
app.get("/explorer/:id", (req, res) => {
  const id = req.params.id;
  res.render("explorer", { id, requests: [] });
});

// Provide config by ID
app.get("/config/:id", async (req, res) => {
  const { id } = req.params;
  try {
    let row = await getConfig(id);
    if (!row) {
      // Default config on first usage
      row = { id, status: 200, body: "Request logged", contentType: "text" };
    }
    res.render("config", { responseConfig: row, configId: id });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving configuration.");
  }
});

app.post("/config/:id", async (req, res) => {
  const { id } = req.params;
  const { status, body, contentType } = req.body;
  try {
    const statusCode = parseInt(status);
    if (isNaN(statusCode) || statusCode < 100 || statusCode > 599) {
      return res.status(400).send("Invalid status code. Must be between 100 and 599.");
    }

    await setConfig(id, {
      status: statusCode,
      body: body || "Request logged",
      contentType: contentType || "text",
    });
    res.redirect(`/config/${id}?status=ok`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving configuration.");
  }
});

app.all("/r/:id", requestLimiter, async (req, res) => {
  const { id } = req.params;
  const reqInfo = {
    id: uuidv4(), // assign a unique id for this request
    method: req.method,
    headers: req.headers,
    query: req.query,
    body: req.body,
    timestamp: new Date(),
  };
  io.to(id).emit("new_request", reqInfo);

  try {
    let row = await getConfig(id);
    if (!row) {
      // Fallback if none is configured for that ID
      row = { status: 200, body: "Request logged", contentType: "text" };
    }
    res.setHeader("Content-Type", getMimeType(row.contentType));
    res.status(row.status).send(row.body);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error.");
  }
});

// Helper to get MIME type by config.
function getMimeType(type) {
  switch (type) {
    case "json":
      return "application/json";
    case "xml":
      return "application/xml";
    default:
      return "text/plain";
  }
}

// Remove the DELETE endpoint since deletion is handled client-side.

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
