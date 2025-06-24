export function getDynamicValue(resultJson: Record<string, any>,
                                path: string,
                                origin_text: any = ""): any {
    if (path === "none") return "";
    if (path === "copy") return origin_text;
    // 将路径拆分为属性数组，例如 'data.refresh_token' 拆分为 ['data', 'refresh_token']
    const properties = path.split('.');
    // 从 resultJson 开始遍历属性
    let currentValue = resultJson;
    // 遍历每个属性，逐层深入对象
    for (const prop of properties) {
        // 检查当前值是否为对象且具有该属性
        if (currentValue
            && typeof currentValue === 'object'
            && prop in currentValue) {
            currentValue = currentValue[prop];
        } else {
            return undefined;
        }
    }
    return currentValue;
}

