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
  container.querySelectorAll(".bg-white, .bg-yellow-100, #paginationControls").forEach((el) => el.remove());

  try {
    const total = await countRequests();
    const totalPages = Math.ceil(total / pageSize);
    if (total === 0) {
      const warning = document.createElement("div");
      warning.className = "bg-white rounded-lg shadow-md p-6 border border-gray-200";
      warning.innerHTML = `
        <div class="flex items-center justify-center text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>No requests received yet.</p>
        </div>`;
      container.appendChild(warning);
    } else {
      const requests = await getRequestsPage(currentPage, pageSize);
      requests
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .forEach((req) => {
          const card = document.createElement("div");
          card.className = "bg-white rounded-lg shadow-md mb-4 overflow-hidden border border-gray-200 hover:border-blue-300 transition-colors duration-200";
          card.setAttribute("data-req-id", req.id);
          
          const methodColors = {
            GET: 'bg-green-100 text-green-800',
            POST: 'bg-blue-100 text-blue-800',
            PUT: 'bg-yellow-100 text-yellow-800',
            DELETE: 'bg-red-100 text-red-800',
            PATCH: 'bg-purple-100 text-purple-800'
          };
          
          const methodColor = methodColors[req.method] || 'bg-gray-100 text-gray-800';
          
          card.innerHTML = `
            <div class="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
              <div class="flex items-center space-x-4">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${methodColor}">
                  ${sanitize(req.method)}
                </span>
                <span class="text-gray-600 text-sm">${new Date(req.timestamp).toLocaleString()}</span>
              </div>
              <button type="button" class="group p-2 hover:bg-red-50 rounded-full transition-colors duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 group-hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            <div class="px-6 py-4 space-y-4">
              <div>
                <h3 class="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Headers
                </h3>
                <pre class="bg-gray-50 rounded-lg p-4 text-sm overflow-x-auto"><code class="json">${sanitize(JSON.stringify(req.headers, null, 2))}</code></pre>
              </div>
              ${
                Object.keys(req.query).length
                  ? `<div>
                      <h3 class="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Query Parameters
                      </h3>
                      <pre class="bg-gray-50 rounded-lg p-4 text-sm overflow-x-auto">${sanitize(JSON.stringify(req.query, null, 2))}</pre>
                    </div>`
                  : ""
              }
              ${
                req.body &&
                ((typeof req.body === "object" && Object.keys(req.body).length > 0) || (typeof req.body === "string" && req.body.trim() !== ""))
                  ? `<div>
                      <h3 class="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                        </svg>
                        Body
                      </h3>
                      ${
                        req.headers["content-type"] && req.headers["content-type"].includes("application/json")
                          ? `<pre class="bg-gray-50 rounded-lg p-4 text-sm overflow-x-auto"><code class="json">${sanitize(JSON.stringify(req.body, null, 2))}</code></pre>`
                          : `<pre class="bg-gray-50 rounded-lg p-4 text-sm overflow-x-auto">${sanitize(req.body)}</pre>`
                      }
                    </div>`
                  : ""
              }
            </div>
          `;
          
          card.querySelector("button").addEventListener("click", () => removeRequest(card));
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
    paginationEl.className = "mt-6 flex justify-center items-center space-x-4";
    document.getElementById("requestsContainer").appendChild(paginationEl);
  }
  paginationEl.innerHTML = "";

  const prevBtn = document.createElement("button");
  prevBtn.className = `flex items-center px-4 py-2 text-sm font-medium rounded-lg border ${
    currentPage <= 1
      ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200'
      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300 hover:border-blue-300'
  } transition-colors duration-200`;
  prevBtn.innerHTML = `
    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
    </svg>
    Previous
  `;
  prevBtn.disabled = currentPage <= 1;
  prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderRequests();
    }
  });
  paginationEl.appendChild(prevBtn);

  const pageIndicator = document.createElement("span");
  pageIndicator.className = "text-sm text-gray-600 bg-white px-4 py-2 rounded-lg border border-gray-200";
  pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
  paginationEl.appendChild(pageIndicator);

  const nextBtn = document.createElement("button");
  nextBtn.className = `flex items-center px-4 py-2 text-sm font-medium rounded-lg border ${
    currentPage >= totalPages
      ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200'
      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300 hover:border-blue-300'
  } transition-colors duration-200`;
  nextBtn.innerHTML = `
    Next
    <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
    </svg>
  `;
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

// Delete all requests for this room from DB
function deleteAllRequestsFromDB() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const index = store.index("roomIdx");
    const keyRange = IDBKeyRange.only(roomId);
    const cursorRequest = index.openCursor(keyRange);
    
    cursorRequest.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    
    cursorRequest.onerror = () => reject("Error deleting all requests.");
    
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject("Transaction error when deleting all requests.");
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

// Clear all records
async function clearAllRecords() {
  if (confirm("Are you sure you want to clear all records? This action cannot be undone.")) {
    try {
      await deleteAllRequestsFromDB();
      currentPage = 1; // Reset to first page
      renderRequests();
    } catch (err) {
      console.error("Failed to clear records:", err);
      alert("Failed to clear records. Please try again.");
    }
  }
}

// Initialize DB and render stored requests.
openDB()
  .then(() => {
    renderRequests();
    
    // Add event listener for clear all records button
    const clearAllBtn = document.getElementById("clearAllRecords");
    if (clearAllBtn) {
      clearAllBtn.addEventListener("click", clearAllRecords);
    }
  })
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
