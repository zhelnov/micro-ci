const express = require('express');
const axios = require('axios');

const { exec } = require('child_process');
const crypto = require('crypto');

const app = express();
app.use(express.text({ type:"*/*" }));

const config = require('./config.json');
const { githubWebhookSecret, telegramSecret, telegramChatId, projects } = config;

app.post('/project/:repo',  async (req, res) => {
    const conf = projects[req.params.repo];
    if (!conf) {
        console.log(`Unknown repo ${req.params.repo}`);
        return res.status(200).end();
    }

    const signatureHeader = 'X-Hub-Signature-256'.toLocaleLowerCase();
    const signature = req.headers[signatureHeader];
    if (!signature) {
        console.log(`Absent ${signatureHeader} header value`);
        return res.status(200).end();
    }
    const valid = await verifySignature(githubWebhookSecret, signature, req.body);

    console.log(`--> WEBHOOK for ${req.params.repo} (signature "${signature}" check ${valid}):`);
    
   const ref = JSON.parse(req.body).ref;
   if (ref !== `refs/heads/${conf.branch}`) {
	console.log(`Push to ${ref}, skipping deploy`);
	return res.status(200).end();
   }

    if (!valid) {
        return res.status(200).end();
    }

	console.log(__dirname);
    const cmd = conf.static ? `bash ${__dirname}/deploy_static.sh ${conf.dir} ${conf.branch}` : `bash ${__dirname}/deploy.sh ${conf.dir} ${conf.branch} ${conf.service}`; 
    exec(cmd, (error, stdout, stderr) => {
        console.log('STDOUT: ');
        console.log(stdout);
        console.log('STDERR: ');
        console.log(stderr);
        if (error !== null) {
            console.log(`EXEC ERROR: ${error}`);
            sendTg(`${conf.dir} (${conf.branch}): deploy failed: \n \`\`\`${error.toString()}\`\`\``);
        } else {
            sendTg(`${conf.dir} (${conf.branch}): deployed!`);
        }
    });

    res.status(200).end();
});

exports.default = app.listen(process.env.HTTP_PORT || 2999, 'localhost', () => console.log('Server listening!'));

const encoder = new TextEncoder();
async function verifySignature(secret, header, payload) {
    const key = await crypto.webcrypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: "HMAC", hash: { name: 'SHA-256' } },
        false,
        ['sign', 'verify'],
    );
    return crypto.webcrypto.subtle.verify(
        "HMAC",
        key,
        Buffer.from(header.split("=")[1], 'hex'),
        encoder.encode(payload),
    );
}

async function sendTg(text) {
    try {
	    console.log(`https://api.telegram.org/bot${telegramSecret}/sendMessage`);
		    console.log(telegramChatId);
    return await axios.get(`https://api.telegram.org/bot${telegramSecret}/sendMessage`, {
        params: {
            chat_id: telegramChatId,
            text,
        },
    });
    } catch (err) {
	    console.log('axios failed');
    }
}

