// 登录申请 ##############################################################################
import {Context} from "hono";
import {Requests} from "./request";

export interface Results {
    access_token: string,
    refresh_token: string,
    message_err: string,
}

export async function pubParse(c: Context,
                               Params: Record<string, string>,
                               APIUrl: string = "/api/login",
                               Method: string = "GET",
                               error_name: string = "error_description",
                               access_name: string = "access_token",
                               refresh_name: string = "refresh_token",
): Promise<any> {
    // 请求参数 ==========================================================================
    const result_json: Record<string, any> = await Requests(c, Params, APIUrl, Method)
    let result_data: Results = {access_token: "", message_err: "", refresh_token: ""};
    console.log(result_json)
    if (result_json[error_name]) result_data.message_err = result_json[error_name]
    if (result_json[access_name] || result_json[refresh_name]) {
        result_data.access_token = result_json[access_name] ? result_json[access_name] : ""
        result_data.refresh_token = result_json[refresh_name] ? result_json[refresh_name] : ""
    }
    const parma_url = new URL("/", 'http://127.0.0.1:8787');
    // const parma_url = new URL("/", 'https://' + c.env.MAIN_URLS);
    Object.keys(result_data).forEach(key => {
        (parma_url).searchParams.append(key, result_data[key]);
    });
    return c.redirect(parma_url.href, 302)
}


