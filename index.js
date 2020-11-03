const WebSocket = require('ws');
const port = process.env.PORT || 8000;


const wss = new WebSocket.Server({ port });

let game = {}

let playerdata = {
    players: []
}

let actions = {
    return_obj: { frontend: "", frontend_params: [], to: "" },
    register: (ws, req, username) => {
        let fail = false;
        playerdata.players.forEach(player => {
            if (player.username === username) {
                actions.return_obj = { frontend: "register_fail", frontend_params: [username], to: "single" };
                fail = true;
            }
        });
        if (!fail) {
            playerdata[`client_${username}`] = {
                username: username,
                client: ws,
                ip: req.socket.remoteAddress || req.headers['x-forwarded-for'].split(/\s*,\s*/)[0],
                userdata: {}
            };

            playerdata.players.push(playerdata[`client_${username}`]);

            actions.return_obj = { frontend: "register_success", frontend_params: [username], to: "single" }
        }
    },
    join_faction: (ws, req, faction) => {


    },

};

wss.on('connection', (ws, req) => {
    ws.on('message', message => {
        let data = JSON.parse(message);

        actions[data.backend](ws, req, ...data.backend_params);

        if (data.frontend) {
            if (actions.return_obj.to === "all") {
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(actions.return_obj));
                        actions.return_obj = { frontend: "", frontend_params: [], to: "" };
                    }
                });
            } else if (actions.return_obj.to === "broadcast") {
                wss.clients.forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(actions.return_obj));
                        actions.return_obj = { frontend: "", frontend_params: [], to: "" };
                    }
                });
            } else if (actions.return_obj.to === "single") {
                if (ws.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(actions.return_obj));
                    actions.return_obj = { frontend: "", frontend_params: [], to: "" };
                }
            }
        }

    });
});