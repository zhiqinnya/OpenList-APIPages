// 获取站点ID
function getSiteID() {
    const siteUrl = document.getElementById("sharepoint-url").value.trim();
    const access_token = document.getElementById("access-token").value.trim();
    const refresh_token = document.getElementById("refresh-token").value.trim();
    const client_uid = document.getElementById("client-uid-input").value.trim();
    const client_key = document.getElementById("client-key-input").value.trim();
    const site_type = document.getElementById("driver-txt-input").value;
    const idElement = document.getElementById("sharepoint-id");

    // 定义站点的API Endpoint
    const GATEWAYS = {
        "onedrive_go": "https://graph.microsoft.com/v1.0/sites/",
        "onedrive_cn": "https://microsoftgraph.chinacloudapi.cn/v1.0/sites/",
        "onedrive_us": "https://graph.microsoft.us/v1.0/sites/",
        "onedrive_de": "https://graph.microsoft.de/v1.0/sites/"
    };

    // 定义错误信息
    const ERROR_MESSAGES = {
        MISSING_CREDENTIALS: "请先填写客户端ID和应用机密",
        MISSING_TOKENS: "请获取Token",
        MISSING_URL: "请填写您的SharePoint URL",
        NOT_SUPPORTED: "仅支持OneDrive相关API",
        NOT_FOUND: "站点不存在",
        BAD_REQUEST: "获取出现问题，请检查权限和站点URL，站点URL示例：https://demo.sharepoint.com/site/demo",
        DEFAULT: "请求发生错误"
    };

    // 验证
    if (!client_uid || !client_key) {
        idElement.value = ERROR_MESSAGES.MISSING_CREDENTIALS;
        return;
    }
    if (!access_token || !refresh_token) {
        idElement.value = ERROR_MESSAGES.MISSING_TOKENS;
        return;
    }
    if (!siteUrl) {
        idElement.value = ERROR_MESSAGES.MISSING_URL;
        return;
    }
    if (!site_type.includes("onedrive")) {
        idElement.value = ERROR_MESSAGES.NOT_SUPPORTED;
        return;
    }
    if (!GATEWAYS[site_type]) {
        idElement.value = ERROR_MESSAGES.DEFAULT;
        return;
    }

    // 获取ID
    try {
        const urlParts = siteUrl.replace("https://", "").split("/");
        const site_hostname = urlParts[0];
        const site_sub_path = urlParts[1];
        const site_name = urlParts[2];
        const site_path = site_sub_path + "/" + site_name;
        const reqUrl = `${GATEWAYS[site_type]}${site_hostname}:/${site_path}`;
        const headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": `Bearer ${access_token}`
        };

        fetch(reqUrl, {
            method: "GET",
            headers: headers
        })
            .then(async (res) => {
                if (!res.ok) {
                    if (res.status === 404) {
                        idElement.value = ERROR_MESSAGES.NOT_FOUND;
                        return;
                    } else if (res.status === 400) {
                        idElement.value = ERROR_MESSAGES.BAD_REQUEST;
                        return;
                    } else {
                        idElement.value = `${ERROR_MESSAGES.DEFAULT} (HTTP ${res.status})`;
                        return;
                    }
                }

                try {
                    const result = await res.json();
                    if (result.id) {
                        idElement.value = result.id;
                    } else if (result.error) {
                        idElement.value = result.error.message || ERROR_MESSAGES.DEFAULT;
                    } else {
                        idElement.value = ERROR_MESSAGES.DEFAULT;
                    }
                } catch (error) {
                    idElement.value = ERROR_MESSAGES.DEFAULT;
                    console.error("处理响应时出错:", error);
                }
            })
            .catch((error) => {
                idElement.value = ERROR_MESSAGES.BAD_REQUEST;
                console.error("请求失败:", error);
            });
    } catch (error) {
        idElement.value = ERROR_MESSAGES.BAD_REQUEST;
        console.error("URL解析失败:", error);
    }
}