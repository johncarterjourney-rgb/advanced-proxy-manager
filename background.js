let proxyAuthCredentials = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "setProxy") {
        const { scheme, host, port, username, password } = message.config;

        const proxyConfig = {
            mode: "fixed_servers",
            rules: {
                singleProxy: {
                    scheme: scheme,
                    host: host,
                    port: parseInt(port)
                },
                bypassList: ["localhost", "127.0.0.1", "::1"]
            }
        };

        chrome.proxy.settings.set(
            { value: proxyConfig, scope: "regular" },
            () => {
                if (username && password) {
                    proxyAuthCredentials = { username, password };
                } else {
                    proxyAuthCredentials = null;
                }
                sendResponse({ success: true });
            }
        );
        return true; 
    }

    if (message.action === "clearProxy") {
        chrome.proxy.settings.clear(
            { scope: "regular" },
            () => {
                proxyAuthCredentials = null;
                sendResponse({ success: true });
            }
        );
        return true; 
    }
});

chrome.webRequest.onAuthRequired.addListener(
    (details, callback) => {
        if (details.isProxy && proxyAuthCredentials) {
            callback({ authCredentials: proxyAuthCredentials });
        } else {
            callback({});
        }
    },
    { urls: ["<all_urls>"] },
    ["asyncBlocking"] 
);
