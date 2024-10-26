// Notion API Class
class NotionSubjectAPI {
    constructor(databaseId, notionToken) {
        this.databaseId = databaseId;
        this.notionToken = notionToken;
        this.baseUrl = 'https://api.notion.com/v1';
    }

    async filterDatabase(filterText) {
        const endpoint = `${this.baseUrl}/databases/${this.databaseId}/query`;
        
        const headers = {
            'Authorization': `Bearer ${this.notionToken}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
        };

        const filterPayload = {
            filter: {
                property: 'Name',
                title: {
                    contains: filterText
                }
            }
        };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(filterPayload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const tagValues = data.results
                .map(page => {
                    const tagProperty = page.properties?.Tag;
                    if (tagProperty?.type === 'formula' && 
                        tagProperty.formula?.type === 'string' &&
                        tagProperty.formula.string) {
                        return tagProperty.formula.string;
                    }
                    return null;
                })
                .filter(tag => tag !== null);

            return tagValues;
        } catch (error) {
            console.error('Error querying Notion database:', error);
            return [];
        }
    }
}

class NotionEtgAPI {
    constructor(databaseId, notionToken) {
        this.databaseId = databaseId;
        this.notionToken = notionToken;
        this.baseUrl = 'https://api.notion.com/v1';
    }

    async filterDatabase(filterText) {
        const endpoint = `${this.baseUrl}/databases/${this.databaseId}/query`;
        
        const headers = {
            'Authorization': `Bearer ${this.notionToken}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
        };

        const filterPayload = {
            filter: {
                property: 'Name',
                title: {
                    contains: filterText
                }
            }
        };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(filterPayload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const tagValues = data.results
                .map(page => {
                    const tagProperty = page.properties?.Tag;
                    if (tagProperty?.type === 'formula' && 
                        tagProperty.formula?.type === 'string' &&
                        tagProperty.formula.string) {
                        return tagProperty.formula.string;
                    }
                    return null;
                })
                .filter(tag => tag !== null);

            return tagValues;
        } catch (error) {
            console.error('Error querying Notion database:', error);
            return [];
        }
    }
}

async function notionEtgApiQuery(topic) {
    const notionDatabaseId = '22282971487f4f559dce199476709b03';
    const notionToken = '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';

    const notion = new NotionEtgAPI(notionDatabaseId, notionToken);
    const tags = await notion.filterDatabase(topic);
    const prependedTags = tags.map(tag => `tag:${tag}`);
    return prependedTags.join(' or ');
}

async function notionSubjectApiQuery(title) {
    const notionDatabaseId = '2674b67cbdf84a11a057a29cc24c524f';
    const notionToken = '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';
    
    const notion = new NotionEtgAPI(notionDatabaseId, notionToken);
    const tags = await notion.filterDatabase(title);
    const prependedTags = tags.map(tag => `tag:${tag}`);
    return prependedTags.join(' or ');
}

function guiBrowseInAnki(query) {
    return fetch("http://localhost:8765", {
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "checkAnkiConnect") {
        fetch('http://localhost:8765', {
            method: 'POST',
            body: JSON.stringify({
                action: 'version',
                version: 6
            })
        })
            .then(response => response.json())
            .then(data => {
                sendResponse({ success: true });
            })
            .catch(error => {
                sendResponse({ success: false });
            });
        return true;
    }

    if (request.action === "makeNotionSubjectQuery") {
        notionSubjectApiQuery(request.title)
            .then(tag => {
                console.log('Query to send to Anki:', tag); // Debug log
                return guiBrowseInAnki(tag);
            })
            .then(() => {
                sendResponse({ success: true });
            })
            .catch(error => {
                console.error('Error:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    }
    
    if (request.action === "makeNotionEtgQuery") {
        notionEtgApiQuery(request.topic)
            .then(tag => {
                console.log('Query to send to Anki:', tag); // Debug log
                return guiBrowseInAnki(tag);
            })
            .then(() => {
                sendResponse({ success: true });
            })
            .catch(error => {
                console.error('Error:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true;
    }

    if (request.action === "makeQuery") {
        const query = request.query;
        if (query) {
            guiBrowseInAnki(query)
                .then(() => {
                    sendResponse({ success: true });
                })
                .catch(error => {
                    console.error('Error:', error);
                    sendResponse({ success: false, error: error.message });
                });
        } else {
            sendResponse({ success: false, error: "No query provided" });
        }
        return true;
    }
});

// Extension icon click handler
chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: injectScript
    });
});

// Context menu creation for right-click
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "ankiNotionSearch",
        title: "Search Malleus Deck",
        contexts: ["page"]
    });
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "ankiNotionSearch") {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: injectScript
        });
    }
});

// This function will be injected into the page
function injectScript() {
    const url = window.location.href;
    function extractAndSearchTag() {
        // eTG Case
        if (url.includes("tgldcdp.tg.org.au") || url.includes("tgldcdp-tg-org-au") || url.includes("eTGAccess=true")) {
            const topic = document.querySelector("body > div:nth-child(13) > div > ul > li")?.lastChild?.textContent.trim();
            if (topic) {
                console.log('Found topic:', topic);
                chrome.runtime.sendMessage({ 
                    action: "makeNotionEtgQuery", 
                    topic: topic 
                }, (response) => {
                    if (response && response.success) {
                        console.log('Successfully processed query');
                    } else {
                        console.error('Error processing query:', response?.error);
                    }
                });
            }
        }
        // eMedici case
        else if (url.includes("emedici.com/app/")) {
            console.log('emedici page');
            let query = null;

            if (url.includes("emedici.com/app/share/question/")) {
                const itemNumber = url.match(/\/question\/(\d+)/)[1];
                if (itemNumber) {
                    const lowerBound = Math.floor(itemNumber / 1000) * 1000;
                    const rangeTag = `${lowerBound}-${lowerBound + 999}`;
                    query = `tag:#Malleus_CM::#Question_Banks::eMedici::${rangeTag}::${itemNumber}*`;
                }
            } else if (url.includes("emedici.com/app/session/")) {
                let tagElement = document.querySelector("div.px-sm.py-xs.color-muted.text-xs");
                const itemNumber = tagElement ? tagElement.textContent.match(/\d+/)[0] : null;

                if (itemNumber) {
                    const lowerBound = Math.floor(itemNumber / 1000) * 1000;
                    const rangeTag = `${lowerBound}-${lowerBound + 999}`;
                    query = `tag:#Malleus_CM::#Question_Banks::eMedici::${rangeTag}::${itemNumber}`;
                }
            }

            if (query) {
                chrome.runtime.sendMessage({
                    action: "makeQuery",
                    query: query
                }, (response) => {
                    if (response && response.success) {
                        console.log('Successfully processed eMedici query');
                    } else {
                        console.error('Error processing eMedici query:', response?.error);
                    }
                });
            }
        }
        // Other cases just try use the title
        // Should add a source:{URL}
        // Should add multi database searching (e.g. pharmacology)
        // Maybe the order should be subjects -> pharmacology -> rotations
        else {
            const title = document.title.split(/[-•|:]/)[0].trim();
            console.log('other:', title);
            chrome.runtime.sendMessage({
                action: "makeNotionSubjectQuery",
                title: title 
            }, (response) => {
                if (response && response.success) {
                    console.log('Successfully processed query');
                } else {
                    console.error('Error processing query:', response?.error);
                }
            });
        }
    }

    // Then check Anki connection and call the function if connected
    chrome.runtime.sendMessage({ action: "checkAnkiConnect" }, (response) => {
        if (response && response.success) {
            extractAndSearchTag();
        } else {
            alert("Unable to connect to Anki-Connect. Please ensure Anki is running and Anki-Connect is set up correctly.");
        }
    });
}

//
// Old version for reference
//
// chrome.action.onClicked.addListener((tab) => {
//   chrome.scripting.executeScript({
//     target: { tabId: tab.id },
//     function: () => {
//       chrome.runtime.sendMessage({ action: "checkAnkiConnect" }, (response) => {
//         if (response && response.success) {
//           chrome.runtime.sendMessage({ action: "extractAndSearchTag" });
//         } else {
//           alert("Unable to connect to Anki-Connect. Please ensure Anki is running and Anki-Connect is set up correctly.");
//         }
//       });
//     }
//   });
// });
// 
// chrome.runtime.onInstalled.addListener(() => {
//     chrome.contextMenus.create({
//         id: "searchMalleusDeck",
//         title: "Search Malleus Anki deck",
//         contexts: ["page"]
//     });
// });
// 
// // Handle clicks on the context menu item
// chrome.contextMenus.onClicked.addListener((info, tab) => {
//     if (info.menuItemId === "searchMalleusDeck") {
//         // Execute the extract and search function in the active tab
//         chrome.scripting.executeScript({
//             target: { tabId: tab.id },
//             function: () => {
//                 chrome.runtime.sendMessage({ action: "checkAnkiConnect" }, (response) => {
//                     if (response && response.success) {
//                         chrome.runtime.sendMessage({ action: "extractAndSearchTag" });
//                     } else {
//                         alert("Unable to connect to Anki-Connect. Please ensure Anki is running and Anki-Connect is set up correctly.");
//                     }
//                 });
//             }
//         });
//     }
// });
// 
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.action === "checkAnkiConnect") {
//     fetch("http://localhost:8765", {
//       method: "POST",
//       body: JSON.stringify({ action: "version", version: 6 }),
//       headers: { "Content-Type": "application/json" }
//     })
//       .then(response => response.json())
//       .then(data => {
//         sendResponse({ success: !data.error });
//       })
//       .catch(() => {
//         sendResponse({ success: false });
//       });
//     return true;
//   } else if (request.action === "extractAndSearchTag") {
//     chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//       chrome.scripting.executeScript({
//         target: { tabId: tabs[0].id },
//         function: extractAndSearchTag
//       });
//     });
//     sendResponse({ success: true });
//   } else if (request.action === "searchTag") {
//     const query = request.query;
//     guiBrowseInAnki(query);
//   }
// });
// 
// async function extractAndSearchTag() {
//     const url = window.location.href;
//     let query;
// 
//     if (url.includes("emedici.com/app/")) {
//         if (url.includes("emedici.com/app/share/question/")) {
//             // Existing eMedici case https://emedici.com/app/session/468628/8
//             const itemNumber = url.match(/\/question\/(\d+)/)[1];
//             if (itemNumber) {
//                 const lowerBound = Math.floor(itemNumber / 1000) * 1000;
//                 const rangeTag = `${lowerBound}-${lowerBound + 999}`;
//                 query = `tag:#Malleus_CM::#Question_Banks::eMedici::${rangeTag}::${itemNumber}*`;
//             }
//         } else if (url.includes("emedici.com/app/session/")) {
//             let tagElement = document.querySelector("div.px-sm.py-xs.color-muted.text-xs");
//             itemNumber = tagElement ? tagElement.textContent.match(/\d+/)[0] : null;
// 
//             if (itemNumber) {
//                 const lowerBound = Math.floor(itemNumber / 1000) * 1000;
//                 const rangeTag = `${lowerBound}-${lowerBound + 999}`;
//                 query = `tag:#Malleus_CM::#Question_Banks::eMedici::${rangeTag}::${itemNumber}*`;
//             }
//         }
//     } else if (url.includes("malleuscm.notion.site")) {
//         let tagElement;
// 
//         if (url.includes("=")) {
//             // If URL contains an '=', use the specific selector path
//             tagElement = document.querySelector(
//                 "#notion-app > div > div:nth-child(1) > div > div.notion-peek-renderer > div > div:nth-child(3) > div > div > div.whenContentEditable > div > div:nth-child(3) > div > div > div > div > div:nth-child(2) > div:nth-child(2) > div > div > div > div:nth-child(1) > div:nth-child(1) > div > div:nth-child(2) > div > div > div > div > span"
//                 //                "#notion-app > div > div.notion-overlay-container.notion-default-overlay-container > div:nth-child(2) > div > div:nth-child(2) > div:nth-child(2) > div > div > div.whenContentEditable > div > div:nth-child(3) > div > div > div > div > div:nth-child(2) > div:nth-child(2) > div > div > div > div:nth-child(1) > div:nth-child(1) > div > div:nth-child(2) > div > div > div > div > span"
//             );
//         } else {
//             // Otherwise, use the general selector path
//             tagElement = document.querySelector(
//                 "#notion-app > div > div:nth-child(1) > div > div:nth-child(1) > main > div > div > div.whenContentEditable > div > div:nth-child(3) > div > div > div > div > div:nth-child(2) > div:nth-child(2) > div > div > div > div:nth-child(1) > div:nth-child(1) > div > div:nth-child(2) > div > div > div > div > span"
//             );
//         }
// 
//         if (tagElement) {
//             // Remove spaces and construct query
//             query = `tag:${tagElement.textContent.replace(/\s+/g, '')}*`;
//         }
//     } else if (url.includes("tgldcdp.tg.org.au") || url.includes("tgldcdp-tg-org-au") || url.includes("eTGAccess=true")) {
//         // New eTG Complete case
//         try {
//             const urlObject = new URL(url);
//             const params = new URLSearchParams(urlObject.search);
//             const topicFile = params.get("topicfile"); // Extract the topicfile
// 
//             // Use query selectors for the guideline and topic elements
//             const guideline = document.querySelector("body > div:nth-child(13) > div > ul > li > a:nth-child(2)");
//             const topic = document.querySelector("body > div:nth-child(13) > div > ul > li")?.lastChild?.textContent.trim();
//             console.log('Found topic:', topic);
//             const tag = await notionApiQuery(topic);
//             console.log('Generated tag:', tag); // Debug log
//             query = tag;
//             
//             // if (guideline && topic) {
//             //     // Construct the query using the guideline and topic
//             //     const guidelineTag = guideline.textContent.trim().replace(/\s+/g, '_');
//             //     const topicTag = topic.replace(/\s+/g, '_');
//             //     query = `tag:#Malleus_CM::#eTG_Complete::${guidelineTag}::*${topicTag}*`;
//             // }
//             // // Fallback to using the source field if guideline and topic aren't available
//             // else if (topicFile) {
//             //     if (topicFile.includes('_')) {
//             //         const parts = topicFile.split('_');
// 
//             //         if (topicFile.startsWith("c_")) {
//             //             if (parts.length >= 3) {
//             //                 // For cases like `c_DMG_Acne_topic_1`
//             //                 const sectionPart = parts[2].replace(/topic/, '');
//             //                 query = `tag:#Malleus_CM* Source:*tgldcdp.tg.org.au*${sectionPart}*`;
//             //             }
//             //         } else if (topicFile.includes("topic")) {
//             //             // For cases like `c_GIG_Ulcerative-colitis-in-adultstopic_1`
//             //             const sectionPart = parts[1].replace(/topic/, '');
//             //             if (sectionPart) {
//             //                 query = `tag:#Malleus_CM* Source:*tgldcdp.tg.org.au*${sectionPart}*`;
//             //             }
//             //         }
//             //     } else {
//             //         // Handle cases like `brucellosis` or `acute-epiglottitis`
//             //         query = `tag:#Malleus_CM* Source:*tgldcdp.tg.org.au*${topicFile}*`;
//             //     }
//             // }
//         } catch (error) {
//             console.error("Error constructing query:", error);
//         }
//     }
// 
//     if (query) {
//         // Send query to Anki
//         chrome.runtime.sendMessage({ action: "searchTag", query });
//     }
// }
// 
// function guiBrowseInAnki(query) {
//   fetch("http://localhost:8765", {
//     method: "POST",
//     body: JSON.stringify({
//       action: "guiBrowse",
//       version: 6,
//       params: {
//         query: query,
//         reorderCards: {
//           order: "descending",
//           columnId: "noteCrt"
//         }
//       }
//     }),
//     headers: {
//       "Content-Type": "application/json"
//     }
//   });
// }
