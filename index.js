const WebSocket = require('ws');
const port = process.env.PORT || 8000;

let game = {};

let playerdata = {
    players: [],
};

let actions = {
    return_obj: { frontend: '', frontend_params: [], to: '' },
    register: (ws, req, username) => {
        let fail = false;
        for (player of playerdata.players) {
            if (player.username !== username) continue;
            actions.return_obj = { frontend: 'register_fail', frontend_params: [username], to: 'single' };
            fail = true;
        }
        if (!fail) {
            playerdata[`client_${username}`] = {
                username: username,
                client: ws,
                ip: req.socket.remoteAddress ||
                    req.headers['x-forwarded-for'].split(/\s*,\s*/)[0],
                userdata: {},
            };

            playerdata.players.push(playerdata[`client_${username}`]);

            actions.return_obj = {
                frontend: 'register_success',
                frontend_params: [username],
                to: 'single',
            };
        }
    },
    join_faction: (ws, req, faction) => {},
    test: (ws, req) => {
        console.log(playerdata.players);
    }
};

new WebSocket.Server({ port }).on('connection', (ws, req) => {
    ws.on('message', (message) => {
        let data = JSON.parse(message);

        actions[data.backend](ws, req, ...data.backend_params);

        if (data.frontend) {
            if (actions.return_obj.to === 'all') {
                new WebSocket.Server({ port }).clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(actions.return_obj));
                        actions.return_obj = { frontend: '', frontend_params: [], to: '' };
                    }
                });
            } else if (actions.return_obj.to === 'broadcast') {
                new WebSocket.Server({ port }).clients.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(actions.return_obj));
                        actions.return_obj = { frontend: '', frontend_params: [], to: '' };
                    }
                });
            } else if (actions.return_obj.to === 'single') {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(actions.return_obj));
                    actions.return_obj = { frontend: '', frontend_params: [], to: '' };
                }
            }
        }
    });

    ws.on('close', () => {
        for (player of playerdata.players) {
            if (player.client !== ws) continue;
            playerdata.players.splice(playerdata.players.indexOf(player), 1);
        }
    });
});