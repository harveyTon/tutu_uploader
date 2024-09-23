console.log("背景脚本已加载");

// 通用通知函数
function showNotification(title, message, type = 'basic', onClickUrl = null) {
    // 清除所有之前的通知
    chrome.notifications.getAll((notifications) => {
        for (let notificationId in notifications) {
            chrome.notifications.clear(notificationId);
        }
    });

    const notificationId = `notification-${Date.now()}`;
    chrome.notifications.create(notificationId, {
        type: type,
        iconUrl: '../icon.png',
        title: title,
        message: message
    });

    if (onClickUrl) {
        chrome.notifications.onClicked.addListener(function listener(id) {
            if (id === notificationId) {
                chrome.tabs.create({ url: onClickUrl });
                chrome.notifications.onClicked.removeListener(listener);
            }
        });
    }
}

chrome.runtime.onInstalled.addListener(function () {
    console.log("扩展已安装，开始初始化...");
    showNotification("兔兔图床上传器", "扩展已安装并初始化");

    // 创建一级菜单
    chrome.contextMenus.create({
        id: "tutuImageUploader",
        title: "上传到兔兔图床",
        contexts: ["image"],
    }, () => {
        console.log("一级右键菜单项已创建");
    });

    // 创建二级菜单
    chrome.contextMenus.create({
        id: "directUpload",
        parentId: "tutuImageUploader",
        title: "直接上传",
        contexts: ["image"],
    }, () => {
        console.log("二级右键菜单项 '直接上传' 已创建");
    });

    chrome.contextMenus.create({
        id: "uploadAndOpen",
        parentId: "tutuImageUploader",
        title: "上传后打开",
        contexts: ["image"],
    }, () => {
        console.log("二级右键菜单项 '上传后新标签页打开图片' 已创建");
    });

    chrome.contextMenus.create({
        id: "chooseUploadMode",
        parentId: "tutuImageUploader",
        title: "选择上传模式",
        contexts: ["image"],
    }, () => {
        console.log("二级右键菜单项 '选择上传模式' 已创建");
    });

    // 创建三级菜单
    chrome.contextMenus.create({
        id: "userUpload",
        parentId: "chooseUploadMode",
        title: "用户上传",
        contexts: ["image"],
    }, () => {
        console.log("三级右键菜单项 '用户上传' 已创建");
    });

    chrome.contextMenus.create({
        id: "anonymousUpload",
        parentId: "chooseUploadMode",
        title: "匿名上传",
        contexts: ["image"],
    }, () => {
        console.log("三级右键菜单项 '匿名上传' 已创建");
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    let anonymousUpload = false; // 默认使用用户上传

    if (info.menuItemId === "directUpload") {
        console.log('用户选择直接上传图片:', info.srcUrl);
        // 从存储中获取匿名上传设置
        chrome.storage.sync.get(['anonymousUpload'], function (data) {
            anonymousUpload = data.anonymousUpload || false; // 如果没有设置，默认为 false
            handleUpload(info.srcUrl, info.pageUrl, anonymousUpload, false);
        });
    } else if (info.menuItemId === "uploadAndOpen") {
        console.log('用户选择上传后新标签页打开图片:', info.srcUrl);
        // 从存储中获取匿名上传设置
        chrome.storage.sync.get(['anonymousUpload'], function (data) {
            anonymousUpload = data.anonymousUpload || false;
            handleUpload(info.srcUrl, info.pageUrl, anonymousUpload, true);
        });
    } else if (info.menuItemId === "userUpload") {
        console.log('用户选择用户上传模式:', info.srcUrl);
        handleUpload(info.srcUrl, info.pageUrl, false, false);
    } else if (info.menuItemId === "anonymousUpload") {
        console.log('用户选择匿名上传模式:', info.srcUrl);
        handleUpload(info.srcUrl, info.pageUrl, true, false);
    }
});

// 处理上传逻辑的函数
async function handleUpload(imageUrl, pageUrl, anonymousUpload, openInNewTab) {
    showNotification("兔兔图床上传器", "开始上传图片...");

    try {
        const result = await uploadImage(imageUrl, pageUrl, anonymousUpload);
        if (result.success) {
            console.log('图片上传成功:', result);
            showNotification("上传成功", "图片已成功上传到兔兔图床", 'basic', result.image.url_viewer);
            if (openInNewTab) {
                chrome.tabs.create({ url: result.image.url_viewer });
            } else {
                // 检查是否需要在新标签页中打开图片链接 (仅在非强制打开新标签页的情况下)
                chrome.storage.sync.get(['openNewTab'], function (data) {
                    if (data.openNewTab) {
                        chrome.tabs.create({ url: result.image.url_viewer });
                    }
                });
            }
        } else {
            console.log('图片上传失败:', result.error);
            showNotification("上传失败", result.error);
        }
    } catch (error) {
        console.log('图片上传失败:', error);
        showNotification("上传失败", error.message);
    }
}

async function uploadImage(imageUrl, pageUrl, anonymousUpload = false) {
    console.log(`开始上传图片: ${imageUrl}`);
    console.log(`页面URL: ${pageUrl}`);
    console.log(`上传模式: ${anonymousUpload ? '匿名上传' : '用户上传'}`);

    try {
        const data = await chrome.storage.sync.get("tutuApiKey");
        if (!data.tutuApiKey && !anonymousUpload) {
            showNotification("配置错误", "没有找到 API Key，请先配置");
            throw new Error('没有找到 API Key');
        }

        // 尝试直接获取图片
        let response = await fetch(imageUrl, {
            headers: {
                'Referer': pageUrl,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
            }
        });

        if (!response.ok) {
            console.log(`获取图片失败: ${response.status} ${response.statusText}`);
            console.log("尝试使用URL上传方式");

            // 获取失败，尝试使用URL UPLOADER上传
            response = await fetch(`https://tutu.to/api/2/urlUpload/?key=${data.tutuApiKey}&imgUrl=${imageUrl}&pageUrl=${pageUrl}&anonymousUpload=${anonymousUpload}`);
            if (!response.ok) {
                const errorText = await response.text();
                console.log(`URL上传图片失败: ${response.status} ${response.statusText}`);
                console.log(`错误响应: ${errorText}`);
                throw new Error(`URL上传图片失败: ${response.status} ${response.statusText}`);
            }
        } else {
            const contentType = response.headers.get('Content-Type');
            if (!contentType.startsWith('image/')) {
                throw new Error(`获取的不是图片: ${contentType}`);
            }

            const extension = contentType.split('/')[1];
            const blob = await response.blob();
            const formData = new FormData();
            const fileName = `tutu_Image_Uploader${new Date().getTime()}=${extension}`;
            formData.append('source', blob, fileName);

            showNotification("上传进度", "正在上传图片...");

            response = await fetch(`https://tutu.to/api/2/upload/?key=${data.tutuApiKey}&anonymousUpload=${anonymousUpload}`, {
                method: 'POST',
                body: formData
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.log(`上传图片失败: ${response.status} ${response.statusText}`);
                console.log(`错误响应: ${errorText}`);
                throw new Error(`上传图片失败: ${response.status} ${response.statusText}`);
            }
        }

        const result = await response.json();

        if (result.success) {
            return { success: true, image: result.image };
        } else {
            throw new Error(result.error.message || '上传失败');
        }
    } catch (error) {
        console.log("上传过程中发生错误:", error);
        return { success: false, error: error.message };
    }
}