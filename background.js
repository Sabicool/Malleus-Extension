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

    if (url.includes("emedici.com/app/")) {
        if (url.includes("emedici.com/app/share/question/")) {
            // Existing eMedici case https://emedici.com/app/session/468628/8
            const itemNumber = url.match(/\/question\/(\d+)/)[1];
            if (itemNumber) {
                const lowerBound = Math.floor(itemNumber / 1000) * 1000;
                const rangeTag = `${lowerBound}-${lowerBound + 999}`;
                query = `tag:#Malleus_CM::#Question_Banks::eMedici::${rangeTag}::${itemNumber}*`;
            }
        } else if (url.includes("emedici.com/app/session/")) {
            let tagElement = document.querySelector("div.px-sm.py-xs.color-muted.text-xs");
            itemNumber = tagElement ? tagElement.textContent.match(/\d+/)[0] : null;

            if (itemNumber) {
                const lowerBound = Math.floor(itemNumber / 1000) * 1000;
                const rangeTag = `${lowerBound}-${lowerBound + 999}`;
                query = `tag:#Malleus_CM::#Question_Banks::eMedici::${rangeTag}::${itemNumber}*`;
            }
        }
    } else if (url.includes("malleuscm.notion.site")) {
        let tagElement;

        if (url.includes("=")) {
            // If URL contains an '=', use the specific selector path
            tagElement = document.querySelector(
                "#notion-app > div > div:nth-child(1) > div > div.notion-peek-renderer > div > div:nth-child(3) > div > div > div.whenContentEditable > div > div:nth-child(3) > div > div > div > div > div:nth-child(2) > div:nth-child(2) > div > div > div > div:nth-child(1) > div:nth-child(1) > div > div:nth-child(2) > div > div > div > div > span"
                //                "#notion-app > div > div.notion-overlay-container.notion-default-overlay-container > div:nth-child(2) > div > div:nth-child(2) > div:nth-child(2) > div > div > div.whenContentEditable > div > div:nth-child(3) > div > div > div > div > div:nth-child(2) > div:nth-child(2) > div > div > div > div:nth-child(1) > div:nth-child(1) > div > div:nth-child(2) > div > div > div > div > span"
            );
        } else {
            // Otherwise, use the general selector path
            tagElement = document.querySelector(
                "#notion-app > div > div:nth-child(1) > div > div:nth-child(1) > main > div > div > div.whenContentEditable > div > div:nth-child(3) > div > div > div > div > div:nth-child(2) > div:nth-child(2) > div > div > div > div:nth-child(1) > div:nth-child(1) > div > div:nth-child(2) > div > div > div > div > span"
            );
        }

        if (tagElement) {
            // Remove spaces and construct query
            query = `tag:${tagElement.textContent.replace(/\s+/g, '')}*`;
        }
    } else if (url.includes("tgldcdp.tg.org.au")) {
        // New eTG Complete case 
        const params = new URLSearchParams(url.split('?')[1]);
        const topicFile = params.get("topicfile"); // Extract the topicfile

        if (topicFile) {
            if (topicFile.includes('_')) {
                const parts = topicFile.split('_');

                // Handle cases with specific topicfile formats
                if (topicFile.startsWith("c_")) {
                    if (parts.length >= 3) {
                        // For cases like `c_DMG_Acne_topic_1`
                        // https://tgldcdp.tg.org.au/viewTopic?etgAccess=true&guidelinePage=Cardiovascular&topicfile=c_CVG_Hypertension-and-blood-pressure-reductiontopic_1&guidelinename=auto&sectionId=c_CVG_Hypertension-and-blood-pressure-reductiontopic_8#c_CVG_Hypertension-and-blood-pressure-reductiontopic_8
                        const sectionPart = parts[2].replace(/topic/, '');
                        query = `tag:#Malleus_CM* Source:*tgldcdp.tg.org.au*${sectionPart}*`;
                    }
                } else if (topicFile.includes("topic")) {
                    // For cases like `c_GIG_Ulcerative-colitis-in-adultstopic_1`
                    const sectionPart = parts[1].replace(/topic/, ''); // Get "Ulcerative-colitis-in-adults"
                    if (sectionPart) {
                        query = `tag:#Malleus_CM* Source:*tgldcdp.tg.org.au*${sectionPart}*`;
                    }
                }
            } else {
                // Handle cases like `brucellosis` or `acute-epiglottitis`
                query = `tag:#Malleus_CM* Source:*tgldcdp.tg.org.au*${topicFile}*`;
            }
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
