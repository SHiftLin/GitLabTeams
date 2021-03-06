"use strict";
import express from "express";
import https from "https";
import fs from "fs";
import bodyParser from "body-parser";
import expressLogging from "express-logging";
import logger from "logops";
import fetch from "node-fetch";
import { createClient } from 'redis';
import process from 'process';

const Certificate = {
    key: fs.readFileSync('./cert/server.key'),
    cert: fs.readFileSync('./cert/server.pem')
}

var app = express();
var ctx;

app.use(expressLogging(logger));
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.set('view engine', 'ejs');
app.set('views', 'static');
app.use(express.static('static', { maxAge: 600 * 1000 }));

app.get('/', (req, res) => {
    res.render('index', { emails: ctx.emails, platform: ctx.platform });
});

function check_20x(status) {
    return Math.trunc(status / 100) == 2;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function wait_fork_finished(repo_id) {
    let import_status = "";
    let cnt = 0;
    while (import_status != "finished" && cnt < 5) {
        let res_prot = await fetch(`${ctx.api_url}/projects/${repo_id}`, {
            headers: {
                "PRIVATE-TOKEN": ctx.token
            }
        });
        import_status = (await res_prot.json()).import_status;
        cnt++;
        await sleep(1000);
    }
    return import_status;
}

app.post('/registration', async (req, res) => {
    let err = { status: 200, info: "" };
    let email_name = {}
    let invite_emails = [];
    let netids = [];
    let repo_id = 0;
    do {
        for (let i = 1; i <= 3; i++) {
            let name = req.body['name' + i].trim(), email = req.body['email' + i].trim();
            if (name.length == 0 || email.length == 0) continue;
            if (!ctx.emails.has(email)) {
                err = { status: 400, info: "Cannot find the email address " + email + " in the course." };
                break;
            }
            let value = await ctx.client.lRange(email, 0, 1);
            if (value.length > 0) {
                err = { status: 400, info: email + " is already in a team." };
                break;
            }
            email_name[email] = name;
            invite_emails.push(email)
            netids.push(email.split("@")[0]);
        }
        if (err.status != 200) break;

        if (invite_emails.length == 0)
            err = { status: 400, info: "Please provide valid emails." };
        invite_emails = invite_emails.join(",");
        if (err.status != 200) break;

        let repo_name = ctx.repo_basename + "-" + netids.join("-");
        let res_repo = await fetch(`${ctx.api_url}/projects/${ctx.src_repo_id}/fork`, {
            method: "POST",
            headers: {
                "PRIVATE-TOKEN": ctx.token,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                name: repo_name,
                path: repo_name,
                namespace_id: ctx.group_id,
                visibility: "private"
            }).toString()
        });
        let res_body = await res_repo.json();
        repo_id = res_body.id;
        if (!check_20x(res_repo.status) || !repo_id) {
            err = { status: res_repo.status, info: "Repo fork failed for the name: " + repo_name };
            break;
        }

        let res_invite = await fetch(`${ctx.api_url}/projects/${repo_id}/invitations`, {
            method: "POST",
            headers: {
                "PRIVATE-TOKEN": ctx.token,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                email: invite_emails,
                access_level: "30"
            }).toString()
        });
        res_body = await res_invite.json();
        if (!res_body.status != "success")
            err.info = res_body.message;

        for (let key in email_name) {
            ctx.client.rPush(key, [email_name[key], String(repo_id)]);
        }
    } while (false);
    if (err.status != 200) {
        res.status(err.status);
        res.render('error', { info: err.info });
    } else {
        res.render('success', {
            emails: invite_emails,
            info: JSON.stringify(err.info),
            platform: ctx.platform
        });

        await wait_fork_finished(repo_id);
        let res_prot = await fetch(`${ctx.api_url}/projects/${repo_id}/protected_branches/master`, {
            method: "DELETE",
            headers: {
                "PRIVATE-TOKEN": ctx.token
            }
        });
    }
});


async function create_ctx() {
    let ctx = {
        platform: '<a href="https://coursework.cs.duke.edu">Coursework</a>',
        api_url: "https://coursework.cs.duke.edu/api/v4/",
        token: fs.readFileSync("token", { encoding: 'utf8', flag: 'r' }),
        group_name: "cps512-spring22",
        src_repo_path: "dslabs",
        repo_basename: "dslabs",
        emails: new Set(fs.readFileSync("emails.txt", { encoding: 'utf8', flag: 'r' }).split("\n"))
    }

    let resp = await fetch(`${ctx.api_url}/groups/${ctx.group_name}`, {
        headers: { "PRIVATE-TOKEN": ctx.token }
    });
    let resp_group = await resp.json();
    ctx.group_id = resp_group.id;
    for (let project of resp_group.projects)
        if (project.path == ctx.src_repo_path) {
            ctx.src_repo_id = project.id;
            break;
        }
    ctx.client = createClient();
    await ctx.client.connect();
    return ctx;
}

(async () => {
    ctx = await create_ctx();
    console.log(ctx);
    if (!ctx.src_repo_id) {
        console.log("Cannot find source repo.")
        process.exit(1);
    }

    var http = express();
    http.get('*', function (req, res) {
        res.redirect('https://' + req.headers.host + req.url);
    })
    http.listen(80);

    var httpsServer = https.createServer(Certificate, app).listen(443, () => {
        console.log("Server started! Listening on %s", httpsServer.address().port);
    });
})();

