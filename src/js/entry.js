class Entry {
    timestamp;
    status;
    url;
    batchRequest;
    requests = [];
    responses = [];

    constructor(request) {
        this.batchRequest = request;
        this.timestamp = new Date();
        this.status = request.response.status;
        this.url = new URL(request.request.url);
    }

    async parse() {
        const reqBody = this.batchRequest.request.postData.text;
        this.requests = BatchParser.extractRequests(reqBody);

        const respBody = await BatchParser.getContent(this.batchRequest);
        this.responses = BatchParser.extractResponses(respBody);
    }
}

class BatchParser {

    static getContent(request) {
        return new Promise((resolve) => {
            request.getContent(resolve);
        });
    }

    static extractBase(body) {
        return body
            .split(/--batch[\w-_]+/)
            .filter(x => !x.match(/^\s*$/));
    }

    static extractRequests(body) {
        const atomicRequests = BatchParser.extractBase(body);
        return atomicRequests
            .map((req) => {
                const reqLines = req
                    .split(/[\r\n]+/);
                const txt =
                    reqLines.find(txt => txt.match(/^[GET|POST|PUT|DELETE]/));
                const bodyTxt = reqLines.find(BatchParser.isJSON);
                const bodyJSON = bodyTxt ? JSON.parse(bodyTxt) : bodyTxt;

                return { txt, bodyJSON };
            });
    }

    static extractResponses(body) {
        try {
            const decodedBody = atob(body);
            const atomicRequests = BatchParser.extractBase(decodedBody);
            return atomicRequests
                .map((resp) => resp
                    .split(/[\r\n]+/)
                    .find(BatchParser.isJSON)
                )
                .map((txt) => JSON.parse(txt));;
        } catch (error) {
            // body is not base64 but probably xml
            return [xml2json(body)];
        }
    }

    static isJSON(str) {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    }
}