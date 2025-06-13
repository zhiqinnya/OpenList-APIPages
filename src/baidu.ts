import * as local from "hono/cookie";
import {Context} from "hono";
import {showErr} from "./error";


const driver_map: string[] = [
    "https://openapi.baidu.com/oauth/2.0/authorize",
    "https://openapi.baidu.com/oauth/2.0/token"
]

// 登录申请 ##############################################################################
export async function oneLogin(c: Context) {
    const client_uid = c.req.query('client_uid');
    const client_key = c.req.query('client_key');
    const secret_key = c.req.query('secret_key');
    const driver_txt = c.req.query('apps_types');
    if (!driver_txt || !client_uid || !client_key || !secret_key)
        return c.json({text: "参数缺少"}, 500);
    // 请求参数 ==========================================================================
    const params_all: Record<string, any> = {
        client_id: client_key,
        device_id: client_uid,
        scope: "basic,netdisk",
        response_type: 'code',
        redirect_uri: 'https://' + c.env.MAIN_URLS + '/baiduyun/callback'
    };
    const urlWithParams = new URL(driver_map[0]);
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
        local.setCookie(c, 'driver_txt', driver_txt);
        local.setCookie(c, 'secret_key', secret_key);
        console.log(response.url);
        return c.json({text: response.url}, 200);
    } catch (error) {
        return c.json({text: error}, 500);
    }
}

// 令牌申请 ##############################################################################
export async function oneToken(c: Context) {
    let login_data, client_uid, client_key, secret_key, client_url;
    let driver_txt, params_all: Record<string, any>;
    try { // 请求参数 ====================================================================
        login_data = c.req.query('code');
        client_uid = local.getCookie(c, 'client_uid')
        client_key = local.getCookie(c, 'client_key')
        secret_key = local.getCookie(c, 'secret_key')
        driver_txt = local.getCookie(c, 'driver_txt')
        if (!login_data || !client_uid || !client_key || !secret_key)
            return c.redirect(showErr("Cookie缺少", "", ""));
        client_url = driver_map[1];
        params_all = {
            client_id: client_key,
            client_secret: secret_key,
            code: login_data,
            grant_type: 'authorization_code',
            redirect_uri: 'https://' + c.env.MAIN_URLS + '/baiduyun/callback'
        };
    } catch (error) {
        return c.redirect(showErr(<string>error, "", ""));
    }
    // console.log(login_data);

    // 执行请求 ===========================================================================
    try {
        const paramsString = new URLSearchParams(params_all).toString();
        const urlWithParams = new URL(client_url);
        Object.keys(params_all).forEach(key => {
            urlWithParams.searchParams.append(key, params_all[key]);
        });
        const response: Response = await fetch(urlWithParams, {method: 'GET'});
        local.deleteCookie(c, 'client_uid');
        local.deleteCookie(c, 'client_key');
        local.deleteCookie(c, 'secret_key');
        const json: Record<string, any> = await response.json();
        // console.log(response, json);
        if (response.ok) {
            return c.redirect(
                `/?access_token=${json.access_token}`
                + `&refresh_token=${json.refresh_token}`
                + `&client_uid=${client_uid}`
                + `&client_key=${client_key}`
                + `&secret_key=${secret_key}`
                + `&driver_txt=${driver_txt}`
            );
        }
        return c.redirect(showErr(json.error_description, client_uid, client_key));
    } catch (error) {
        return c.redirect(showErr(<string>error, client_uid, client_key));
    }
}

