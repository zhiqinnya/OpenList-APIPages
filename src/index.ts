import {Context, Hono} from 'hono'
import {KVNamespace} from '@cloudflare/workers-types';
import {serveStatic} from 'hono/cloudflare-workers' // @ts-ignore
import manifest from '__STATIC_CONTENT_MANIFEST'
import * as local from "hono/cookie";
import * as oneui from './oneui';
import * as aliui from './aliui';

export type Bindings = {
    MAIN_URLS: string
}
const app = new Hono<{ Bindings: Bindings }>()
app.use("*", serveStatic({manifest: manifest, root: "./"}));

// 登录申请 ##############################################################################
app.get('/onedrive/requests', async (c) => {
    return oneui.oneLogin(c);
})
// 令牌申请 ##############################################################################
app.get('/onedrive/callback', async (c) => {
    return oneui.oneToken(c);
})

// 登录申请 ##############################################################################
app.get('/alicloud/requests', async (c: Context) => {
    return aliui.alyLogin(c);
});

// 令牌申请 ##############################################################################
app.get('/alicloud/callback', async (c: Context) => {
    return aliui.alyToken(c);
});

export default app