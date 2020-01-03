const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
const sessions = new Map();
const letters = Array.from({ length: 26 }, (_, i) => String.fromCharCode('a'.charCodeAt(0) + i));
const jsonParser = bodyParser.json();

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

function isAdmin(req) {
    let usid = req["sid"], ukey = req["key"];
    return (usid && ukey && sessions.has(usid) && ukey == sessions.get(usid).key);
}

/*
Advance Phase API request format:
{
    "sid" : "asdfghjk",
    "key" : "mysecretkey"
}
*/
app.post('/api/advancephase', jsonParser, function (req, res) {
    console.log("advancephase REQUEST: %O", req.body);
    let advance = req.body;
    if(!isAdmin(advance)) {
        res.status(403);
        res.send("Unauthorized");
        return;
    }
    let usid = advance["sid"], bin = sessions.get(usid), cphase = bin["currentPhase"], phases = bin["phases"];
    if(Number.isInteger(cphase)) {
        bin.currentPhase = (cphase+1) % phases.length;
    }
    else {
        bin.currentPhase = 0;
    }
    console.log("Successful advancephase: %O", sessions.get(usid));
    res.status(200);
    res.end();
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
app.post('/api/updatesession', jsonParser, function (req, res) {
    console.log("updatesession REQUEST: %O", req.body);
    let update = req.body;
    let usid = update["sid"], uphases = update["phases"], ukey = update["key"];
    var parsed = [];
    if(!isAdmin(update)) {
        res.status(403);
        res.send("Unauthorized");
        return;
    }

    if(uphases && Array.isArray(uphases)) {
        uphases.forEach(function (val, idx) {
            let uname = val["name"];
            let udur = val["duration"];
            if(uname && udur && Number.isInteger(udur) && (typeof uname === 'string' || uname instanceof String) && uname.length > 0) {
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
        console.log("Successful updatesession: %O", sessions.get(usid));
        res.status(200);
        res.end();
    }
    else {
        console.warn("Invalid update data passed in");
        res.send("Error updating session data: Invalid JSON structure or data");
        res.status(500);
    }
});

app.get('/api/newsession', function (req, res) {
    let sid = newSessionId();
    let key = newKey();
    sessions.set(sid, {key : key, lastused: Date.now(), currentPhase: 0, phases: []});
    res.json({ sid: sid, key: key});
    res.status(200);
    console.log("New session: %s, %O", sid, sessions.get(sid));
});


app.use(express.static('public'));

app.listen(43801);