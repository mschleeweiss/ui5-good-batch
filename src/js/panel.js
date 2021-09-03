(() => {
    const rm = new RenderManager();

    chrome.devtools.network.onRequestFinished.addListener(async request => {
        if (request.request && request.request.url) {
            if (request.request.url.includes('$batch')) {
                const entry = new Entry(request);
                await entry.parse();
                console.log(entry);
                rm.renderEntry(entry);
            }
        }
    });
    
})();