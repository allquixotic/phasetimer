import { Express, Request, Response, NextFunction, Handler } from 'express';
import ParamsDictionary from 'express-serve-static-core';
import {
    json,
    // raw,
    // text,
    // urlencoded,
} from 'body-parser';
import * as http from 'http';
import fs from 'fs';
import { IncomingMessage } from 'http';
import { compose } from 'compose-middleware';
import { IHub, Hub, ISseHubResponse, ISseResponse, sseHub, sse, ISseHubMiddlewareOptions, ISseMiddlewareOptions } from '@toverux/expresse';
const app : Express = require('express')();
const sessions = new Map<string, SessionData>();
const letters = Array.from({ length: 26 }, (_, i) => String.fromCharCode('a'.charCodeAt(0) + i));
const jsonParser = json();

interface Phase {
    name: string,
    duration: number
}

interface SessionData {
    key: string,
    lastused: number,
    currentPhase: number,
    phases: Phase[],
    hub : Hub
}

/**
 * SSE middleware that configures an Express response for an SSE session, installs `sse.*` functions on the Response
 * object, as well as the `sse.broadcast.*` variants.
 *
 * @param options An ISseMiddlewareOptions to configure the middleware's behaviour.
 */
function dynamicSseHub(options: Partial<ISseMiddlewareOptions> = {}): Handler {

    function middleware(req: Request, res: ISseResponse, next: NextFunction): void {
        let hub : IHub = sessions.get(req.body.toString()).hub;
        //=> Register the SSE functions of that client on the hub
        hub.register(res.sse);

        //=> Unregister the user from the hub when its connection gets closed (close=client, finish=server)
        res.once('close', () => hub.unregister(res.sse));
        res.once('finish', () => hub.unregister(res.sse));

        //=> Make hub's functions available on the response
        (res as ISseHubResponse).sse.broadcast = {
            data: hub.data.bind(hub),
            event: hub.event.bind(hub),
            comment: hub.comment.bind(hub),
        };

        //=> Done
        next();
    }

    return compose(sse(options), middleware);
}

function newSessionId() { 
    var ans = ''; 
    for (var i = 8; i > 0; i--) { 
        ans +=  
          letters[Math.floor(Math.random() * letters.length)]; 
    } 
    return ans; 
} 

function newKey() {
    var ans = ''; 
    for (var i = 128; i > 0; i--) { 
        ans +=  
          letters[Math.floor(Math.random() * letters.length)]; 
    } 
    return ans; 
}

function isAdmin(req : any) {
    let usid = req["sid"], ukey = req["key"];
    return (usid && ukey && sessions.has(usid) && ukey == sessions.get(usid).key);
}

function main() {

    app.get('/api/subscribeToChangeNotification', jsonParser, dynamicSseHub(), function(req, res: ISseResponse) {
        res.sse.comment('Connected to SSE!');
    });

    /*
    Advance Phase API request format:
    {
        "sid" : "asdfghjk",
        "key" : "mysecretkey"
    }
    */
    app.post('/api/advancePhase', jsonParser, function (req, res) {
        console.log("advancePhase REQUEST: %O", req.body);
        let advance = req.body;
        if(!isAdmin(advance)) {
            res.status(403);
            res.send("Unauthorized");
            return;
        }
        let usid = advance["sid"], bin = sessions.get(usid), cphase = bin.currentPhase, phases = bin.phases;
        if(Number.isInteger(cphase)) {
            bin.currentPhase = (cphase+1) % phases.length;
        }
        else {
            bin.currentPhase = 0;
        }
        console.log("Successful advancePhase: %O", bin);
        res.status(200);
        res.end();
        bin.hub.event('advancePhase', {
            sid: usid,
            currentPhase: bin.currentPhase
        });
    });

    /*
    Update API request format:
    {
        "sid" : "asdfghjk",
        "key" : "mysecretkey",
        "phases" : [
            {
                "name" : "foo",
                "duration" : 60
            },
            {
                "name" : "bar",
                "duration" : 30
            },
            {
                "name" : "baz",
                "duration" : 300
            }
        ]
    }

    Sessions map *value* format:
    {
        key: "mysecretkey",
        lastused: 0,
        currentPhase: 0,
        phases: [
            {
                name: "foo",
                duration: 60
            },
            {
                name: "bar",
                duration: 30
            },
            {
                name: "baz",
                duration: 300
            }
        ]
    }
    */
    app.post('/api/updateSession', jsonParser, function (req, res) {
        console.log("updateSession REQUEST: %O", req.body);
        let update = req.body;
        let usid = update["sid"], uphases = update["phases"], ukey = update["key"];
        var parsed : Phase[] = [];
        if(!isAdmin(update)) {
            res.status(403);
            res.send("Unauthorized");
            return;
        }

        if(uphases && Array.isArray(uphases)) {
            uphases.forEach(function (val, idx) {
                let uname : string = val.name.toString();
                let udur = val.duration;
                if(uname && udur && Number.isInteger(udur) && uname.length > 0) {
                    parsed.push({
                        name: uname,
                        duration: udur
                    });
                }
                else {
                    console.warn("Invalid update data passed in");
                    res.send("Error updating session data: Invalid item in array");
                    res.status(500);
                    return;
                }
            }, this);
            sessions.get(usid).phases = parsed;
            console.log("Successful updateSession: %O", sessions.get(usid));
            res.status(200);
            res.end();
        }
        else {
            console.warn("Invalid update data passed in");
            res.send("Error updating session data: Invalid JSON structure or data");
            res.status(500);
        }
    });

    app.get('/api/newSession', function (req, res) {
        let sid = newSessionId();
        let key = newKey();
        sessions.set(sid, {hub: new Hub(), key : key, lastused: Date.now(), currentPhase: 0, phases: []});
        res.json({ sid: sid, key: key});
        res.status(200);
        console.log("newSession: %s, %O", sid, sessions.get(sid));
    });


    app.use(express.static('public'));

    app.listen(43801);
}

main();