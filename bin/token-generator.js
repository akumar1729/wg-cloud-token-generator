#!/usr/bin/env node

import * as p from '@clack/prompts';
import clipboard from 'clipboardy';
import color from 'picocolors';


async function main() {
    console.clear();

    p.intro(`${color.bgCyan(color.black('Cloud Token Generator'))}`);

    const project = await p.group(
        {},
        {
            onCancel: () => {
                p.cancel('Operation cancelled.');
                process.exit(0);
            },
        }
    );

    try {
        const cookie = await clipboard.read();
        const { sessionId, xsrfToken, env, error } = readFromCookie(cookie)

        if (!error) {
            const spinner = p.spinner();

            spinner.start('Fetching token...');

            const { token } = await fetchToken(sessionId, xsrfToken, env)

            spinner.stop('Token fetched!');
            if (token) {
                await clipboard.write(token);
                p.outro(`${color.underline(color.cyan('Token successfully copied to clipboard'))}`);
                p.outro(`Token: \n ${color.green(token)}`)
            }
        }
    }
    catch (error) {
        console.log('Some error occurred, please try again')
    }
}

try {
    main().catch(console.error);
}
catch (error) {
    console.log('Some error occurred')
}

async function fetchToken(sessionId, xsrfToken, env) {
    try {
        const url = `https://guard.${env}.usa.cloud.watchguard.com/cloud/${env}/session-mw-query/v1/token?sessionId=${sessionId}`
        const response = await fetch(url, {
            method: "GET",
            mode: "cors",
            cache: "no-cache",
            credentials: "same-origin",
            headers: {
                "Cookie": `wgcloud_${env}_session=${sessionId}; XSRF-TOKEN=${xsrfToken}`,
                "Origin": `https://${env}.usa.cloud.watchguard.com`,
                "Content-Type": "application/json",
                "X-XSRF-Token": xsrfToken,
                "Request-ID": "token-tool"
            },
            redirect: "follow",
            referrerPolicy: "no-referrer",
        });
        const data = await response.json();
        return {
            token: data?.info?.token
        }
    }
    catch (error) {
        return {
            token: ''
        }
    }
}


function readFromCookie(cookie) {
    try {
        const [session, token] = cookie.split(';')
        const [env_text, sessionId] = session.split('=');
        const env = env_text.split('_')[1];
        const xsrfToken = token.split('=')[1];

        return {
            sessionId,
            xsrfToken,
            env,
            error: false
        }
    }
    catch (error) {
        p.outro(`${color.red('Please copy correct cookie to clipboard first')}`)
        return {
            error: true
        }
    }
}

