import RenderManager from "./rendermanager.js";
import Entry from "./entry.js";

const rm = new RenderManager();

chrome.devtools.network.onRequestFinished.addListener(async request => {
    if (request.request && request.request.url) {
        if (request.request.url.includes('$batch')) {
            const entry = await Entry.build(request);
            rm.renderEntry(entry);
        }
    }
});