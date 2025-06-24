// 登录申请 ##############################################################################
import {Context} from "hono";
import {Requests} from "./request";
import {getDynamicValue} from './findvar'

export async function pubLogin(c: Context,
                               Params: Record<string, string> | string,
                               APIUrl: string = "/api/login",
                               Direct: boolean = false, // true时直接回传URL
                               Method: string = "GET",
                               Finder: string = "url",
                               Header: Record<string, string> | undefined = undefined,
): Promise<any> {
    // 请求参数 ==========================================================================
    const result_json: Record<string, any> = await Requests(
        c, Params, APIUrl, Method, Direct, Header)
    if (Finder === "json") return result_json;
    if (result_json.text) return c.json(result_json, 500);
    if (Direct) return c.json({text: result_json.url}, 200);
    if (getDynamicValue(result_json, Finder))
        return c.json({text: getDynamicValue(result_json, Finder)}, 200);
    return c.json("Error login POST", 500)
}




