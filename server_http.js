"use strict";
import express from "express";
import http from "http";
import https from "https";
import fs from "fs";
import bodyParser from "body-parser";
import expressLogging from "express-logging";
import logger from "logops";
import fetch from "node-fetch";
import { createClient } from 'redis';
import process from 'process';
import e from "express";

var app = express();
var ctx;

app.use(expressLogging(logger));
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.set('view engine', 'ejs');
app.set('views', 'static');
app.use(express.static('static', { maxAge: 60 * 1000 }));


app.get('/', (req, res) => {
    res.render('index', { emails: ctx.emails });
});


function check_20x(status) {
    return Math.trunc(status / 100) == 2;
}

app.post('/registration', async (req, res) => {
    let err = { status: 200, info: "" };
    do {
        let email_name = {}
        let invite_emails = [];
        let netids = [];
        for (let i = 1; i <= 3; i++) {
            let name = req.body['name' + i].trim(), email = req.body['email' + i].trim();
            if (name.length == 0 || email.length == 0) continue;
            if (!ctx.emails.has(email)) {
                err = { status: 400, info: "Cannot find the email address " + email + " in the course." };
                break;
            }
            let value = await ctx.client.lRange(email, 0, 1);
            if (value.length > 0) {
                err = { status: 400, info: email + "is already in a group." };
                break;
            }
            email_name[email] = name;
            invite_emails.push(email)
            netids.push(email.split("@")[0]);
        }
        if (invite_emails.length == 0)
            err = { status: 400, info: "Please provide valid emails." };
        invite_emails = invite_emails.join(",");
        if (err.status != 200) break;

        let repo_name = ctx.repo_basename + "-" + netids.join("-");
        let res_repo = await fetch(`${api_url}/projects/${ctx.src_repo_id}/fork`, {
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
        let repo_id = res_body.id;
        if (!check_20x(res_repo.status) || !repo_id) {
            err = { status: res_repo.status, info: "Repo creation failed for the name: " + repo_name };
            break;
        }

        let res_invite = await fetch(`${api_url}/projects/${repo_id}/invitations`, {
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
        if (!check_20x(res_repo.status) || !res_body.status != "success") {
            err = { status: 400, info: JSON.stringify(res_body.message) };
            break;
        }

        for (let key of email_name) {
            ctx.client.rPush(key, [email_name[key], repo_id]);
        }
    } while (false);
    if (err.status != 200) {
        // res.status(err.status);
        res.render('error', { info: err.info });
    } else {
        res.render('success', { emails: invite_emails });
    }
});


async function create_ctx() {
    let ctx = {
        api_url: "https://coursework.cs.duke.edu/api/v4/",
        token: fs.readFileSync("token", { encoding: 'utf8', flag: 'r' }),
        group_name: "TEST",
        src_repo_path: "dslabs",
        repo_basename: "cps512-spring22",
        emails: new Set(fs.readFileSync("emails.txt", { encoding: 'utf8', flag: 'r' }).split("\n"))
    }

    let resp = await fetch(`${api_url}/groups/${ctx.group_name}`, {
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

    var httpServer = http.createServer(app).listen(80, () => {
        console.log("Server started! Listening on %s", httpServer.address().port);
    });
})();

