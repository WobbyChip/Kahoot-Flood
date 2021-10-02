const fs = require('fs');
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const { v4: uuidv4 } = require('uuid');
const extract = require('extract-zip')
var Kahoot = null;

var bots = {};
var tasks = {};

(async () => {
    await extract(__dirname + '/kahoot.js.zip', {dir: `${__dirname}/node_modules`});
    Kahoot = require('kahoot.js');
})();


const app = express();
app.use(express.static("website", {index: "index.html"}));
const server = http.createServer(app);
const io = socketio(server);


app.get("/", function(req, res) {
    res.sendFile(__dirname + "/website/index.html");
});


io.sockets.on("connection", socket => {
    socket.on("join_flood", async data => {
        if (!data.prefix || !data.prefix.match(/^.{1,20}$/)) { return; }
        if (data && !isNaN(data.pin) && !Between(data.pin, 1000000, 9999999)) {  return; }
        if (data && !isNaN(data.count) && !Between(data.count, 1, 1000)) {  return; }
        await JoinBots(data.pin, data.prefix, data.count);
    });

    socket.on("leave_flood", async data => {
        if (data && !isNaN(data.pin) && !Between(data.pin, 1000000, 9999999)) {  return; }
        await LeaveBots(data.pin);
    });
});


server.listen(process.env.PORT || 3000, function() {
    console.log(`Listening on port: ${process.env.PORT || 3000}`);
});


function Between(num, a, b) {
    var min = Math.min.apply(Math, [a, b]), max = Math.max.apply(Math, [a, b]);
    return (num != null) && (num >= min && num <= max);
};


async function Wait(milleseconds) {
	return new Promise(resolve => setTimeout(resolve, milleseconds))
}


async function JoinBots(pin, prefix, count) {
    var t_uid = uuidv4().replace(/-/g, "");
    var join_completed = false;

    //Create function which will join bots
    if (!tasks[pin]) { tasks[pin] = {} }
    tasks[pin][t_uid] = [async function() {
        //Create counter to count joined bots
        var counter = 0;

        //Create timeout after which this task will be terminated
        tasks[pin][t_uid][1] = setTimeout(function() {
            tasks[pin][t_uid][2] = true;
        }, 60*1000)

        for (var i = 0; i < count; i++) {
            (async () => {
                var b_uid = uuidv4().replace(/-/g, "");
                if (!bots[pin]) { bots[pin] = {} }
                var kahot = new Kahoot();
                bots[pin][b_uid] = kahot;

                try {
                    await kahot.join(pin, `${prefix} ${i+1}`);
                } catch(e) {}
    
                if (join_completed) { kahot.leave() }
                counter += 1;
            })();
        }
    
        while ((counter != count) && !tasks[pin][t_uid][2]) {
            console.log(counter);
            await Wait(100);
        }

        console.log("Complete Join");

        join_completed = true;
        clearTimeout(tasks[pin][t_uid][1]);
        delete tasks[pin][t_uid];
    }, null, false]

    //Run bot join function
    await tasks[pin][t_uid][0]();
    console.log("Exit Join");
}


async function LeaveBots(pin) {
    if (tasks[pin]) {
        for (const [key, value] of Object.entries(tasks[pin])) {
            tasks[pin][key][2] = true;
        }
    }

    if (bots[pin]) {
        for (const [key, value] of Object.entries(bots[pin])) {
            try {
                bots[pin][key].leave();
            } catch(e) {}
    
            delete bots[pin][key];
        }
    }
}