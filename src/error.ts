export function showErr(error: string, client_uid: string, client_key: string) {
    return `/?message_err=${"授权失败，请检查: <br>" +
        "1、应用ID和应用机密是否正确<br>" +
        "2、登录账号是否具有应用权限<br>" +
        "3、回调地址是否包括上面地址<br>" +
        "错误信息: <br>" + error}`
        + `&client_uid=${client_uid}`
        + `&client_key=${client_key}`;
}