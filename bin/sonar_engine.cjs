const express = require('express');
const localtunnel = require('localtunnel');
const crypto = require('crypto');

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

const start = async () => {
    const server = app.listen(0, async () => {
        const port = server.address().port;
        const randomId = crypto.randomBytes(3).toString('hex');
        const subdomain = `hole-${randomId}`;
        
        try {
            const tunnel = await localtunnel({ port, subdomain });
            const assignedUrl = tunnel.url.replace('https://', '').replace('http://', '');
            
            console.log(JSON.stringify({ type: 'init', url: assignedUrl }));

            tunnel.on('close', () => process.exit(0));
            tunnel.on('error', (err) => {
                console.error(err.message);
                process.exit(1);
            });
        } catch (err) {
            console.error(err.message);
            process.exit(1);
        }
    });
};

start();
