const express = require("express");
const bodyParser = require("body-parser");
const helmet = require("helmet"); // New import
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const http = require("http");
const rateLimit = require("express-rate-limit"); // New import

const app = express();
const server = http.createServer(app); // wrap express in http server
const { Server } = require("socket.io");
const io = new Server(server);
const port = process.env.PORT || 3000;

app.use(helmet()); // Secure HTTP headers
// Add static middleware to serve files from /Users/tech/Projects/requester/public
app.use(express.static(path.join(__dirname, "public")));

// Setup EJS for templating.
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Middleware to capture text and json bodies.
app.use(bodyParser.json({ limit: "1mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "1mb" }));

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

// Route to view requests; pass an empty array so client takes over.
app.get("/r/:id", (req, res) => {
  const id = req.params.id;
  res.render("explorer", { id, requests: [] });
});

// Catch-all route: simply emit the request to connected clients.
app.all("/r/:id", requestLimiter, (req, res) => {
  const id = req.params.id;
  const reqInfo = {
    id: uuidv4(), // assign a unique id for this request
    method: req.method,
    headers: req.headers,
    query: req.query,
    body: req.body,
    timestamp: new Date(),
  };
  io.to(id).emit("new_request", reqInfo);
  res.status(200).send("Request logged");
});

// Remove the DELETE endpoint since deletion is handled client-side.

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
