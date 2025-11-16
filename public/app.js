const API_BASE = '/api';
let adminPassword = null;
let isAdmin = false;

// 检查管理员状态
function checkAdminStatus() {
    const savedPassword = localStorage.getItem('adminPassword');
    if (savedPassword) {
        adminPassword = savedPassword;
        isAdmin = true;
        updateUIForAdmin();
    } else {
        isAdmin = false;
        updateUIForUser();
    }
}

// 更新UI为管理员模式
function updateUIForAdmin() {
    // 显示管理员控制，隐藏用户控制
    document.getElementById('admin-controls').style.display = 'flex';
    document.getElementById('user-controls').style.display = 'none';
    document.getElementById('subtitle').textContent = 'Token管理和发布历史';
    
    // 显示所有标签页
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.style.display = 'flex';
    });
    
    // 显示所有标签页内容
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.style.display = content.id === 'releases-tab' ? 'block' : 'none';
    });
    
    // 激活第一个标签页
    tabs[0].classList.add('active');
    document.getElementById('apps-tab').classList.add('active');
}

// 更新UI为普通用户模式
function updateUIForUser() {
    // 隐藏管理员控制，显示用户控制
    document.getElementById('admin-controls').style.display = 'none';
    document.getElementById('user-controls').style.display = 'flex';
    document.getElementById('subtitle').textContent = '应用发布和下载';
    
    // 隐藏管理员专用标签页
    const adminTabs = ['apps', 'tokens', 'publish'];
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        const tabName = tab.getAttribute('data-tab');
        if (adminTabs.includes(tabName)) {
            tab.style.display = 'none';
        } else {
            tab.style.display = 'flex';
        }
    });
    
    // 只显示发布历史标签页
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        if (content.id === 'releases-tab') {
            content.classList.add('active');
            content.style.display = 'block';
        } else {
            content.classList.remove('active');
            content.style.display = 'none';
        }
    });
    
    // 激活发布历史标签页
    const releasesTab = document.querySelector('.tab-btn[data-tab="releases"]');
    if (releasesTab) {
        tabs.forEach(t => t.classList.remove('active'));
        releasesTab.classList.add('active');
    }
}

// 退出管理员登录
function logoutAdmin() {
    if (confirm('确定要退出管理员登录吗？')) {
        localStorage.removeItem('adminPassword');
        adminPassword = null;
        isAdmin = false;
        location.reload();
    }
}

// 管理员登录
function loginAsAdmin() {
    const password = prompt('请输入管理员密码（默认: admin123）:');
    if (password) {
        // 验证密码（通过尝试访问管理员API）
        fetch(`${API_BASE}/admin/tokens`, {
            headers: {
                'x-admin-password': password
            }
        }).then(response => {
            if (response.ok) {
                localStorage.setItem('adminPassword', password);
                location.reload();
            } else {
                alert('管理员密码错误！');
            }
        }).catch(error => {
            alert('登录失败: ' + error.message);
        });
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    checkAdminStatus();
    
    // 设置标签页切换（管理员和普通用户都需要）
    setupTabs();
    
    if (!isAdmin) {
        // 普通用户：直接加载发布历史，无需登录
        loadPublicReleases();
    } else {
        // 管理员：初始化所有功能
        setupAppForm();
        setupTokenForm();
        setupPublishForm();
        loadApps();
        loadTokens();
        loadReleases();
    }
});

// 标签页切换
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            // 检查权限：普通用户不能访问管理员功能
            const adminTabs = ['apps', 'tokens', 'publish'];
            if (!isAdmin && adminTabs.includes(targetTab)) {
                alert('此功能需要管理员权限，请先登录！');
                return;
            }
            
            // 如果按钮被隐藏，不应该触发（双重检查）
            if (btn.style.display === 'none') {
                return;
            }
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const targetContent = document.getElementById(`${targetTab}-tab`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
            
            if (targetTab === 'apps') {
                loadApps();
            } else if (targetTab === 'tokens') {
                loadTokens();
            } else if (targetTab === 'releases') {
                if (isAdmin) {
                    loadReleases();
                } else {
                    loadPublicReleases();
                }
            } else if (targetTab === 'publish') {
                loadAppsForPublish();
            }
        });
    });
}

// 应用表单
function setupAppForm() {
    const form = document.getElementById('app-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const appId = document.getElementById('app-id').value;
        const name = document.getElementById('app-name').value;
        const description = document.getElementById('app-description').value;

        try {
            const response = await fetch(`${API_BASE}/admin/apps`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': adminPassword
                },
                body: JSON.stringify({ appId, name, description })
            });

            const data = await response.json();
            
            if (response.ok) {
                alert('应用创建成功！');
                form.reset();
                loadApps();
                loadAppsForPublish();
            } else {
                alert('错误: ' + data.error);
            }
        } catch (error) {
            alert('请求失败: ' + error.message);
        }
    });
}

// 加载应用列表
async function loadApps() {
    const listDiv = document.getElementById('apps-list');
    listDiv.innerHTML = '<div class="loading">加载中...</div>';

    try {
        const response = await fetch(`${API_BASE}/admin/apps`, {
            headers: {
                'x-admin-password': adminPassword
            }
        });

        const apps = await response.json();
        
        if (apps.length === 0) {
            listDiv.innerHTML = '<div class="loading">暂无应用，请创建一个</div>';
            return;
        }

        listDiv.innerHTML = apps.map(app => `
            <div class="app-item">
                <div class="app-info">
                    <h3>${app.name} <span style="color: #666; font-size: 14px;">(${app.appId})</span></h3>
                    <p>${app.description || '无描述'}</p>
                    <p style="font-size: 12px; color: #999;">
                        创建: ${formatDate(app.createdAt)} | 
                        更新: ${formatDate(app.updatedAt)}
                    </p>
                </div>
                <div class="app-actions">
                    <button class="btn btn-small" onclick="editApp('${app.appId}', '${app.name}', '${(app.description || '').replace(/'/g, "\\'")}')">编辑</button>
                    <button class="btn btn-small btn-danger" onclick="deleteApp('${app.appId}')">删除</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        listDiv.innerHTML = '<div class="loading" style="color: #e74c3c;">加载失败: ' + error.message + '</div>';
    }
}

// 加载应用列表用于发布选择
async function loadAppsForPublish() {
    const select = document.getElementById('publish-app-id');
    
    try {
        const response = await fetch(`${API_BASE}/admin/apps`, {
            headers: {
                'x-admin-password': adminPassword
            }
        });

        const apps = await response.json();
        
        select.innerHTML = '<option value="">请选择应用...</option>' + 
            apps.map(app => `<option value="${app.appId}">${app.name} (${app.appId})</option>`).join('');
    } catch (error) {
        select.innerHTML = '<option value="">加载失败</option>';
    }
}

// 编辑应用
function editApp(appId, name, description) {
    const newName = prompt('请输入新的应用名称:', name);
    if (newName === null) return;
    
    const newDescription = prompt('请输入新的描述:', description);
    if (newDescription === null) return;

    updateApp(appId, newName, newDescription);
}

// 更新应用
async function updateApp(appId, name, description) {
    try {
        const response = await fetch(`${API_BASE}/admin/apps/${appId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-password': adminPassword
            },
            body: JSON.stringify({ name, description })
        });

        const data = await response.json();
        
        if (response.ok) {
            alert('应用更新成功！');
            loadApps();
            loadAppsForPublish();
        } else {
            alert('错误: ' + data.error);
        }
    } catch (error) {
        alert('请求失败: ' + error.message);
    }
}

// 删除应用
async function deleteApp(appId) {
    if (!confirm(`确定要删除应用 ${appId} 吗？此操作不可恢复！`)) return;

    try {
        const response = await fetch(`${API_BASE}/admin/apps/${appId}`, {
            method: 'DELETE',
            headers: {
                'x-admin-password': adminPassword
            }
        });

        const data = await response.json();
        
        if (response.ok) {
            alert('应用已删除');
            loadApps();
            loadAppsForPublish();
        } else {
            alert('错误: ' + data.error);
        }
    } catch (error) {
        alert('请求失败: ' + error.message);
    }
}

// Token表单
function setupTokenForm() {
    const form = document.getElementById('token-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('token-name').value;
        const description = document.getElementById('token-description').value;
        const expiresIn = document.getElementById('token-expires').value;

        try {
            const response = await fetch(`${API_BASE}/admin/tokens`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': adminPassword
                },
                body: JSON.stringify({ name, description, expiresIn })
            });

            const data = await response.json();
            
            if (response.ok) {
                showTokenModal(data.token);
                form.reset();
                loadTokens();
            } else {
                alert('错误: ' + data.error);
            }
        } catch (error) {
            alert('请求失败: ' + error.message);
        }
    });
}

// 发布表单
function setupPublishForm() {
    const form = document.getElementById('publish-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const appId = document.getElementById('publish-app-id').value;
        const version = document.getElementById('publish-version').value;
        const description = document.getElementById('publish-description').value;
        const fileInput = document.getElementById('publish-file');
        
        if (!appId) {
            alert('请选择应用');
            return;
        }
        
        if (!fileInput.files || fileInput.files.length === 0) {
            alert('请选择文件');
            return;
        }

        const formData = new FormData();
        // 添加所有选中的文件
        for (let i = 0; i < fileInput.files.length; i++) {
            formData.append('files', fileInput.files[i]);
        }
        formData.append('appId', appId);
        formData.append('version', version);
        formData.append('description', description);

        const resultDiv = document.getElementById('publish-result');
        resultDiv.className = 'result-message';
        resultDiv.textContent = `发布中... (${fileInput.files.length} 个文件)`;
        resultDiv.classList.add('loading');

        try {
            const response = await fetch(`${API_BASE}/admin/publish`, {
                method: 'POST',
                headers: {
                    'x-admin-password': adminPassword
                },
                body: formData
            });

            const data = await response.json();
            
            if (response.ok) {
                resultDiv.className = 'result-message success';
                resultDiv.textContent = `发布成功！版本: ${data.releases[0].version}，共发布 ${data.releases.length} 个文件`;
                form.reset();
                loadReleases();
            } else {
                resultDiv.className = 'result-message error';
                resultDiv.textContent = '错误: ' + data.error;
            }
        } catch (error) {
            resultDiv.className = 'result-message error';
            resultDiv.textContent = '请求失败: ' + error.message;
        }
    });
}

// 加载Tokens
async function loadTokens() {
    const listDiv = document.getElementById('tokens-list');
    listDiv.innerHTML = '<div class="loading">加载中...</div>';

    try {
        const response = await fetch(`${API_BASE}/admin/tokens`, {
            headers: {
                'x-admin-password': adminPassword
            }
        });

        const tokens = await response.json();
        
        if (tokens.length === 0) {
            listDiv.innerHTML = '<div class="loading">暂无Token，请生成一个</div>';
            return;
        }

        listDiv.innerHTML = tokens.map(token => `
            <div class="token-item">
                <div class="token-info">
                    <h3>${token.name} ${!token.active ? '<span style="color: #e74c3c;">(已禁用)</span>' : ''}</h3>
                    <p>${token.description || '无描述'}</p>
                    <p class="token-code">${token.token}</p>
                    <p style="font-size: 12px; color: #999;">
                        创建: ${formatDate(token.createdAt)} | 
                        使用: ${token.usageCount || 0}次 | 
                        ${token.lastUsed ? '最后使用: ' + formatDate(token.lastUsed) : '从未使用'}
                    </p>
                </div>
                <div class="token-actions">
                    <button class="btn btn-small" onclick="copyTokenToClipboard('${token.token}')">复制Token</button>
                    ${token.active ? `<button class="btn btn-small btn-danger" onclick="disableToken('${token.id}')">禁用</button>` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        listDiv.innerHTML = '<div class="loading" style="color: #e74c3c;">加载失败: ' + error.message + '</div>';
    }
}

// 加载公开的发布历史（普通用户）
async function loadPublicReleases() {
    const listDiv = document.getElementById('releases-list');
    listDiv.innerHTML = '<div class="loading">加载中...</div>';

    try {
        const response = await fetch(`${API_BASE}/releases`);
        const releases = await response.json();
        
        if (releases.length === 0) {
            listDiv.innerHTML = '<div class="loading">暂无发布记录</div>';
            return;
        }

        // 按应用和版本分组
        const releasesByAppAndVersion = {};
        releases.forEach(release => {
            const appId = release.appId || '未分类';
            const version = release.version || '未指定版本';
            const key = `${appId}::${version}`;
            
            if (!releasesByAppAndVersion[key]) {
                releasesByAppAndVersion[key] = {
                    appId: appId,
                    appName: release.appName || appId,
                    version: version,
                    description: release.description || '',
                    uploadedAt: release.uploadedAt,
                    files: []
                };
            }
            releasesByAppAndVersion[key].files.push(release);
        });

        // 按应用分组
        const releasesByApp = {};
        Object.values(releasesByAppAndVersion).forEach(versionGroup => {
            const appId = versionGroup.appId;
            if (!releasesByApp[appId]) {
                releasesByApp[appId] = {
                    appId: appId,
                    appName: versionGroup.appName,
                    versions: []
                };
            }
            releasesByApp[appId].versions.push(versionGroup);
        });

        // 对每个应用的版本按时间排序（最新的在前）
        Object.values(releasesByApp).forEach(app => {
            app.versions.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
        });

        if (Object.keys(releasesByApp).length === 0) {
            listDiv.innerHTML = '<div class="loading">暂无发布记录</div>';
            return;
        }

        listDiv.innerHTML = Object.values(releasesByApp).map(app => `
            <div class="app-group">
                <div class="app-header">
                    <h3 class="app-title">
                        <span class="app-icon">📱</span>
                        ${app.appName}
                        <span class="app-id">(${app.appId})</span>
                    </h3>
                    <span class="app-version-count">共 ${app.versions.length} 个版本</span>
                </div>
                ${app.versions.map(versionGroup => `
                    <div class="release-card">
                        <div class="release-header">
                            <div class="release-title-section">
                                <h2 class="release-version">
                                    <span class="version-tag">${versionGroup.version}</span>
                                    ${versionGroup.files.length > 1 ? `<span class="file-count-badge">${versionGroup.files.length} 个文件</span>` : ''}
                                </h2>
                                <div class="release-meta">
                                    <span class="release-time">${formatDate(versionGroup.uploadedAt)}</span>
                                </div>
                            </div>
                        </div>
                        ${versionGroup.description ? `
                            <div class="release-description">
                                ${versionGroup.description}
                            </div>
                        ` : ''}
                        <div class="release-files">
                            <div class="files-header">文件</div>
                            <div class="files-list">
                                ${versionGroup.files.map(file => `
                                    <div class="file-item">
                                        <div class="file-info">
                                            <span class="file-name">${file.fileName}</span>
                                            <div class="file-meta">
                                                <span class="file-size">${formatFileSize(file.fileSize)}</span>
                                                <span class="file-downloads">下载 ${file.downloadCount || 0} 次</span>
                                            </div>
                                        </div>
                                        <a href="${file.downloadUrl}" class="btn-download" download>
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M8 12V2M8 12L5 9M8 12L11 9M2 13.5h12"/>
                                            </svg>
                                            下载
                                        </a>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('');
    } catch (error) {
        listDiv.innerHTML = '<div class="loading" style="color: #e74c3c;">加载失败: ' + error.message + '</div>';
    }
}

// 加载发布历史（管理员）
async function loadReleases() {
    const listDiv = document.getElementById('releases-list');
    listDiv.innerHTML = '<div class="loading">加载中...</div>';

    try {
        const response = await fetch(`${API_BASE}/admin/releases`, {
            headers: {
                'x-admin-password': adminPassword
            }
        });

        const releases = await response.json();
        
        if (releases.length === 0) {
            listDiv.innerHTML = '<div class="loading">暂无发布记录</div>';
            return;
        }

        // 按应用和版本分组
        const releasesByAppAndVersion = {};
        releases.forEach(release => {
            const appId = release.appId || '未分类';
            const version = release.version || '未指定版本';
            const key = `${appId}::${version}`;
            
            if (!releasesByAppAndVersion[key]) {
                releasesByAppAndVersion[key] = {
                    appId: appId,
                    appName: release.appName || appId,
                    version: version,
                    description: release.description || '',
                    uploadedAt: release.uploadedAt,
                    tokenName: release.tokenName,
                    files: []
                };
            }
            releasesByAppAndVersion[key].files.push(release);
        });

        // 按应用分组
        const releasesByApp = {};
        Object.values(releasesByAppAndVersion).forEach(versionGroup => {
            const appId = versionGroup.appId;
            if (!releasesByApp[appId]) {
                releasesByApp[appId] = {
                    appId: appId,
                    appName: versionGroup.appName,
                    versions: []
                };
            }
            releasesByApp[appId].versions.push(versionGroup);
        });

        // 对每个应用的版本按时间排序（最新的在前）
        Object.values(releasesByApp).forEach(app => {
            app.versions.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
        });

        if (Object.keys(releasesByApp).length === 0) {
            listDiv.innerHTML = '<div class="loading">暂无发布记录</div>';
            return;
        }

        listDiv.innerHTML = Object.values(releasesByApp).map(app => `
            <div class="app-group">
                <div class="app-header">
                    <h3 class="app-title">
                        <span class="app-icon">📱</span>
                        ${app.appName}
                        <span class="app-id">(${app.appId})</span>
                    </h3>
                    <span class="app-version-count">共 ${app.versions.length} 个版本</span>
                </div>
                ${app.versions.map(versionGroup => `
                    <div class="release-card">
                        <div class="release-header">
                            <div class="release-title-section">
                                <h2 class="release-version">
                                    <span class="version-tag">${versionGroup.version}</span>
                                    ${versionGroup.files.length > 1 ? `<span class="file-count-badge">${versionGroup.files.length} 个文件</span>` : ''}
                                </h2>
                                <div class="release-meta">
                                    <span class="release-time">${formatDate(versionGroup.uploadedAt)}</span>
                                    <span class="release-separator">•</span>
                                    <span class="release-token">${versionGroup.tokenName}</span>
                                </div>
                            </div>
                        </div>
                        ${versionGroup.description ? `
                            <div class="release-description">
                                ${versionGroup.description}
                            </div>
                        ` : ''}
                        <div class="release-files">
                            <div class="files-header">文件</div>
                            <div class="files-list">
                                ${versionGroup.files.map(file => `
                                    <div class="file-item">
                                        <div class="file-info">
                                            <span class="file-name">${file.fileName}</span>
                                            <div class="file-meta">
                                                <span class="file-size">${formatFileSize(file.fileSize)}</span>
                                                <span class="file-downloads">下载 ${file.downloadCount || 0} 次</span>
                                            </div>
                                        </div>
                                        <a href="${API_BASE}/download/${file.id}" class="btn-download" download>
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M8 12V2M8 12L5 9M8 12L11 9M2 13.5h12"/>
                                            </svg>
                                            下载
                                        </a>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('');
    } catch (error) {
        listDiv.innerHTML = '<div class="loading" style="color: #e74c3c;">加载失败: ' + error.message + '</div>';
    }
}

// 禁用Token
async function disableToken(id) {
    if (!confirm('确定要禁用此Token吗？')) return;

    try {
        const response = await fetch(`${API_BASE}/admin/tokens/${id}`, {
            method: 'DELETE',
            headers: {
                'x-admin-password': adminPassword
            }
        });

        const data = await response.json();
        
        if (response.ok) {
            alert('Token已禁用');
            loadTokens();
        } else {
            alert('错误: ' + data.error);
        }
    } catch (error) {
        alert('请求失败: ' + error.message);
    }
}

// 显示Token模态框
function showTokenModal(token) {
    document.getElementById('modal-token').textContent = token;
    document.getElementById('token-modal').style.display = 'block';
    window.currentToken = token;
}

// 关闭模态框
function closeModal() {
    document.getElementById('token-modal').style.display = 'none';
    window.currentToken = null;
}

// 复制Token
function copyToken() {
    if (window.currentToken) {
        copyTokenToClipboard(window.currentToken);
    }
}

// 复制Token到剪贴板
function copyTokenToClipboard(token) {
    navigator.clipboard.writeText(token).then(() => {
        alert('Token已复制到剪贴板');
    }).catch(() => {
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = token;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Token已复制到剪贴板');
    });
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// 模态框关闭事件
document.querySelector('.close')?.addEventListener('click', closeModal);
window.onclick = function(event) {
    const modal = document.getElementById('token-modal');
    if (event.target === modal) {
        closeModal();
    }
}

