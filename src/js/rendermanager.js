class RenderManager {

    masterList;
    detailList;
    clearButton;
    messagePage;

    renderer = new Renderer();

    constructor() {
        renderjson.set_icons('+', '-');
        renderjson.set_show_to_level("all");

        this.whenDOMReady().then(() => {
            this.masterList = document.getElementById("batch-list");
            this.detailList = document.getElementById("resp-list");
            this.clearButton = document.getElementById("clear-btn");
            this.messagePage = document.getElementById("messagepage");

            this.clearButton.addEventListener("click", (ev) => {
                this.masterList.innerHTML = "";
                this.detailList.innerHTML = "";
                this.messagePage.classList.remove("hidden");
            });
        });
    }

    whenDOMReady() {
        if (!this._domReadyPromise) {
            this._domReadyPromise = new Promise((resolve) => {
                document.addEventListener("DOMContentLoaded", resolve);
            });
        }
        return this._domReadyPromise;
    }

    /**
     * 
     * @param {Entry} entry 
     */
    async renderEntry(entry) {
        await this.whenDOMReady();
        const div = this._createEntry(entry);
        this.masterList.append(div);
        div.scrollIntoView({
            behavior: 'smooth',
        });
    }

    async renderEntryDetail(entry) {
        await this.whenDOMReady();
        const div = this._createEntryDetail(entry);

        if (!this.messagePage.classList.contains("hidden")) {
            this.messagePage.classList.add("hidden");
        }

        this.detailList.scrollTop = 0;
        this.detailList.innerHTML = "";

        entry.requests.forEach((req, i) => {
            const txtDiv = this._createEntryDetail(entry);

            this.detailList.append(txtDiv);
            if (req.bodyJSON) {
                this.detailList.append(renderjson(req.bodyJSON, "@request"));
            }
            this.detailList.append(renderjson(entry.responses[i] ?? entry.responses[entry.responses.length - 1], "@response"));
        });
    }

    _createEntry(entry) {
        const pathSpan = this.renderer.createElement({
            tag: "span",
            classList: ["path"],
            innerText: entry.url.pathname,
        });

        const timeSpan = this.renderer.createElement({
            tag: "span",
            classList: ["time"],
            innerText: this._formatTime(entry.timestamp),
        });

        return this.renderer.createElement({
            classList: ["entry", this._formatStatusClass(entry.status)],
            children: [timeSpan, pathSpan],
            events: {
                click: (ev) => {
                    for (let el of document.getElementsByClassName("selected")) {
                        el.classList.remove("selected");
                    }
                    if (!ev.target.classList.contains("selected")) {
                        ev.target.classList.add("selected");
                    }
                    showDetails(entry);
                }
            }
        });
    }

    _createEntryDetail(entry) {
        const matchGroups = req.txt.match(/^(DELETE|GET|POST|PUT)(.+)(HTTP\/.+)$/)
        const type = matchGroups[1];
        const path = matchGroups[2].trim();
        const version = matchGroups[3];

        const typeSpan = this.renderer.createElement({
            tag: "span",
            classList: ["tag", "type"],
            innerText: type,
        });

        const verSpan = this.renderer.createElement({
            tag: "span",
            classList: ["tag", "ver"],
            innerText: version,
        });

        const pathSpan = this.renderer.createElement({
            tag: "span",
            classList: ["path"],
            innerText: decodeURI(path),
        });

        const txtDiv = this.renderer.createElement({
            classList: ["request"],
            children: [typeSpan, verSpan, pathSpan],
        });

        return txtDiv;
    }

    _formatTime(date) {
        const timeString = date.toLocaleTimeString();
        const msString = date.getMilliseconds().toString().padStart(3, "0");
        return `${timeString}.${msString}`;
    }

    _formatStatusClass(status) {
        if (status < 200 || 299 < status) {
            return "error";
        }
        return "";
    }
}

class Renderer {

    /**
     * 
     * @returns {Node} Element node
     */
    createElement({
        tag = "div",
        classList = [],
        innerText = "",
        children = [],
        events = {}
    } = {}) {
        const el = document.createElement(tag);
        classList?.filter(Boolean).forEach(c => {
            el.classList.add(c);
        });
        el.innerText = innerText;
        el.append(...children);
        for (let ev in events) {
            el.addEventListener(ev, events[ev]);
        }
        return el;
    }
}