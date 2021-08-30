renderjson.set_icons('+', '-');
renderjson.set_show_to_level("all");

const HTTP_SUCCESS_LO = 200;
const HTTP_SUCCESS_HI = 299;

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
    entryDiv.classList.add("entry");
    if (data.status < HTTP_SUCCESS_LO || HTTP_SUCCESS_HI < data.status) {
        entryDiv.classList.add("error");
    }
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

    data.requests.forEach((req, i) => {
        const txtDiv = document.createElement("div");
        txtDiv.className = "request";

        const matchGroups = req.txt.match(/^(DELETE|GET|POST|PUT)(.+)(HTTP\/.+)$/)
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
        if (req.bodyJSON) {
            detailDiv.append(renderjson(req.bodyJSON, "@request"));
        }
        detailDiv.append(renderjson(data.responses[i] ?? data.responses[data.responses.length - 1], "@response"));
    });
}

chrome.devtools.network.onRequestFinished.addListener(request => {
    if (request.request && request.request.url) {
        if (request.request.url.includes('$batch')) {
            const status = request.response.status;
            const pathname = new URL(request.request.url).pathname

            console.log(request);

            const reqBody = request.request.postData.text;
            const requests = extractReqParts(reqBody);

            request.getContent((body) => {
                const timestamp = new Date();
                const responses = extractRespParts(body);

                createEntry({
                    timestamp,
                    status,
                    pathname,
                    requests,
                    responses
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

function extractReqParts(body) {
    const atomicRequests = extractBaseParts(body);
    return atomicRequests
        .map((req) => {
            const reqLines = req
                .split(/[\r\n]+/);
            const txt =
                reqLines.find(txt => txt.match(/^[GET|POST|PUT|DELETE]/));
            const bodyTxt = reqLines.find(isJSON);
            const bodyJSON = bodyTxt ? JSON.parse(bodyTxt) : bodyTxt;

            return { txt, bodyJSON };
        });
}

function extractRespParts(body) {
    try {
        const decodedBody = atob(body);
        const atomicRequests = extractBaseParts(decodedBody);
        return atomicRequests
            .map((resp) => resp
                .split(/[\r\n]+/)
                .find(isJSON)
            )
            .map((txt) => JSON.parse(txt));;
    } catch (error) {
        // body is not base64 but probably xml
        return [xml2json(body)];
    }
}

function isJSON(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}