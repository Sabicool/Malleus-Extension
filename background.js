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
  let itemNumber;

  // Check if the URL matches the first pattern: https://emedici.com/app/share/question/____
  const matchShareQuestion = url.match(/https:\/\/emedici.com\/app\/share\/question\/(\d+)/);
  if (matchShareQuestion) {
    itemNumber = matchShareQuestion[1];
  } else {
    // Otherwise, locate the element with the text "Item #____"
    let tagElement = document.querySelector("div.px-sm.py-xs.color-muted.text-xs");
    itemNumber = tagElement ? tagElement.textContent.match(/\d+/)[0] : null;
  }

  if (itemNumber) {
    // Calculate the range for the itemNumber
    let lowerBound = Math.floor(itemNumber / 1000) * 1000;
    let upperBound = lowerBound + 999;
    let rangeTag = `${lowerBound}-${upperBound}`;

    // Construct the full tag-based query
    let query = `tag:#Malleus_CM::#Question_Banks::eMedici::${rangeTag}::${itemNumber}`;

    // Send the query to Anki-Connect via background script
    chrome.runtime.sendMessage({ action: "searchTag", query: query });
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
