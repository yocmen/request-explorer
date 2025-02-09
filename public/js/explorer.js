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

// Remove or comment out the previous getAllRequestsFromDB function.

// Add pagination-related functions:
function getRequestsPage(page, pageSize) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const index = store.index("roomIdx");
    const results = [];
    const keyRange = IDBKeyRange.only(roomId);
    const cursorRequest = index.openCursor(keyRange, "prev");
    let skip = 0;
    const lowerBound = pageSize * (page - 1);
    cursorRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && results.length < pageSize) {
        if (skip < lowerBound) {
          skip++;
          cursor.continue();
        } else {
          results.push(cursor.value);
          cursor.continue();
        }
      } else {
        resolve(results);
      }
    };
    cursorRequest.onerror = () => reject("Error iterating requests.");
  });
}

function countRequests() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const index = store.index("roomIdx");
    const keyRange = IDBKeyRange.only(roomId);
    const countReq = index.count(keyRange);
    countReq.onsuccess = () => resolve(countReq.result);
    countReq.onerror = () => reject("Error counting requests.");
  });
}

let currentPage = 1;
const pageSize = 10;

async function renderRequests() {
  const container = document.getElementById("requestsContainer");
  // Clear previous request cards and pagination controls
  container.querySelectorAll(".card, .alert, #paginationControls").forEach((el) => el.remove());

  try {
    const total = await countRequests();
    const totalPages = Math.ceil(total / pageSize);
    if (total === 0) {
      const warning = document.createElement("div");
      warning.className = "alert alert-warning";
      warning.textContent = "No requests received yet.";
      container.appendChild(warning);
    } else {
      const requests = await getRequestsPage(currentPage, pageSize);
      requests
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .forEach((req) => {
          const card = document.createElement("div");
          card.className = "card mb-3";
          card.setAttribute("data-req-id", req.id);
          card.innerHTML = `
            <div class="card-header d-flex justify-content-between align-items-center">
              <span><strong>${sanitize(req.method)}</strong> at ${new Date(req.timestamp).toLocaleString()}</span>
              <button type="button" class="btn-close" aria-label="Close"></button>
            </div>
            <div class="card-body">
              <p><strong>Headers:</strong></p>
              <pre><code class="json">${sanitize(JSON.stringify(req.headers, null, 2))}</code></pre>
              ${
                Object.keys(req.query).length
                  ? `<p><strong>Query Parameters:</strong></p><pre>${sanitize(JSON.stringify(req.query, null, 2))}</pre>`
                  : ""
              }
              ${
                req.body &&
                ((typeof req.body === "object" && Object.keys(req.body).length > 0) || (typeof req.body === "string" && req.body.trim() !== ""))
                  ? `<p><strong>Body:</strong></p>
                     ${
                       req.headers["content-type"] && req.headers["content-type"].includes("application/json")
                         ? `<pre><code class="json">${sanitize(JSON.stringify(req.body, null, 2))}</code></pre>`
                         : `<pre>${sanitize(req.body)}</pre>`
                     }`
                  : ""
              }
            </div>
          `;
          card.querySelector(".btn-close").addEventListener("click", () => removeRequest(card));
          // Append card and then apply highlighting if needed.
          container.appendChild(card);
          const jsonElements = card.querySelectorAll("code.json");
          jsonElements.forEach((el) => {
            hljs.highlightElement(el);
          });
        });
      renderPaginationControls(totalPages);
    }
  } catch (err) {
    console.error(err);
  }
}

function renderPaginationControls(totalPages) {
  let paginationEl = document.getElementById("paginationControls");
  if (!paginationEl) {
    paginationEl = document.createElement("div");
    paginationEl.id = "paginationControls";
    paginationEl.className = "mt-3 d-flex justify-content-center align-items-center gap-3";
    document.getElementById("requestsContainer").appendChild(paginationEl);
  }
  paginationEl.innerHTML = "";

  const prevBtn = document.createElement("button");
  prevBtn.className = "btn btn-primary";
  prevBtn.textContent = "Prev";
  prevBtn.disabled = currentPage <= 1;
  prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderRequests();
    }
  });
  paginationEl.appendChild(prevBtn);

  const pageIndicator = document.createElement("span");
  pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
  paginationEl.appendChild(pageIndicator);

  const nextBtn = document.createElement("button");
  nextBtn.className = "btn btn-primary";
  nextBtn.textContent = "Next";
  nextBtn.disabled = currentPage >= totalPages;
  nextBtn.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderRequests();
    }
  });
  paginationEl.appendChild(nextBtn);
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
