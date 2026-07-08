const express = require('express');
const os = require('os');

const app = express();
app.use(express.raw({ type: '*/*', limit: '50mb' }));
app.use(express.text({ type: '*/*', limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use((req, res) => {
    let rawRequest = `${req.method} ${req.originalUrl} HTTP/${req.httpVersion}\n`;
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
        rawRequest += `${req.rawHeaders[i]}: ${req.rawHeaders[i+1]}\n`;
    }
    rawRequest += '\n';
    
    if (req.body && Buffer.isBuffer(req.body)) {
        rawRequest += req.body.toString('utf8');
    } else if (typeof req.body === 'string') {
        rawRequest += req.body;
    } else if (Object.keys(req.body).length > 0) {
        rawRequest += JSON.stringify(req.body, null, 2);
    }

    const interaction = {
        protocol: 'http',
        'q-type': req.method,
        'raw-request': rawRequest,
        'remote-address': req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown',
        timestamp: new Date().toISOString()
    };

    console.log(JSON.stringify(interaction));
    res.status(200).send('OK');
});

const getLocalIp = () => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
};

const start = () => {
    const port = 8000;
    app.listen(port, '0.0.0.0', () => {
        const ip = getLocalIp();
        console.log(JSON.stringify({ type: 'init', url: `${ip}:${port}` }));
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            // Fallback to random port if 8000 is taken
            const server = app.listen(0, '0.0.0.0', () => {
                const randomPort = server.address().port;
                const ip = getLocalIp();
                console.log(JSON.stringify({ type: 'init', url: `${ip}:${randomPort}` }));
            });
        } else {
            console.error(err.message);
            process.exit(1);
        }
    });
};

start();
