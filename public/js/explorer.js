// Add sanitization helper to prevent XSS.
function sanitize(input) {
  if (typeof input !== "string") {
    input = JSON.stringify(input, null, 2);
  }
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const roomId = document.querySelector("h1").dataset.roomId;
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
      warning.className = "bg-yellow-100 border-l-4 border-yellow-500 p-4 text-yellow-700";
      warning.textContent = "No requests received yet.";
      container.appendChild(warning);
    } else {
      const requests = await getRequestsPage(currentPage, pageSize);
      requests
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .forEach((req) => {
          const card = document.createElement("div");
          card.className = "bg-white rounded-lg shadow-md mb-4";
          card.setAttribute("data-req-id", req.id);
          card.innerHTML = `
            <div class="flex justify-between items-center p-4 border-b">
              <span><strong>${sanitize(req.method)}</strong> at ${new Date(req.timestamp).toLocaleString()}</span>
              <button type="button" class="text-gray-500 hover:text-gray-700" aria-label="Close">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 011.414 1.414L11.414 10l4.293 4.293a1 1 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 01-1.414-1.414L8.586 10 4.293 5.707a1 1 010-1.414z" clip-rule="evenodd"/>
                </svg>
              </button>
            </div>
            <div class="p-4">
              <p class="font-semibold mb-2">Headers:</p>
              <pre class="bg-gray-50 p-2 rounded">${sanitize(JSON.stringify(req.headers, null, 2))}</pre>
              ${
                Object.keys(req.query).length
                  ? `<p class="font-semibold mt-4 mb-2">Query Parameters:</p><pre class="bg-gray-50 p-2 rounded">${sanitize(
                      JSON.stringify(req.query, null, 2)
                    )}</pre>`
                  : ""
              }
              ${
                req.body && Object.keys(req.body).length
                  ? `<p class="font-semibold mt-4 mb-2">Body:</p>
                     ${
                       req.headers["content-type"] && req.headers["content-type"].includes("application/json")
                         ? `<pre class="bg-gray-50 p-2 rounded">${sanitize(JSON.stringify(req.body, null, 2))}</pre>`
                         : `<pre class="bg-gray-50 p-2 rounded">${sanitize(req.body)}</pre>`
                     }`
                  : ""
              }
            </div>
          `;
          container.appendChild(card);
          const closeBtn = card.querySelector("button");
          closeBtn.addEventListener("click", () => removeRequest(card));
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
  prevBtn.className = "bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50";
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
  pageIndicator.className = "text-gray-700";
  pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
  paginationEl.appendChild(pageIndicator);

  const nextBtn = document.createElement("button");
  nextBtn.className = "bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50";
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
