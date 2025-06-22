//手动切换主题模式
function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute("data-theme");
    html.setAttribute("data-theme", current === "dark" ? "light" : "dark");
}

// 自动切换暗黑模式
(function () {
    const hour = new Date().getHours();
    if (hour < 6 || hour >= 18) document.documentElement.setAttribute("data-theme", "dark");
})();