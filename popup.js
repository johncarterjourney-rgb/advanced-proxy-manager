document.addEventListener("DOMContentLoaded", () => {
    const elements = {
        profileName: document.getElementById("profile-name"),
        scheme: document.getElementById("scheme"),
        host: document.getElementById("host"),
        port: document.getElementById("port"),
        username: document.getElementById("username"),
        password: document.getElementById("password"),
        savedProxies: document.getElementById("saved-proxies"),
        btnConnect: document.getElementById("btn-connect"),
        btnDisconnect: document.getElementById("btn-disconnect"),
        btnSave: document.getElementById("btn-save"),
        btnDelete: document.getElementById("btn-delete"),
        btnPing: document.getElementById("btn-ping"),
        statusText: document.getElementById("status-text"),
        statusIndicator: document.getElementById("status-indicator"),
        pingResult: document.getElementById("ping-result"),
        authToggle: document.getElementById("auth-toggle"),
        authFields: document.getElementById("auth-fields")
    };

    let localProxiesList = [];

    // Collapsible Auth Logic
    elements.authToggle.addEventListener("click", () => {
        elements.authFields.classList.toggle("show");
        const isShown = elements.authFields.classList.contains("show");
        elements.authToggle.innerHTML = isShown ? "▼ Authentication (Optional)" : "► Authentication (Optional)";
    });

    // Load Initial Data
    chrome.storage.local.get(["savedProxiesList", "isConnected", "currentProxy"], (result) => {
        if (result.savedProxiesList) {
            localProxiesList = result.savedProxiesList;
            updateDropdown();
        }
        
        if (result.isConnected && result.currentProxy) {
            fillForm(result.currentProxy);
        }
        
        updateStatusUI(result.isConnected);
    });

    // Connect
    elements.btnConnect.addEventListener("click", () => {
        const config = getFormData();
        if (!config.host || !config.port) {
            alert("Error: Host and Port are required.");
            return;
        }

        chrome.runtime.sendMessage({ action: "setProxy", config: config }, (response) => {
            if (response && response.success) {
                chrome.storage.local.set({ isConnected: true, currentProxy: config });
                updateStatusUI(true);
            }
        });
    });

    // Disconnect
    elements.btnDisconnect.addEventListener("click", () => {
        chrome.runtime.sendMessage({ action: "clearProxy" }, (response) => {
            if (response && response.success) {
                chrome.storage.local.set({ isConnected: false });
                updateStatusUI(false);
                elements.pingResult.textContent = "-- ms";
                elements.pingResult.style.color = "#aaaaaa";
            }
        });
    });

    // Save Profile
    elements.btnSave.addEventListener("click", () => {
        const config = getFormData();
        if (!config.host || !config.port) {
            alert("Error: Enter proxy details before saving.");
            return;
        }

        const name = elements.profileName.value.trim() || `${config.scheme.toUpperCase()} - ${config.host}`;
        const newProfile = { id: Date.now().toString(), name, ...config };
        
        localProxiesList = localProxiesList.filter(p => p.name !== name);
        localProxiesList.push(newProfile);

        chrome.storage.local.set({ savedProxiesList: localProxiesList }, () => {
            updateDropdown();
            elements.savedProxies.value = newProfile.id;
        });
    });

    // Delete Profile
    elements.btnDelete.addEventListener("click", () => {
        const selectedId = elements.savedProxies.value;
        if (!selectedId) return;

        localProxiesList = localProxiesList.filter(p => p.id !== selectedId);
        chrome.storage.local.set({ savedProxiesList: localProxiesList }, () => {
            updateDropdown();
            clearForm();
        });
    });

    // Load Profile
    elements.savedProxies.addEventListener("change", (e) => {
        const selectedId = e.target.value;
        const selectedProxy = localProxiesList.find(p => p.id === selectedId);
        if (selectedProxy) fillForm(selectedProxy);
        else clearForm();
    });

    // Quick Presets
    document.querySelectorAll('.preset-badge').forEach(badge => {
        badge.addEventListener('click', (e) => {
            const target = e.target.getAttribute('data-target');
            const value = e.target.getAttribute('data-value');
            
            if (target === 'host') {
                elements.host.value = value;
                if (value.endsWith('.')) elements.host.focus();
            } else if (target === 'port') {
                elements.port.value = value;
                if (value === '10808') elements.scheme.value = 'socks5';
                if (value === '10809') elements.scheme.value = 'http';
            }
        });
    });

    // Ping
    elements.btnPing.addEventListener("click", performPingTest);

    function autoTestPing() {
        elements.pingResult.textContent = "...";
        elements.pingResult.style.color = "#aaaaaa";
        performPingTest();
    }

    async function performPingTest() {
        if (elements.statusIndicator.classList.contains("offline")) return;
        
        const startTime = performance.now();
        elements.pingResult.textContent = "...";
        
        try {
            await fetch("https://www.google.com/generate_204", { method: "HEAD", cache: "no-store", mode: "no-cors" });
            const duration = Math.round(performance.now() - startTime);
            elements.pingResult.textContent = `${duration} ms`;
            elements.pingResult.style.color = duration < 300 ? "#00e676" : "#ffb300";
        } catch (error) {
            elements.pingResult.textContent = "Err";
            elements.pingResult.style.color = "#ff1744";
        }
    }

    // Helpers
    function getFormData() {
        return {
            scheme: elements.scheme.value,
            host: elements.host.value.trim(),
            port: elements.port.value.trim(),
            username: elements.username.value.trim(),
            password: elements.password.value.trim()
        };
    }

    function fillForm(data) {
        elements.profileName.value = data.name || "";
        elements.scheme.value = data.scheme;
        elements.host.value = data.host;
        elements.port.value = data.port;
        elements.username.value = data.username || "";
        elements.password.value = data.password || "";

        // Auto-expand auth fields if credentials exist
        if (data.username || data.password) {
            elements.authFields.classList.add("show");
            elements.authToggle.innerHTML = "▼ Authentication (Optional)";
        } else {
            elements.authFields.classList.remove("show");
            elements.authToggle.innerHTML = "► Authentication (Optional)";
        }
    }

    function clearForm() {
        elements.profileName.value = "";
        elements.host.value = "";
        elements.port.value = "";
        elements.username.value = "";
        elements.password.value = "";
        elements.authFields.classList.remove("show");
        elements.authToggle.innerHTML = "► Authentication (Optional)";
    }

    function updateDropdown() {
        elements.savedProxies.innerHTML = '<option value="">-- Saved Profiles --</option>';
        localProxiesList.forEach(proxy => {
            const option = document.createElement("option");
            option.value = proxy.id;
            option.textContent = proxy.name;
            elements.savedProxies.appendChild(option);
        });
    }

    function updateStatusUI(isConnected) {
        if (isConnected) {
            elements.statusText.textContent = "Connected";
            elements.statusText.style.color = "#00e676";
            elements.statusIndicator.className = "indicator online";
            autoTestPing();
        } else {
            elements.statusText.textContent = "Disconnected";
            elements.statusText.style.color = "#ff1744";
            elements.statusIndicator.className = "indicator offline";
        }
    }
});
