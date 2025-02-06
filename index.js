const express = require("express");
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const http = require("http");

const app = express();
const server = http.createServer(app); // wrap express in http server
const { Server } = require("socket.io");
const io = new Server(server);
const port = process.env.PORT || 3000;

// Setup EJS for templating.
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Middleware to capture text and json bodies.
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Socket.IO connection handling.
io.on("connection", (socket) => {
  socket.on("join_room", (room) => {
    socket.join(room);
  });
});

// Home page: generate a new unique URL.
app.get("/", (req, res) => {
  const uniqueId = uuidv4();
  // No central storage needed.
  res.render("index", { uniqueId });
});

// Route to view requests; pass an empty array so client takes over.
app.get("/r/:id", (req, res) => {
  const id = req.params.id;
  res.render("explorer", { id, requests: [] });
});

// Catch-all route: simply emit the request to connected clients.
app.all("/r/:id", (req, res) => {
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
