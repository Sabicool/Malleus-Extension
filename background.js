chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => {
      chrome.runtime.sendMessage({ action: "checkAnkiConnect" }, (response) => {
        if (response && response.success) {
          chrome.runtime.sendMessage({ action: "extractAndSearchTag" });
        } else {
          alert("Unable to connect to Anki-Connect. Please ensure Anki is running and Anki-Connect is set up correctly.");
        }
      });
    }
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkAnkiConnect") {
    fetch("http://localhost:8765", {
      method: "POST",
      body: JSON.stringify({ action: "version", version: 6 }),
      headers: { "Content-Type": "application/json" }
    })
      .then(response => response.json())
      .then(data => {
        sendResponse({ success: !data.error });
      })
      .catch(() => {
        sendResponse({ success: false });
      });
    return true;
  } else if (request.action === "extractAndSearchTag") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: extractAndSearchTag
      });
    });
    sendResponse({ success: true });
  } else if (request.action === "searchTag") {
    const query = request.query;
    guiBrowseInAnki(query);
  }
});

function extractAndSearchTag() {
  const url = window.location.href;
  let query;

  if (url.includes("emedici.com/app/share/question/")) {
    // Existing eMedici case
    const itemNumber = url.match(/\/question\/(\d+)/)[1];
    if (itemNumber) {
      const lowerBound = Math.floor(itemNumber / 1000) * 1000;
      const rangeTag = `${lowerBound}-${lowerBound + 999}`;
      query = `tag:#Malleus_CM::#Question_Banks::eMedici::${rangeTag}::${itemNumber}`;
    }
  } else if (url.includes("malleuscm.notion.site")) {
    // New Notion case for Malleus
    const tagElement = document.querySelector(
      "#notion-app > div > div:nth-child(1) > div > div:nth-child(1) > main > div > div > div.whenContentEditable > div > div:nth-child(3) > div > div > div > div > div:nth-child(2) > div:nth-child(2) > div > div > div > div:nth-child(1) > div:nth-child(1) > div > div:nth-child(2) > div > div > div > div > span"
    );
    if (tagElement) {
      query = `tag:${tagElement.textContent}*`;
    }
  }

  if (query) {
    // Send query to Anki
    chrome.runtime.sendMessage({ action: "searchTag", query });
  }
}

function guiBrowseInAnki(query) {
  fetch("http://localhost:8765", {
    method: "POST",
    body: JSON.stringify({
      action: "guiBrowse",
      version: 6,
      params: {
        query: query,
        reorderCards: {
          order: "descending",
          columnId: "noteCrt"
        }
      }
    }),
    headers: {
      "Content-Type": "application/json"
    }
  });
}
