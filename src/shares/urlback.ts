// 登录申请 ##############################################################################
import {Context} from "hono";
import {Requests} from "./request";
import {encodeCallbackData, Secrets} from "./secrets"
import * as configs from "./configs";

export interface Results {
    access_token: string,
    refresh_token: string,
    message_err: string,
}

export async function pubParse(c: Context,
                               Client: configs.Clients,
                               Params: Record<string, string>,
                               APIUrl: string = "/api/login",
                               Method: string = "GET",
                               error_name: string = "error_description",
                               access_name: string = "access_token",
                               refresh_name: string = "refresh_token",
): Promise<any> {
    // 请求参数 ==========================================================================
    const result_json: Record<string, any> = await Requests(c, Params, APIUrl, Method)
    let result_data: Secrets = {
        access_token: "",
        message_err: "",
        refresh_token: "",
        client_uid: Client.app_uid,
        client_key: Client.app_key,
        secret_key: Client.secrets,
        driver_txt: Client.drivers,
        server_use: Client.servers ? "true" : "false",
    };
    if (result_json[error_name]) result_data.message_err = result_json[error_name]
    if (result_json[access_name] || result_json[refresh_name]) {
        result_data.access_token = result_json[access_name] ? result_json[access_name] : ""
        result_data.refresh_token = result_json[refresh_name] ? result_json[refresh_name] : ""
    }
    return c.redirect("/#" + encodeCallbackData(result_data));
}


