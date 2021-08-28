renderjson.set_icons('+', '-');
renderjson.set_show_to_level("all");

function createEntry(data) {
    const pathSpan = document.createElement("span");
    pathSpan.className = "path";
    pathSpan.innerText = data.pathname;

    const timeSpan = document.createElement("span");
    timeSpan.className = "time";
    const timeEm = document.createElement("em");
    const timeString = data.timestamp.toLocaleTimeString();
    const msString = data.timestamp.getMilliseconds().toString().padStart(3, "0");
    timeEm.innerText = `${timeString}.${msString}`;
    timeSpan.append(timeEm.innerText);

    const entryDiv = document.createElement("div");
    entryDiv.className = "entry";
    entryDiv.addEventListener("click", (ev) => {
        ;
        for (let el of document.getElementsByClassName("selected")) {
            el.classList.remove("selected");
        }
        if (!entryDiv.classList.contains("selected")) {
            entryDiv.classList.add("selected");
        }
        showDetails(data);
    });
    entryDiv.append(timeSpan, pathSpan);

    const masterDiv = document.getElementById("master");
    if (masterDiv.innerHTML.trim().length > 0) {
        masterDiv.append(document.createElement("hr"));
    }
    masterDiv.append(entryDiv);
    entryDiv.scrollIntoView({
        behavior: 'smooth',
    });
}

function showDetails(data) {

    const detailDiv = document.getElementById("detail");
    detailDiv.innerHTML = "";

    data.reqTxts.forEach((txt, i) => {
        const txtDiv = document.createElement("div");
        txtDiv.className = "request"

        const matchGroups = txt.match(/^(DELETE|GET|POST|PUT)(.+)(HTTP\/.+)$/)
        const type = matchGroups[1];
        const path = matchGroups[2].trim();
        const version = matchGroups[3];

        const typeSpan = document.createElement("span");
        typeSpan.className = "tag type";
        typeSpan.innerText = type;

        const verSpan = document.createElement("span");
        verSpan.className = "tag ver";
        verSpan.innerText = version;

        const pathSpan = document.createElement("span");
        pathSpan.innerText = decodeURI(path);
        pathSpan.className = "path"
        txtDiv.append(typeSpan, verSpan, pathSpan);

        detailDiv.append(txtDiv);
        detailDiv.append(renderjson(data.respJSON[i]));
    });
}

chrome.devtools.network.onRequestFinished.addListener(request => {
    if (request.request && request.request.url) {
        if (request.request.url.includes('$batch')) {
            const pathname = new URL(request.request.url).pathname

            const reqBody = request.request.postData.text;
            const reqParts = extractParts(reqBody);

            const reqTxts = reqParts
                .map((req) => req
                    .split(/[\r\n]+/)
                    .find(txt => txt.match(/^[GET|POST|PUT|DELETE]/)));

            request.getContent((body) => {
                const timestamp = new Date();
                const respParts = extractParts(atob(body));
                const respJSON = respParts
                    .map((resp) => resp
                        .split(/[\r\n]+/)
                        .find(str => {
                            try {
                                JSON.parse(str);
                            } catch (e) {
                                return false;
                            }
                            return true;
                        })
                    )
                    .map((txt) => JSON.parse(txt));

                createEntry({
                    timestamp,
                    pathname,
                    reqTxts,
                    respJSON
                });
            })
        }
    }
});

function extractParts(body) {
    return body
        .split(/--batch[\w-_]+/)
        .filter(x => !x.match(/^\s*$/));
}