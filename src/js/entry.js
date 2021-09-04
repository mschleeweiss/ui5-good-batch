import { xml2json } from "./lib/xml2json.js"

export default class Entry {
    timestamp;
    status;
    url;
    batchRequest;
    requests = [];
    responses = [];

    /**
     * 
     * @param {Object} batchRequest 
     * @param {Object[]} requests 
     * @param {Object[]} responses 
     */
    constructor(batchRequest, requests, responses) {
        this.batchRequest = batchRequest;
        this.timestamp = new Date();
        this.status = batchRequest.response.status;
        this.url = new URL(batchRequest.request.url);
        this.requests = requests;
        this.responses = responses;
    }

    static async build(request) {
        const reqBody = request.request.postData.text;
        const requests = BatchParser.extractRequests(reqBody);

        const respBody = await BatchParser.getContent(request);
        const responses = BatchParser.extractResponses(respBody);

        return new Entry(request, requests, responses);
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