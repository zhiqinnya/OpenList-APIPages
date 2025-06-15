import {Context} from "hono";

export interface Clients {
    app_uid: string,
    app_key: string,
    secrets: string,
    drivers: string,
    servers: boolean,
}

export function getInfo(c: Context): Clients | undefined {
    const client_uid: string | undefined = c.req.query('client_uid');
    const client_key: string | undefined = c.req.query('client_key');
    const secret_key: string | undefined = c.req.query('secret_key');
    const driver_txt: string | undefined = c.req.query('apps_types');
    const server_use: string | undefined = c.req.query('server_use');
    if (!server_use || server_use === "false")
        if (!driver_txt || !client_key)
            return undefined;
    return {
        app_uid: client_uid === undefined ? "" : client_uid,
        app_key: client_key === undefined ? "" : client_key,
        secrets: secret_key === undefined ? "" : secret_key,
        drivers: driver_txt === undefined ? "" : driver_txt,
        servers: !server_use ? false : server_use == "true"
    };
}