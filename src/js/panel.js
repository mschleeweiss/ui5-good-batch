renderjson.set_icons('+', '-');
renderjson.set_show_to_level("all");

document.addEventListener("DOMContentLoaded", function (event) {
    document.getElementById("clear-btn").addEventListener("click", (ev) => {
        document.getElementById("batch-list").innerHTML = "";
        document.getElementById("messagepage").classList.remove("hidden");
        const detailDiv = document.getElementById("resp-list");
        detailDiv.innerHTML = "";
    });
});

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
        for (let el of document.getElementsByClassName("selected")) {
            el.classList.remove("selected");
        }
        if (!entryDiv.classList.contains("selected")) {
            entryDiv.classList.add("selected");
        }
        showDetails(data);
    });
    entryDiv.append(timeSpan, pathSpan);

    const masterDiv = document.getElementById("batch-list");
    masterDiv.append(entryDiv);
    entryDiv.scrollIntoView({
        behavior: 'smooth',
    });
}

function showDetails(data) {
    const msgpageClasses = document.getElementById("messagepage").classList;

    if (!msgpageClasses.contains("hidden")) {
        msgpageClasses.add("hidden");
    }

    const detailDiv = document.getElementById("resp-list");
    detailDiv.scrollTop = 0;
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
        detailDiv.append(renderjson(data.respJSON[i] ?? data.respJSON[data.respJSON.length - 1]));
    });
}

chrome.devtools.network.onRequestFinished.addListener(request => {
    if (request.request && request.request.url) {
        if (request.request.url.includes('$batch')) {
            const pathname = new URL(request.request.url).pathname

            const reqBody = request.request.postData.text;
            const reqParts = extractBaseParts(reqBody);

            const reqTxts = reqParts
                .map((req) => req
                    .split(/[\r\n]+/)
                    .find(txt => txt.match(/^[GET|POST|PUT|DELETE]/)));

            request.getContent((body) => {
                console.log(body);
                const timestamp = new Date();
                const respJSON = extractRespParts(body);

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

function extractBaseParts(body) {
    return body
        .split(/--batch[\w-_]+/)
        .filter(x => !x.match(/^\s*$/));
}

function extractRespParts(body) {

    try {
        const decodedBody = atob(body);
        return extractBaseParts(decodedBody)
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
            .map((txt) => JSON.parse(txt));;
    } catch (error) {
        // body is not base64 but probably xml
        return [xml2json(body)];
    }
}