import { Express, Request, Response, NextFunction, Handler } from 'express';
import {
    json,
    // raw,
    // text,
    // urlencoded,
} from 'body-parser';
import { compose } from 'compose-middleware';
import { IHub, Hub, ISseHubResponse, ISseResponse, sseHub, sse, ISseHubMiddlewareOptions, ISseMiddlewareOptions } from '@toverux/expresse';
import * as DB from 'better-sqlite3-helper';
import * as rateLimit from 'express-rate-limit';
import { Phase, AnonAuthData, AdminAuthData, UpdateSessionData, PublicSessionData } from '../../api/index';
const express = require('express');
const app : Express = require('express')();
const sessions = new Map<string, SessionData>();
const letters = Array.from({ length: 26 }, (_, i) => String.fromCharCode('a'.charCodeAt(0) + i));
const jsonParser = json();
const crypto = require('crypto');

interface SessionData {
    key: string,
    lastUsed: number,
    currentPhase: number,
    phases: Phase[],
    hub : Hub
}

/*
In-memory `sessions` map *value* format:
{
    key: "mysecretkey",
    lastUsed: 0,
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

/**
 * PERSISTENCE LAYER - Sqlite3
 */
//try{require('fs').mkdirSync("data");}catch{}
const db : DB.BetterSqlite3Helper.DBInstance = DB.default({
    path: "./data/sessions.db",
    memory: false,
    readonly: false,
    fileMustExist: false,
    WAL: true,
    migrate: false
});

function initDb() {
    db.run("CREATE TABLE IF NOT EXISTS sessions (sid TEXT PRIMARY KEY, key TEXT NOT NULL, lastUsed INTEGER NOT NULL, currentPhase INTEGER NOT NULL)");
    db.run("CREATE TABLE IF NOT EXISTS phases (sid TEXT, name TEXT NOT NULL, duration INTEGER NOT NULL, PRIMARY KEY(sid, name), FOREIGN KEY (sid) REFERENCES sessions (sid) ON DELETE CASCADE ON UPDATE NO ACTION)");
    db.checkpoint();
}

function storeSession(sid : string, data : SessionData) {
    sessions.set(sid, data);
    //This isn't too insecure because the data.key is actually the sha256 (base64'ed) hash of the original key; only the client can persist the key
    db.run("REPLACE INTO sessions (sid, key, lastUsed, currentPhase) VALUES (?, ?, ?, ?)", sid, data.key, data.lastUsed, data.currentPhase);
    db.run("DELETE FROM phases WHERE sid=?", sid);
    let stmt = db.prepare("REPLACE INTO phases (sid, name, duration) VALUES (?, ?, ?)");
    if(data.phases) {
        data.phases.forEach((phase) => {
            stmt.run(sid, phase.name, phase.duration);
        });
    }
}

function advancePhaseInDb(sid: string, phase: number) {
    db.update("sessions", {currentPhase: phase}, {sid: sid});
}

function reconstitute() {
    let sesns = db.queryIterate("SELECT * FROM sessions");
    for(const row of sesns) {
        let phazes : Phase[] = [];
        let phas = db.queryIterate("SELECT * FROM phases");
        for(const pha of phas) {
            phazes.push({name: pha.name, duration: pha.duration});
        }
        let sess : SessionData = {
            key: row.key,
            lastUsed: row.lastUsed,
            currentPhase: row.currentPhase,
            phases: phazes,
            hub: new Hub()
        };
        sessions.set(row.sid, sess);
    }
}

/**
 * Express middleware for rate limiting. This one is used for newSession.
 */
const limiter = rateLimit.default({
    windowMs: 60 * 1000,
    max: 5 //5 calls every 60 seconds
});

/**
 * SSE middleware that configures an Express response for an SSE session, installs `sse.*` functions on the Response
 * object, as well as the `sse.broadcast.*` variants.
 *
 * @param options An ISseMiddlewareOptions to configure the middleware's behaviour.
 */
function dynamicSseHub(options: Partial<ISseMiddlewareOptions> = {}): Handler {

    function middleware(req: Request, res: ISseResponse, next: NextFunction): void {
        let reqobj = req.body as AnonAuthData;
        let hub : IHub = sessions.get(reqobj.sid).hub;
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

function getPublicSessionData(sid: string) : PublicSessionData {
    let tmp = sessions.get(sid);
    return tmp ? {
        sid: sid,
        lastUsed: tmp.lastUsed,
        currentPhase: tmp.currentPhase,
        phases: tmp.phases
    } : null;
}

function newSessionId() { 
    let ans = ''; 
    do {
        for (let i = 12; i > 0; i--) { 
            ans +=  
            letters[Math.floor(Math.random() * letters.length)]; 
        }
    }
    while(sessions.has(ans));
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

function keyHash(key: string) : string {
    let hash = crypto.createHash('sha256').update(key).digest('base64');
    return hash;
}

function isAdmin(req : AdminAuthData) {
    let usid = req["sid"], ukey = req["key"];
    return (usid && ukey && sessions.has(usid) && keyHash(ukey) == sessions.get(usid).key);
}

export function main() {

    //Brings previous sessions back in with empty Hub
    initDb();
    reconstitute();

    app.set('trust proxy', 1);

    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "phasetimer.cc"); // update to match the domain you will make the request from
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
      });

    app.post('/api/subscribeToChangeNotification', jsonParser, dynamicSseHub(), function(req, res: ISseResponse) {
        res.sse.comment('Connected to SSE!');
    });

    app.post('/api/advancePhase', jsonParser, function (req, res) {
        let request = req.body as AdminAuthData;
        console.log("advancePhase REQUEST: %O", request);
        if(!isAdmin(request)) {
            res.status(403);
            res.send("Unauthorized");
            return;
        }
        let usid = request.sid, bin = sessions.get(usid), cphase = bin.currentPhase, phases = bin.phases;
        if(Number.isInteger(cphase)) {
            bin.currentPhase = (cphase+1) % phases.length;
        }
        else {
            bin.currentPhase = 0;
        }
        bin.lastUsed = Date.now();
        advancePhaseInDb(usid, bin.currentPhase);
        console.log("Successful advancePhase: %O", bin);
        res.status(200);
        res.end();
        bin.hub.event('advancePhase', {
            sid: usid,
            currentPhase: bin.currentPhase,
            name: bin.phases[bin.currentPhase].name,
            duration: bin.phases[bin.currentPhase].duration
        });
    });

    app.post('/api/getSession', jsonParser, function (req, res) {
        let request = req.body as AnonAuthData;
        console.log("getSession REQUEST: %O", request);
        let usid = request.sid;
        let psd = getPublicSessionData(usid);
        if(psd) {
            res.status(200);
            res.json(psd);
        }
        else {
            res.status(403);
            res.end();
        }
    });

    app.post('/api/updateSession', jsonParser, function (req, res) {
        let request = req.body as UpdateSessionData;
        console.log("updateSession REQUEST: %O", request);
        let usid = request.sid, uphases = request.phases;
        var parsed : Phase[] = [];
        if(!isAdmin(request)) {
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
            let bin = sessions.get(usid);
            bin.lastUsed = Date.now();
            bin.currentPhase = 0;
            bin.phases = parsed;
            storeSession(usid, bin);
            console.log("Successful updateSession: %O", bin);
            res.status(200);
            res.end();
            bin.hub.event('updateSession', getPublicSessionData(usid));

        }
        else {
            console.warn("Invalid update data passed in");
            res.send("Error updating session data: Invalid JSON structure or data");
            res.status(500);
        }
    });

    app.get('/api/newSession', limiter, function (req, res) {
        let sid = newSessionId();
        let key = newKey();
        let keyh = keyHash(key);
        let bin : SessionData = {hub: new Hub(), key : keyh, lastUsed: Date.now(), currentPhase: 0, phases: [] as Phase[]};
        storeSession(sid, bin);
        let retval = { sid: sid, key: key} as AdminAuthData;
        res.json(retval);
        res.status(200);
        console.log("newSession: %s, %O", sid, sessions.get(sid));
    });

    app.use(express.static('public'));

    app.listen(43801, '127.0.0.1');
}