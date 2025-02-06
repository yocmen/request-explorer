// Add sanitization helper to prevent XSS.
function sanitize(input) {
  if (typeof input !== "string") {
    input = JSON.stringify(input, null, 2);
  }
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const roomId = document.querySelector("h1").textContent.split(":")[1].trim();
const dbName = "RequestDB";
const storeName = "requests"; // constant store name for all rooms
let db;

// Update openDB() to use version 2.
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 2);
    request.onerror = () => reject("Error opening IndexedDB.");
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onupgradeneeded = (event) => {
      db = event.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, { keyPath: "id" });
        store.createIndex("roomIdx", "room", { unique: false });
      }
    };
  });
}

// Attach roomId to the request.
function addRequestToDB(reqObj) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    store.put({ ...reqObj, room: roomId });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject("Error adding request.");
  });
}

// Get all requests for current room.
function getAllRequestsFromDB() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const index = store.index("roomIdx");
    const request = index.getAll(roomId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject("Error fetching requests.");
  });
}

// Delete request from DB.
function deleteRequestFromDB(reqId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.delete(reqId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject("Error deleting request.");
  });
}

// Render requests.
async function renderRequests() {
  const container = document.getElementById("requestsContainer");
  container.querySelectorAll(".card, .alert.alert-warning").forEach((el) => el.remove());
  const requests = await getAllRequestsFromDB();
  if (!requests.length) {
    const warning = document.createElement("div");
    warning.className = "alert alert-warning";
    warning.textContent = "No requests received yet.";
    container.appendChild(warning);
  } else {
    requests
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .forEach((req) => {
        const card = document.createElement("div");
        card.className = "card mb-3";
        card.setAttribute("data-req-id", req.id);
        // Removed inline onclick attribute.
        card.innerHTML = `
          <div class="card-header d-flex justify-content-between align-items-center">
            <span><strong>${sanitize(req.method)}</strong> at ${new Date(req.timestamp).toLocaleString()}</span>
            <button type="button" class="btn-close" aria-label="Close"></button>
          </div>
          <div class="card-body">
            <p><strong>Headers:</strong></p>
            <pre>${sanitize(JSON.stringify(req.headers, null, 2))}</pre>
            ${
              Object.keys(req.query).length
                ? `<p><strong>Query Parameters:</strong></p><pre>${sanitize(JSON.stringify(req.query, null, 2))}</pre>`
                : ""
            }
            ${
              req.body && Object.keys(req.body).length
                ? `<p><strong>Body:</strong></p>
                    ${
                      req.headers["content-type"] && req.headers["content-type"].includes("application/json")
                        ? `<pre>${sanitize(JSON.stringify(req.body, null, 2))}</pre>`
                        : `<pre>${sanitize(req.body)}</pre>`
                    }`
                : ""
            }
          </div>
        `;
        container.appendChild(card);
        // Attach event listener to close button.
        const closeBtn = card.querySelector(".btn-close");
        closeBtn.addEventListener("click", () => removeRequest(card));
      });
  }
}

// Remove a request client-side only.
async function removeRequest(cardElement) {
  const reqId = cardElement.getAttribute("data-req-id");
  if (!reqId) {
    alert("Request ID not found.");
    return;
  }
  await deleteRequestFromDB(reqId);
  renderRequests();
}

// Initialize DB and render stored requests.
openDB()
  .then(() => renderRequests())
  .catch((err) => {
    console.error(err);
  });

// Socket.IO setup.
const socket = io();
socket.emit("join_room", roomId);
socket.on("new_request", function (newReq) {
  addRequestToDB(newReq)
    .then(() => renderRequests())
    .catch((err) => console.error(err));
});
