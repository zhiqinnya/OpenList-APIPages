// 自动复制内容 #####################################################
function autoCopy(on_element) {
    // if (on_element.innerText === "") return;
    navigator.clipboard.writeText(on_element.value).then(() => {
        // 显示复制成功的提示
        Swal.fire({
            position: 'top',
            icon: 'success',
            title: '内容已复制',
            showConfirmButton: false,
            timer: 700
        });
    }).catch(err => {
        // 复制失败时的处理
        console.error('无法复制文本：', err);
        Swal.fire({
            position: 'top',
            icon: 'error',
            title: '复制失败',
            text: '请手动复制',
            showConfirmButton: true,
        });
    })
}