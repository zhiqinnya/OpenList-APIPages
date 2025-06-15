// 获取登录秘钥 #######################################################
async function getLogin() {
    let server_use = document.getElementById("server_use").checked;
    let apps_uuid = document.getElementById("client-id").value;
    let apps_keys = document.getElementById("app-secret").value;
    let apps_type = document.getElementById("site-select").value;
    let secret_key = document.getElementById("secret-key").value;
    console.log(server_use);
    // 阿里云盘扫码登录v2不需要验证客户端ID和应用机密
    if (apps_type !== "alicloud_oa" && !server_use && (apps_uuid === "" || apps_keys === "")) {
        Swal.fire({
            position: 'top',
            icon: 'info',
            title: '获取失败',
            text: '请先填写AppID和AppKey',
            showConfirmButton: true,
        });
        return;
    }
    // 阿里云盘扫码v2直接调用专用API，不需要构建传统的requests路径
    if (apps_type === "alicloud_oa") {
        await startAlicloud2Login();
        return;
    }

    let apps_subs = apps_type.split("_")[0]
    let post_urls = "/" + apps_subs + "/requests?client_uid=" + apps_uuid
        + "&client_key=" + apps_keys + "&apps_types=" + apps_type
        + "&server_use=" + server_use
    if (apps_subs === "baiduyun") post_urls += "&secret_key=" + secret_key
    try {
        const response = await fetch(post_urls, {
            method: 'GET', headers: {'Content-Type': 'application/json'}
        });
        // 解析响应内容 ===============================================
        const response_data = await response.json();
        if (response.status === 200) {
            if (apps_subs === "onedrive" || apps_subs === "115cloud"
                || apps_subs === "baiduyun" || apps_subs === "googleui" || apps_subs === "yandex") {
                window.location.href = response_data.text;
            }
            if (apps_subs === "123cloud") {
                document.getElementById("access-token").value = response_data.text;
                return;
            }
            if (apps_type === "alicloud_qr") {
                let sid = response_data.sid;
                await Swal.fire({
                    position: 'top',
                    icon: 'info',
                    title: '扫码登录',
                    html: `<div>请扫码登录，完成后点确定</div>` +
                        `<img src="${response_data.text}" alt="">`,
                    showConfirmButton: true
                });
                post_urls = "/alicloud/callback" +
                    "?client_id=" + apps_uuid +
                    "&client_secret=" + apps_keys +
                    "&grant_type=" + "authorization_code" +
                    "&code=" + sid
                let auth_post = await fetch(post_urls, {method: 'GET'});
                let auth_data = await auth_post.json();
                if (auth_post.status === 200) {
                    window.location.href = `/?access_token=${auth_data.access_token}`
                        + `&refresh_token=${auth_data.refresh_token}`
                        + `&client_uid=${apps_uuid}`
                        + `&client_key=${apps_keys}`;
                }
            }

        } else Swal.fire({
            icon: 'error',
            title: "获取秘钥失败: " + response_data.text,
            showConfirmButton: true,
            timer: 1000
        });
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: '获取秘钥失败: ' + error,
            showConfirmButton: true,
            timer: 1000
        });
    }
}