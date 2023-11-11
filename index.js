const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');


const html = fs.readFileSync('./index.html', 'utf8');

http.createServer((req, res) => {
    if (req.url === '/') {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(html);
    }
}).listen(3000, '192.168.1.206');


function degreesToRadians(a) {
    return a*Math.PI/180;
}

class Client {
    constructor(id, socket) {
        this.id = id;
        this.latitude = null;
        this.longitude = null;
        this.socket = socket;
    }

    setPos(latitude, longitude) {
        this.latitude = degreesToRadians(latitude);
        this.longitude = degreesToRadians(longitude);
    }

    distance(other) {
        let dLat = other.latitude-this.latitude;
        let dLong = other.longitude-this.longitude;
        let c = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.sin(dLong/2) * Math.sin(dLong/2) * Math.cos(this.latitude) * Math.cos(other.latitude);
        return 6371 * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1-c)) / 1000;
    }

    send(data) {
        this.socket.send(JSON.stringify(data));
    }
}


const server = new WebSocket.Server({port: 3001});
var clientId = 0;

let clients = [];
server.on('connection', (socket) => {
    let client = new Client(clientId, socket);
    clientId++;
    clients.push(client);
    socket.on('message', (data) => {
        data = JSON.parse(''+data);
        if (data && data.m !== undefined && data.lat !== undefined && data.long !== undefined && data.msg !== undefined && typeof(data.m) == 'string' && typeof(data.lat) == 'number' && typeof(data.long) == 'number' && typeof(data.msg) == 'string' && (data.m == 'public' || data.m == 'private' && data.to && typeof(data.to) == 'number')) {
            client.setPos(data.lat, data.long);
            if (data.m == 'public') {
                for (let i of clients) {
                    if (i.id != client.id) {
                        let dist = client.distance(i);
                        if (dist <= 0.1) {
                            i.send({
                                m: 'public',
                                from: client.id,
                                dist: dist,
                                msg: data.msg.replace('<', '&lt;').replace('>', '&gt;'),
                            });
                        }
                    }
                }
            }
            else {
                for (let i of clients) {
                    if (i.id == data.to) {
                        let dist = client.distance(i);
                        if (dist <= 0.1) {
                            i.send({
                                m: 'private',
                                from: client.id,
                                dist: dist,
                                msg: data.msg,
                            });
                        }
                    }
                }
            }
        }
    });
    socket.on('close', () => {
        for (let i of clients) {
            if (i.id == client.id) {
                clients.splice(i, 1);
                break;
            }
        }
    });
});

// let sockets = [];
// server.on('connection', (socket) => {
//     sockets.push(socket);
//     socket.on('message', (msg) => {
//         msg = JSON.parse(''+msg);
//         console.log(msg);
//         console.log(msg.mode, msg.message);
//         // sockets.forEach(s => s.send(msg));
//     });
//     socket.on('close', () => {
//         sockets = sockets.filter(s => s !== socket);
//     });
// });

console.log("Started");

// https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/String/replace