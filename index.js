const WebS = require('ws');
const fs = require('fs');
const port = process.env.PORT || 8000;

let WSS = new WebS.Server({ port });

let game = {

};

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
    load_map: (ws, req) => {
        let rawmap = fs.readFileSync(__dirname + '/map.json');
        let map = JSON.parse(rawmap);

        actions.return_obj = { frontend: 'test', frontend_params: [map], to: "all" }

    },
    join_faction: (ws, req, faction) => {},
    test: (ws, req) => {
        console.log(game);
    }
};



WSS.on('connection', (ws, req) => {
    ws.on('message', (message) => {
        let data = JSON.parse(message);

        actions[data.backend](ws, req, ...data.backend_params);

        if (data.frontend) {
            if (actions.return_obj.to === 'all') {
                for (let client of WSS.clients) {
                    if (client.readyState !== WebS.OPEN) continue;
                    client.send(JSON.stringify(actions.return_obj));
                }
                actions.return_obj = { frontend: '', frontend_params: [], to: '' };
            } else if (actions.return_obj.to === 'broadcast') {
                for (let client of WSS.clients) {
                    if (client === ws || client.readyState !== WebS.OPEN) continue;
                    client.send(JSON.stringify(actions.return_obj));
                }
                actions.return_obj = { frontend: '', frontend_params: [], to: '' };
            } else if (actions.return_obj.to === 'single') {
                if (ws.readyState === WebS.OPEN) ws.send(JSON.stringify(actions.return_obj));
                actions.return_obj = { frontend: '', frontend_params: [], to: '' };
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