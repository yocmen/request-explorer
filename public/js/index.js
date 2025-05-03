function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("RequestDB", 2);
    request.onerror = () => reject("Error opening IndexedDB.");
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("requests")) {
        const store = db.createObjectStore("requests", { keyPath: "id" });
        store.createIndex("roomIdx", "room", { unique: false });
      }
    };
  });
}

function getDistinctRooms() {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction("requests", "readonly");
      const store = tx.objectStore("requests");
      const request = store.getAll();
      request.onsuccess = () => {
        const rooms = new Set();
        request.result.forEach((item) => {
          if (item.room) rooms.add(item.room);
        });
        resolve(Array.from(rooms));
      };
      request.onerror = () => reject("Error fetching requests.");
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("storedUrls");
  getDistinctRooms()
    .then((rooms) => {
      container.textContent = "";
      if (rooms.length > 0) {
        rooms.forEach((room) => {
          const urlContainer = document.createElement("div");
          urlContainer.className = "mb-3 border-b border-gray-100 pb-2";

          // Explorer link
          const explorerLink = document.createElement("a");
          explorerLink.href = "/explorer/" + room;
          explorerLink.textContent = window.location.origin + "/explorer/" + room;
          explorerLink.classList.add("block", "mb-1", "text-blue-600", "hover:text-blue-800");

          // Request URL info
          const requestUrl = document.createElement("div");
          requestUrl.textContent = "Send requests to: " + window.location.origin + "/r/" + room;
          requestUrl.classList.add("text-sm", "text-gray-600");

          urlContainer.appendChild(explorerLink);
          urlContainer.appendChild(requestUrl);
          container.appendChild(urlContainer);
        });
      } else {
        container.textContent = "No stored URLs found.";
      }
    })
    .catch((err) => {
      container.textContent = err;
    });
});
