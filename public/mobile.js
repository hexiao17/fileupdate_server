const API_BASE = '/api';

const dom = {
    appList: document.getElementById('app-list'),
    emptyState: document.getElementById('empty-state'),
    statusText: document.getElementById('status-text'),
    lastUpdated: document.getElementById('last-updated'),
    appFilter: document.getElementById('app-filter'),
    refreshBtn: document.getElementById('refresh-btn'),
    shareBtn: document.getElementById('share-btn')
};

let latestData = {
    apps: [],
    grouped: {}
};

dom.refreshBtn?.addEventListener('click', () => loadData(true));
dom.appFilter?.addEventListener('change', () => renderCards());
dom.shareBtn?.addEventListener('click', sharePage);

document.addEventListener('DOMContentLoaded', () => {
    loadData();
});

async function loadData(isManual = false) {
    if (isManual) {
        dom.statusText.textContent = '正在刷新数据...';
    } else {
        dom.statusText.textContent = '正在连接服务器...';
    }

    toggleLoading(true);

    try {
        const [apps, releases] = await Promise.all([
            fetchJSON(`${API_BASE}/apps`),
            fetchJSON(`${API_BASE}/releases`)
        ]);

        latestData.apps = apps;
        latestData.grouped = groupReleases(releases);

        updateFilterOptions(apps, releases);
        renderCards();

        dom.statusText.textContent = `共 ${releases.length} 条发布记录`;
        dom.lastUpdated.textContent = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
        dom.statusText.textContent = '加载失败，请检查网络';
        dom.lastUpdated.textContent = '';
        dom.appList.innerHTML = createErrorCard(error.message);
        dom.emptyState.hidden = true;
    } finally {
        toggleLoading(false);
    }
}

function toggleLoading(isLoading) {
    dom.refreshBtn.disabled = isLoading;
    dom.refreshBtn.textContent = isLoading ? '刷新中...' : '刷新';
}

async function fetchJSON(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
    }
    return response.json();
}

function groupReleases(releases) {
    const grouped = {};

    releases.forEach(release => {
        const appId = release.appId || 'unknown';
        if (!grouped[appId]) {
            grouped[appId] = {
                appId,
                appName: release.appName || release.appId || '未命名应用',
                versions: []
            };
        }

        let versionGroup = grouped[appId].versions.find(v => v.version === release.version);
        if (!versionGroup) {
            versionGroup = {
                version: release.version || '未指定版本',
                description: release.description || '',
                uploadedAt: release.uploadedAt,
                files: []
            };
            grouped[appId].versions.push(versionGroup);
        }

        versionGroup.files.push(release);
        if (new Date(release.uploadedAt) > new Date(versionGroup.uploadedAt)) {
            versionGroup.uploadedAt = release.uploadedAt;
        }
    });

    Object.values(grouped).forEach(app => {
        app.versions.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    });

    return grouped;
}

function updateFilterOptions(apps, releases) {
    if (!dom.appFilter) return;

    const releasedAppIds = new Set(releases.map(r => r.appId).filter(Boolean));
    const options = ['<option value="">全部应用</option>'];

    apps
        .filter(app => releasedAppIds.has(app.appId))
        .forEach(app => {
            options.push(`<option value="${app.appId}">${app.name}</option>`);
        });

    dom.appFilter.innerHTML = options.join('');
}

function renderCards() {
    const selectedAppId = dom.appFilter?.value;
    const appEntries = Object.values(latestData.grouped)
        .filter(app => !selectedAppId || app.appId === selectedAppId);

    if (appEntries.length === 0) {
        dom.appList.innerHTML = '';
        dom.emptyState.hidden = false;
        return;
    }

    dom.emptyState.hidden = true;
    dom.appList.innerHTML = appEntries
        .map(app => createAppCard(app))
        .join('');
}

function createAppCard(app) {
    const meta = latestData.apps.find(a => a.appId === app.appId);
    const description = meta?.description || '暂无应用描述';
    const latest = app.versions[0];
    const remainingVersions = app.versions.slice(1);

    return `
        <article class="app-card">
            <div class="app-card-header">
                <div class="app-info">
                    <h2>${app.appName}</h2>
                    <p class="app-id">${app.appId}</p>
                </div>
                <span class="chip">最新 · ${latest.version}</span>
            </div>

            <p class="app-description">${description}</p>

            ${createVersionSection(latest)}

            ${remainingVersions.length ? `
                <details>
                    <summary class="more-versions">查看历史版本 (${remainingVersions.length})</summary>
                    <div class="more-version-list">
                        ${remainingVersions.map(createVersionSection).join('')}
                    </div>
                </details>
            ` : ''}
        </article>
    `;
}

function createVersionSection(version) {
    const fileCount = version.files.length;
    const descriptionClass = version.description ? 'version-desc has-content' : 'version-desc';

    return `
        <section class="version-card">
            <div class="version-header">
                <div>
                    <p class="version-label">${version.version}</p>
                    <p class="version-time">${formatDate(version.uploadedAt)}</p>
                </div>
                <span class="version-files">${fileCount} 个文件</span>
            </div>
            <p class="${descriptionClass}">${version.description || ''}</p>
            <div class="files-list">
                ${version.files.map(createFileItem).join('')}
            </div>
        </section>
    `;
}

function createFileItem(file) {
    return `
        <div class="file-item">
            <div class="file-info">
                <p class="file-name">${file.fileName}</p>
                <div class="file-meta">
                    <span>${formatFileSize(file.fileSize)}</span>
                    <span>下载 ${file.downloadCount || 0} 次</span>
                </div>
            </div>
            <a class="download-btn" href="${file.downloadUrl}" download>
                下载
            </a>
        </div>
    `;
}

function createErrorCard(message) {
    return `
        <article class="app-card">
            <h2>加载失败</h2>
            <p class="app-description">${message}</p>
            <button class="download-btn" onclick="loadData(true)">重试</button>
        </article>
    `;
}

function sharePage() {
    if (!navigator.share) {
        alert('当前浏览器暂不支持分享接口，请手动复制链接。');
        return;
    }

    navigator.share({
        title: '应用下载 - 手机版',
        text: '快速获取最新应用版本',
        url: window.location.href
    }).catch(() => {});
}

function formatDate(date) {
    return new Date(date).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatFileSize(bytes = 0) {
    if (!bytes) return '未知大小';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, index)).toFixed(1)} ${units[index]}`;
}

