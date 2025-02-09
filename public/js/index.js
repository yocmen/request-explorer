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
          const link = document.createElement("a");
          link.href = "/r/" + room;
          link.textContent = "http://localhost:3000/r/" + room;
          link.classList.add("block", "mb-1", "text-blue-600", "hover:text-blue-800");
          container.appendChild(link);
        });
      } else {
        container.textContent = "No stored URLs found.";
      }
    })
    .catch((err) => {
      container.textContent = err;
    });
});
