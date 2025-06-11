import {Context, Hono} from 'hono'
import {KVNamespace} from '@cloudflare/workers-types';
import {serveStatic} from 'hono/cloudflare-workers' // @ts-ignore
import manifest from '__STATIC_CONTENT_MANIFEST'

export type Bindings = {
    MAIN_URLS: string, DATABASE: KVNamespace,
}
const app = new Hono<{ Bindings: Bindings }>()
app.use("*", serveStatic({manifest: manifest, root: "./"}));
app.get('/onedrive/requests', async (c) => {
    const client_uid = <string>c.req.query('client_uid');
    const client_key = <string>c.req.query('client_key');
    const scopes_all = 'offline_access Files.ReadWrite.All';
    const client_url = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';

    const params_all: Record<string, any> = {
        client_id: client_uid,
        scope: scopes_all,
        response_type: 'code',
        redirect_uri: 'https://' + c.env.MAIN_URLS + '/onedrive/callback'
    };
    const urlWithParams = new URL(client_url);
    Object.keys(params_all).forEach(key => {
        urlWithParams.searchParams.append(key, params_all[key]);
    });
    try {
        const response = await fetch(urlWithParams.href, {
            method: 'GET',
        });
        console.log(response);
        await c.env.DATABASE.put(client_uid, JSON.stringify({
            "keys": client_key,
            "data": "",
        }))
        return c.json({text: response.url}, 200);
    } catch (error) {
        return c.json({text: error}, 500);
    }
})

app.get('/onedrive/callback/', async (c) => {
    const login_data = <string>c.req.query('code');
    const client_uid = <string>c.req.query('uuid');
    const client_key = <string>c.req.query('keys');
    console.log(login_data);
    let data: string = <string>await c.env.DATABASE.get(client_uid)
    // getToken(c,)
})

app.get('/onedrive/gettoken/', (c) => {
    const client_uid = <string>c.req.query('uuid');

})

async function getToken(c: Context, client_uid: string, client_key: string, login_data: string) {
    const client_url = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    const params_all = {
        client_id: client_uid,
        client_secret: client_key,
        redirect_uri: 'https://' + c.env.MAIN_URLS + '/onedrive/callback',
        code: login_data,
        grant_type: 'authorization_code'
    };

    try {
        const response = await fetch(client_url, {
            method: 'POST',
            body: params_all,
        });
        const json = JSON.parse(response.body);
        if (json.token_type === 'Bearer') {
            return c.json({
                access_token: json.access_token,
                refresh_token: json.refresh_token ? json.refresh_token : 'Error',
            });
        } else {
            return c.json({error: 'Invalid token type'});
        }
    } catch (error) {
        return c.json({error: error});
    }
}

export default app
