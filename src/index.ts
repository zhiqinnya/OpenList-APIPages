import {Context, Hono} from 'hono'
import {KVNamespace} from '@cloudflare/workers-types';
import {serveStatic} from 'hono/cloudflare-workers' // @ts-ignore
import manifest from '__STATIC_CONTENT_MANIFEST'
import * as local from "hono/cookie";

export type Bindings = {
    MAIN_URLS: string
}
const app = new Hono<{ Bindings: Bindings }>()
app.use("*", serveStatic({manifest: manifest, root: "./"}));

// 登录申请 ##############################################################################
app.get('/onedrive/requests', async (c) => {
    const client_uid = <string>c.req.query('client_uid');
    const client_key = <string>c.req.query('client_key');
    const scopes_all = 'offline_access Files.ReadWrite.All';
    const client_url = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
    // 请求参数 ==========================================================================
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
    // 执行请求 ===========================================================================
    try {
        const response = await fetch(urlWithParams.href, {
            method: 'GET',
        });
        local.setCookie(c, 'client_uid', client_uid);
        local.setCookie(c, 'client_key', client_key);
        return c.json({text: response.url}, 200);
    } catch (error) {
        return c.json({text: error}, 500);
    }
})
// 令牌申请 ##############################################################################
app.get('/onedrive/callback', async (c) => {
    const login_data = <string>c.req.query('code');
    const client_uid: string | undefined = local.getCookie(c, 'client_uid')
    const client_key: string | undefined = local.getCookie(c, 'client_key')
    const client_url = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    console.log(login_data);
    // 请求参数 ==========================================================================
    const params_all = {
        client_id: client_uid,
        client_secret: client_key,
        redirect_uri: 'https://' + c.env.MAIN_URLS + '/onedrive/callback',
        code: login_data,
        grant_type: 'authorization_code'
    };
    // 执行请求 ===========================================================================
    try {
        const paramsString = new URLSearchParams(params_all).toString();
        const response: Response = await fetch(client_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: paramsString,
        });
        console.log(response);
        if (!response.ok)
            return c.json({text: response.text()}, 403);
        const json: Record<string, any> = await response.json();
        if (json.token_type === 'Bearer') {
            return c.redirect(
                `/?access_token=${json.access_token}`
                + `&refresh_token=${json.refresh_token}`
                + `&client_uid=${client_uid}`
                + `&client_key=${client_key}`);
            // return c.json({
            //     access_token: json.access_token,
            //     refresh_token: json.refresh_token,
            // });
        }
    } catch (error) {
        console.error(error);
        return c.json({text: error}, 500);
    }
})


export default app
