const NOTION_DATABASES = {
    subjects: '2674b67cbdf84a11a057a29cc24c524f',
    pharmacology: '9ff96451736d43909d49e3b9d60971f8',
    etg: '22282971487f4f559dce199476709b03',
    // Add more database IDs as needed
};

// Notion API token (public token with read only access)
const NOTION_TOKEN = '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';

// Notion API Class - regular filter by name and grab tag property
class NotionAPI {
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

    formatFilterText(text) {
        return text.trim().replace(/\s+/g, '_');
    }

    async filterDatabaseByTwoTags(filterText1, filterText2) {
        const endpoint = `${this.baseUrl}/databases/${this.databaseId}/query`;
        
        // Format both input strings
        const formattedText1 = this.formatFilterText(filterText1);
        const formattedText2 = this.formatFilterText(filterText2);

        const headers = {
            'Authorization': `Bearer ${this.notionToken}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
        };

        // Updated filter to search for both terms in the Tag property
        const filterPayload = {
            filter: {
                and: [
                    {
                        property: 'Tag',
                        formula: {
                            string: {
                                contains: formattedText1
                            }
                        }
                    },
                    {
                        property: 'Tag',
                        formula: {
                            string: {
                                contains: formattedText2
                            }
                        }
                    }
                ]
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

class NotionIdAPI {
    constructor(databaseId, notionToken) {
        this.databaseId = databaseId;
        this.notionToken = notionToken;
        this.baseUrl = 'https://api.notion.com/v1';
    }

    formatPageId(pageId) {
        // Remove any existing hyphens and format the ID
        const cleanId = pageId.replace(/-/g, '');
        return [
            cleanId.slice(0, 8),
            cleanId.slice(8, 12),
            cleanId.slice(12, 16),
            cleanId.slice(16, 20),
            cleanId.slice(20)
        ].join('-');
    }

    async getPageTag(pageId) {
        const formattedPageId = this.formatPageId(pageId);
        const endpoint = `${this.baseUrl}/pages/${formattedPageId}`;
        
        const headers = {
            'Authorization': `Bearer ${this.notionToken}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
        };

        try {
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: headers
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const tagProperty = data.properties?.Tag;

            if (tagProperty?.type === 'formula' && 
                tagProperty.formula?.type === 'string' && 
                tagProperty.formula.string) {
                return tagProperty.formula.string;
            }

            return null;
        } catch (error) {
            console.error('Error fetching Notion page:', error);
            return null;
        }
    }
}

// Needs to be separate because it will be searching using two variables
// And filter will be based of tags not title
async function notionEtgApiQuery(topic, guideline) {
    const notion = new NotionEtgAPI(NOTION_DATABASES.etg, NOTION_TOKEN);
    const tags = await notion.filterDatabaseByTwoTags(topic, guideline);
    const flattenedList = tags
          .flat(2)  // Flatten nested arrays
          .join(' ') // Join everything with spaces
          .split(' ') // Split into individual words
          .filter(word => word.trim().length > 0); // Remove empty strings
    
    // Add 'tag:' prefix and join with 'or'
    const prependedTags = flattenedList.map(tag => `tag:${tag.trim()}*`);
    return prependedTags.join(' or ');
}

async function notionApiQuery(title, databaseId) {
    const notion = new NotionAPI(databaseId, NOTION_TOKEN);
    const tags = await notion.filterDatabase(title);
    const flattenedList = tags
          .flat(2)  // Flatten nested arrays
          .join(' ') // Join everything with spaces
          .split(' ') // Split into individual words
          .filter(word => word.trim().length > 0); // Remove empty strings
    
    // Add 'tag:' prefix and join with 'or'
    const prependedTags = flattenedList.map(tag => `tag:${tag.trim()}*`);
    return prependedTags.join(' or ');
}

async function notionIdQuery(id, databaseId) {
    const notion = new NotionIdAPI(databaseId, NOTION_TOKEN);
    const tags = await notion.getPageTag(id);
    const flattenedList = tags
          //.flat(2)  // Flatten nested arrays
          //.join(' ') // Join everything with spaces
          .split(' ') // Split into individual words
          .filter(word => word.trim().length > 0); // Remove empty strings
    
    // Add 'tag:' prefix and join with 'or'
    const prependedTags = flattenedList.map(tag => `tag:${tag.trim()}*`);
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

function appendUrlToQuery(tagQuery, url) {
    if (!tagQuery) {
        return `source:*${url}*`; // If no tags found, just search by URL
    }
    return `${tagQuery} or source:*${url}*`; // Combine tags with URL search
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
    
    if (request.action === "makeNotionQuery") {
        const { title, databases = ['subjects'], url } = request; // Default to subjects database
        
        // Map over requested databases and get all tags
        Promise.all(databases.map(db => notionApiQuery(title, NOTION_DATABASES[db])))
            .then(results => {
                // Filter out empty results and combine with OR
                const validResults = results.filter(Boolean);
                let combinedTags = validResults.map(tags => `${tags}`).join(' or ');
                
                 // Add URL if provided
                if (url) {
                    combinedTags = appendUrlToQuery(combinedTags, url);
                }

                if (request.other) {
                    combinedTags = `(${combinedTags}) ${request.other}`;
                }
                
                console.log('Query to send to Anki:', combinedTags);
                return guiBrowseInAnki(combinedTags);
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
        notionEtgApiQuery(request.topic, request.guideline)
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
    
    if (request.action === "makeNotionIdQuery") {
        notionIdQuery(request.id)
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

// Create both context menu items on installation
chrome.runtime.onInstalled.addListener(() => {
    // Menu item for page context
    chrome.contextMenus.create({
        id: "ankiNotionSearch",
        title: "Search Malleus Deck",
        contexts: ["page"]
    });

    // Menu item for selection context
    chrome.contextMenus.create({
        id: "MalleusHighlightedSearch",
        title: "Search Malleus with Selected Text",
        contexts: ["selection"]
    });
});

// Combined context menu click handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "ankiNotionSearch") {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: injectScript
        });
    }
    else if (info.menuItemId === "MalleusHighlightedSearch") {
        const title = info.selectionText
              .split(/[-•|:,;()[\]{}]/)[0] // Split on common separators
              .trim()                      // Remove leading/trailing whitespace
              .replace(/\s+/g, ' ');       // Multiple spaces → Single space
        const databases = ['subjects', 'pharmacology'];
        console.log('selected text:', title);
        Promise.all(databases.map(db => notionApiQuery(title, NOTION_DATABASES[db])))
            .then(results => {
                // Filter out empty results and combine with OR
                const validResults = results.filter(Boolean);
                let combinedTags = validResults.map(tags => `${tags}`).join(' or ');
                
                console.log('Query to send to Anki:', combinedTags);
                return guiBrowseInAnki(combinedTags);
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }
});

function getNotionId(url) {
  try {
    // Create a URL object to parse the URL
    const urlObj = new URL(url);
    
    // Regular expression to match a 32-character hex string
    const idRegex = /^[a-f0-9]{32}$/i;
    
    // First check the 'p' parameter
    const pValue = urlObj.searchParams.get('p');
    if (pValue && idRegex.test(pValue)) {
      return pValue;
    }
    
    // If no valid ID in 'p' parameter, check the path
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];
    
    // Look for a 32-character hex ID in the last path segment
    const pathMatch = lastSegment.match(/[a-f0-9]{32}/i);
    return pathMatch ? pathMatch[0] : null;
    
  } catch (error) {
    console.error('Error parsing Notion URL:', error);
    return null;
  }
}

// This function will be injected into the page
function injectScript() {
    const url = window.location.href;
    function extractAndSearchTag() {
        // eTG Case
        if (url.includes("tgldcdp.tg.org.au") || url.includes("tgldcdp-tg-org-au") || url.includes("eTGAccess=true")) {
            const guidelineElement = document.querySelector("body > div:nth-child(13) > div > ul > li > a:nth-child(2)");
            const topicElement = document.querySelector("body > div:nth-child(13) > div > ul > li")?.lastChild;
            
            // Extract text content from the elements
            const guideline = guidelineElement?.textContent?.trim() || '';
            const topic = topicElement?.textContent?.trim() || '';

            if (topic && guideline) {
                console.log('Found topic:', topic);
                console.log('Found guideline:', guideline);
                chrome.runtime.sendMessage({ 
                    action: "makeNotionEtgQuery", 
                    topic: topic, 
                    guideline: guideline
                }, (response) => {
                    if (response && response.success) {
                        console.log('Successfully processed query');
                    } else {
                        console.error('Error processing query:', response?.error);
                    }
                });
            } else {
                console.error('Could not find topic or guideline text');
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
        // RCH Case
        // Can be improved to search the guideline database explicitly
        // If going to use SubjectQuery, it should also filter to 
        // pages that have the rotation page set to paediatrics, although
        // this is somewhat accounted for using the other bit in the request
        else if (url.includes("www.rch.org.au/clinicalguide/")) {
            const RCHtitle = document.title.split(":")[1]?.trim();
            console.log('RCH:', RCHtitle);
            chrome.runtime.sendMessage({
                action: "makeNotionQuery",
                title: RCHtitle ,
                url: url,
                other: "and tag:#Malleus_CM::#Resources_by_Rotation::Paediatrics"
            }, (response) => {
                if (response && response.success) {
                    console.log('Successfully processed query');
                } else {
                    console.error('Error processing query:', response?.error);
                }
            });
        }
        // AMH Case
        else if (url.includes("amhonline")) {
            const title = document.title.split(/[-•|:]/)[0].trim();
            console.log('AMH:', title);
            chrome.runtime.sendMessage({
                action: "makeNotionQuery",
                title: title ,
                databases: ['pharmacology'],
                url: url
            }, (response) => {
                if (response && response.success) {
                    console.log('Successfully processed query');
                } else {
                    console.error('Error processing query:', response?.error);
                }
            });
        }
        // Notion Case
        // The idea would be to use the URL to find the page ID
        // https://malleuscm.notion.site/Endocrinology-d9c128f56c484a57935f0d58f52f347e
        //https://malleuscm.notion.site/1caec2ba44be41d5a4ed8a4d998c42df?v=28001b9a3cc34588b35c6628ea1a94f1&p=513802503cd7404dadf4f830172f2e54&pm=s
        //https://malleuscm.notion.site/05-Antidotes-and-antivenoms-513802503cd7404dadf4f830172f2e54
        // The page ID can then be used to query all the databases
        // Some page IDs do not work but unable to determine why this is the case
        else if (url.includes("malleuscm.notion.site")) {
            let id = null;
            const urlObj = new URL(url);
            
            // Regular expression to match a 32-character hex string
            const idRegex = /^[a-f0-9]{32}$/i;
            
            // First check the 'p' parameter
            const pValue = urlObj.searchParams.get('p');
            if (pValue && idRegex.test(pValue)) {
                id = pValue;
            }
            // Only check the path if we didn't find a valid ID in the 'p' parameter
            else {
                // If no valid ID in 'p' parameter, check the path
                const pathSegments = urlObj.pathname.split('/').filter(Boolean);
                const lastSegment = pathSegments[pathSegments.length - 1];
                
                // Look for a 32-character hex ID in the last path segment
                const pathMatch = lastSegment.match(/[a-f0-9]{32}/i);
                id = pathMatch?.[0] || null;
            }
            
            console.log('Notion page id:', id);
            chrome.runtime.sendMessage({
                action: "makeNotionIdQuery",
                id: id,
                databases: ['subjects', 'pharmacology']
            }, (response) => {
                if (response && response.success) {
                    console.log('Successfully processed query');
                } else {
                    console.error('Error processing query:', response?.error);
                }
            });
        }
        // Other cases just try use the title
        // Should add a source:{URL}
        // Should add multi database searching (e.g. pharmacology)
        // Maybe the order should be subjects -> pharmacology -> rotations
        else {
            const title = document.title.split(/[-•|:]/)[0].trim();
            console.log('other:', title);
            chrome.runtime.sendMessage({
                action: "makeNotionQuery",
                title: title ,
                databases: ['subjects', 'pharmacology'],
                url: url
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
