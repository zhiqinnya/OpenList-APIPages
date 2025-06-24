import {Context} from "hono";
import * as local from "hono/cookie";
import * as configs from "./configs";

export function setCookie(c: Context, client_info: configs.Clients) {
    local.setCookie(c, 'driver_txt', client_info.drivers ? client_info.drivers : "");
    local.setCookie(c, 'server_use', client_info.servers ? client_info.servers.toString() : "");
    if (!client_info.servers) {
        local.setCookie(c, 'client_uid', client_info.app_uid ? client_info.app_uid : "");
        local.setCookie(c, 'client_key', client_info.app_key ? client_info.app_key : "");
    }
}

export function getCookie(c: Context): configs.Clients {
    return {
        app_uid: local.getCookie(c, 'client_uid'),
        app_key: local.getCookie(c, 'client_key'),
        secrets: local.getCookie(c, 'secret_key'),
        drivers: local.getCookie(c, 'driver_txt'),
        servers: local.getCookie(c, 'server_use') == "true",
    };
}