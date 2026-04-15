document.addEventListener('DOMContentLoaded', async () => {
    // Views
    const views = {
        login: document.getElementById('login-view'),
        admin: document.getElementById('admin-view'),
        containers: document.getElementById('containers-view'),
        servers: document.getElementById('servers-view'),
        templates: document.getElementById('templates-view'),
        playground: document.getElementById('playground-view'),
        caddy: document.getElementById('caddy-view'),
        config: document.getElementById('config-view')
    };

    const navLinks = document.querySelectorAll('.nav-link');
    
    // Check Session
    const checkSession = async () => {
        const res = await fetch('/admin/session');
        const data = await res.json();
        if (data.authenticated) {
            showAdmin();
        } else {
            showLogin();
        }
    };

    const showLogin = () => {
        views.login.classList.remove('hidden');
        views.admin.classList.add('hidden');
    };

    const showAdmin = () => {
        views.login.classList.add('hidden');
        views.admin.classList.remove('hidden');
        switchView('containers');
    };

    const switchView = (viewName) => {
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        const view = views[viewName];
        if (view) {
            view.classList.remove('hidden');
        }
        navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewName);
        });
        loadViewData(viewName);
    };

    const loadViewData = (viewName) => {
        if (viewName === 'containers') loadContainers();
        if (viewName === 'servers') loadServers();
        if (viewName === 'templates') loadTemplates();
        if (viewName === 'playground') loadPlayground();
        if (viewName === 'caddy') loadCaddyData();
        if (viewName === 'config') loadConfig();
    };

    // Nav
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const viewName = link.dataset.view;
            if (viewName) {
                e.preventDefault();
                switchView(viewName);
            }
        });
    });

    // Login
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('login-id').value;
        const password = document.getElementById('login-password').value;
        
        const res = await fetch('/admin/login', {
            method: 'POST',
            body: JSON.stringify({ id, password }),
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (res.ok) showAdmin();
        else alert('Login failed');
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        await fetch('/admin/logout', { method: 'POST' });
        showLogin();
    });

    // Config
    const loadConfig = async () => {
        const res = await fetch('/api/config');
        const data = await res.json();
        if (data) {
            document.getElementById('cfg-base-domain').value = data.base_domain || '';
            document.getElementById('cfg-cf-api-key').value = data.cloudflare_api_key || '';
            document.getElementById('cfg-cf-zone-id').value = data.cloudflare_zone_id || '';
            document.getElementById('cfg-target-cname').value = data.target_cname || '';
            document.getElementById('cfg-caddy-path').value = data.caddyfile_path || '';
        }
    };

    document.getElementById('config-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            base_domain: document.getElementById('cfg-base-domain').value,
            cloudflare_api_key: document.getElementById('cfg-cf-api-key').value,
            cloudflare_zone_id: document.getElementById('cfg-cf-zone-id').value,
            target_cname: document.getElementById('cfg-target-cname').value,
            caddyfile_path: document.getElementById('cfg-caddy-path').value,
        };
        await fetch('/api/config', {
            method: 'PUT',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        });
        alert('Config saved');
    });

    // Servers
    const loadServers = async () => {
        const res = await fetch('/api/servers');
        const data = await res.json();
        const tbody = document.querySelector('#servers-table tbody');
        tbody.innerHTML = data.map(s => `
            <tr>
                <td>${s.remote_ip}:${s.port}</td>
                <td><code>${s.api_token}</code></td>
                <td><strong>${s._count?.containers || 0}</strong> / ${s.max_agents}</td>
                <td><span class="status-badge status-active">Online</span></td>
                <td style="text-align:right;"><button class="outline secondary contrast" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="deleteServer('${s.id}')">Delete</button></td>
            </tr>
        `).join('');
    };

    window.deleteServer = async (id) => {
        if (!confirm('Delete server?')) return;
        const res = await fetch(`/api/servers/${id}`, { method: 'DELETE' });
        if (res.ok) loadServers();
        else {
            const err = await res.json();
            alert(err.error || 'Delete failed');
        }
    };

    document.getElementById('add-server-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            remote_ip: document.getElementById('srv-ip').value,
            port: document.getElementById('srv-port').value,
            api_token: document.getElementById('srv-token').value,
            max_agents: document.getElementById('srv-max-agents').value,
        };
        const res = await fetch('/api/servers', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) {
            closeModals();
            loadServers();
        } else {
            const err = await res.json();
            alert(err.error || 'Add failed');
        }
    });

    // Playground
    const loadPlayground = async () => {
        const res = await fetch('/api/containers?limit=100');
        const data = await res.json();
        const activeAgents = data.items.filter(c => c.status === 'active');
        
        const select = document.getElementById('chat-agent-select');
        const currentVal = select.value;
        select.innerHTML = '<option value="">Select an active agent...</option>' + 
            activeAgents.map(a => `<option value="${a.id}" data-domain="${a.domain_name}" data-token="${a.api_token}">${a.domain_name} (${a.slug})</option>`).join('');
        select.value = currentVal;
    };

    const addChatMessage = (role, content) => {
        const container = document.getElementById('chat-messages');
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble chat-${role}`;
        bubble.innerText = content;
        container.appendChild(bubble);
        container.scrollTop = container.scrollHeight;
    };

    document.getElementById('chat-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const select = document.getElementById('chat-agent-select');
        const option = select.selectedOptions[0];
        if (!option || !option.value) {
            alert('Please select an active agent first');
            return;
        }

        const input = document.getElementById('chat-input');
        const content = input.value.trim();
        if (!content) return;

        const domain = option.dataset.domain;
        const token = option.dataset.token;
        const sendBtn = document.getElementById('chat-send-btn');

        addChatMessage('user', content);
        input.value = '';
        
        sendBtn.disabled = true;
        sendBtn.setAttribute('aria-busy', 'true');
        
        const systemMsg = document.createElement('div');
        systemMsg.className = 'chat-bubble chat-system';
        systemMsg.innerText = 'Agent is thinking...';
        document.getElementById('chat-messages').appendChild(systemMsg);

        try {
            // Use backend proxy to avoid CORS issues on localhost
            const res = await fetch(`/api/containers/proxy-chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    domain,
                    token,
                    payload: {
                        model: 'hermes-agent',
                        messages: [{ role: 'user', content }]
                    }
                })
            });

            systemMsg.remove();

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error?.message || `HTTP Error ${res.status}`);
            }

            const data = await res.json();
            const reply = data.choices?.[0]?.message?.content || 'No response received';
            addChatMessage('agent', reply);
        } catch (e) {
            systemMsg.remove();
            addChatMessage('system', `Error: ${e.message}`);
        } finally {
            sendBtn.disabled = false;
            sendBtn.removeAttribute('aria-busy');
        }
    });

    // Caddy
    window.loadCaddyData = async () => {
        const pathDisplay = document.getElementById('caddy-path-display');
        const contentDisplay = document.getElementById('caddy-content-display');
        
        pathDisplay.innerText = 'Loading...';
        contentDisplay.innerText = '';
        
        const res = await fetch('/api/caddy/content');
        const data = await res.json();
        
        if (res.ok) {
            pathDisplay.innerText = `Path: ${data.path}`;
            contentDisplay.innerText = data.content || '# No content in Caddyfile';
        } else {
            pathDisplay.innerText = 'Error loading Caddyfile';
            contentDisplay.innerText = data.error || 'Unknown error';
        }
    };

    // Templates
    const loadTemplates = async () => {
        const res = await fetch('/api/templates');
        const data = await res.json();
        const tbody = document.querySelector('#templates-table tbody');
        tbody.innerHTML = data.map(t => `
            <tr>
                <td><code>${t.id}</code></td>
                <td>${t.display_name}</td>
                <td><small>${t.description || '-'}</small></td>
                <td><span class="status-badge ${t.enabled ? 'status-active' : 'status-stopped'}">${t.enabled ? 'Enabled' : 'Disabled'}</span></td>
                <td style="text-align:right;">
                    <button class="outline secondary" style="padding: 0.2rem 0.5rem; font-size: 0.75rem; margin-right: 0.25rem;" onclick="editTemplate('${t.id}')">Edit</button>
                    <button class="outline secondary contrast" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="deleteTemplate('${t.id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    };

    window.editTemplate = async (id) => {
        const res = await fetch('/api/templates');
        const data = await res.json();
        const template = data.find(t => t.id === id);
        if (template) {
            document.getElementById('tmp-id').value = template.id;
            document.getElementById('tmp-id').readOnly = true;
            document.getElementById('tmp-display-name').value = template.display_name;
            document.getElementById('tmp-description').value = template.description || '';
            document.getElementById('tmp-metadata').value = template.metadata;
            document.getElementById('tmp-enabled').checked = template.enabled;
            modals.addTemplate.showModal();
        }
    };

    window.deleteTemplate = async (id) => {
        if (!confirm('Delete template?')) return;
        const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
        if (res.ok) loadTemplates();
        else {
            const err = await res.json();
            alert(err.error || 'Delete failed');
        }
    };

    document.getElementById('add-template-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            id: document.getElementById('tmp-id').value,
            display_name: document.getElementById('tmp-display-name').value,
            description: document.getElementById('tmp-description').value,
            metadata: document.getElementById('tmp-metadata').value,
            enabled: document.getElementById('tmp-enabled').checked,
        };
        
        const res = await fetch('/api/templates', {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (res.ok) {
            closeModals();
            loadTemplates();
        } else {
            alert('Save failed');
        }
    });

    // Containers
    const loadContainers = async () => {
        const search = document.getElementById('container-search').value;
        const showDeleted = document.getElementById('show-deleted-check').checked;
        
        const params = new URLSearchParams({
            search,
            show_deleted: showDeleted,
            page: 1,
            limit: 50 // Increased for grid view
        });

        const res = await fetch(`/api/containers?${params.toString()}`);
        const data = await res.json();
        const grid = document.getElementById('containers-grid');
        
        grid.innerHTML = data.items.map(c => `
            <article class="container-card" data-id="${c.id}">
                <div class="card-header">
                    <div>
                        <h5 class="domain-title" onclick="copyToClipboard('${c.domain_name}', 'Domain')" title="Click to copy domain" style="cursor: pointer;">${c.domain_name}</h5>
                        <div class="slug-sub">${c.slug}</div>
                    </div>
                    <span class="status-badge status-${c.status}">${c.status}</span>
                </div>
                
                <div class="card-body">
                    <div class="info-item">
                        <span class="info-label">Name</span>
                        <span class="info-value" title="${c.container_name || '-'}">${c.container_name || '-'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Port</span>
                        <span class="info-value">${c.service_port || '-'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Server</span>
                        <span class="info-value" title="${c.server.remote_ip}">${c.server.remote_ip}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Template</span>
                        <span class="info-value" title="${c.template?.display_name || 'Deleted Template'}">${c.template?.display_name || 'N/A'}</span>
                    </div>
                </div>

                <div class="info-item">
                    <span class="info-label">API Key</span>
                    <code class="api-key" onclick="copyToClipboard('${c.api_token}', 'API Key')" title="Click to copy">${c.api_token || 'N/A'}</code>
                </div>

                <div class="card-actions">
                    ${c.status !== 'deleted' ? `
                        <button class="outline secondary" onclick="refreshContainer('${c.id}')" title="Refresh">↻</button>
                        ${c.status === 'active' ? `<button class="outline contrast" onclick="stopContainer('${c.id}')">Stop</button>` : ''}
                        ${c.status === 'stopped' ? `<button class="outline primary" onclick="startContainer('${c.id}')">Start</button>` : ''}
                        <button class="outline contrast" onclick="deleteContainer('${c.id}')" title="Delete">🗑</button>
                    ` : '<div style="flex:1; text-align:center; color:#adb5bd; font-size:0.8rem; padding:0.5rem;">Archived</div>'}
                </div>
            </article>
        `).join('');
    };

    window.copyToClipboard = (text, label = 'Content') => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            alert(`${label} copied to clipboard`);
        });
    };

    document.getElementById('container-search').addEventListener('input', () => loadContainers());
    document.getElementById('show-deleted-check').addEventListener('change', () => loadContainers());

    // Loading State
    const setActionLoading = (id, isLoading) => {
        const card = document.querySelector(`.container-card[data-id="${id}"]`);
        if (!card) return;
        
        const buttons = card.querySelectorAll('.card-actions button');
        buttons.forEach(btn => {
            btn.disabled = isLoading;
            if (isLoading) btn.setAttribute('aria-busy', 'true');
            else btn.removeAttribute('aria-busy');
        });
    };

    window.refreshContainer = async (id) => {
        setActionLoading(id, true);
        try {
            await fetch(`/api/containers/${id}/refresh`, { method: 'POST' });
            await loadContainers();
        } finally {
            setActionLoading(id, false);
        }
    };

    window.stopContainer = async (id) => {
        if (!confirm('Stop this container?')) return;
        setActionLoading(id, true);
        try {
            const res = await fetch(`/api/containers/${id}/stop`, { method: 'POST' });
            if (!res.ok) alert('Failed to stop container');
            await loadContainers();
        } finally {
            setActionLoading(id, false);
        }
    };

    window.startContainer = async (id) => {
        setActionLoading(id, true);
        try {
            const res = await fetch(`/api/containers/${id}/start`, { method: 'POST' });
            if (!res.ok) alert('Failed to start container');
            await loadContainers();
        } finally {
            setActionLoading(id, false);
        }
    };

    window.deleteContainer = async (id) => {
        if (!confirm('Delete this container? This action is permanent.')) return;
        setActionLoading(id, true);
        try {
            const res = await fetch(`/api/containers/${id}`, { method: 'DELETE' });
            if (!res.ok) alert('Failed to delete container');
            await loadContainers();
        } finally {
            setActionLoading(id, false);
        }
    };

    document.getElementById('create-container-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const data = {
            server_id: document.getElementById('create-server-select').value,
            template_id: document.getElementById('create-template-select').value,
        };
        
        submitBtn.disabled = true;
        submitBtn.setAttribute('aria-busy', 'true');
        
        try {
            const res = await fetch('/api/containers', {
                method: 'POST',
                body: JSON.stringify(data),
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                closeModals();
                loadContainers();
            } else {
                const err = await res.json();
                alert(err.error || 'Provision failed');
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.removeAttribute('aria-busy');
        }
    });

    // Modals
    const modals = {
        createContainer: document.getElementById('create-container-modal'),
        addServer: document.getElementById('add-server-modal'),
        addTemplate: document.getElementById('add-template-modal')
    };

    document.getElementById('show-create-modal').addEventListener('click', async () => {
        // Load servers and templates
        const [srvRes, tmpRes] = await Promise.all([
            fetch('/api/servers'),
            fetch('/api/containers/templates')
        ]);
        const servers = await srvRes.json();
        const templates = await tmpRes.json();
        
        const srvSelect = document.getElementById('create-server-select');
        srvSelect.innerHTML = servers.map(s => `<option value="${s.id}">${s.remote_ip}</option>`).join('');
        
        const tmpSelect = document.getElementById('create-template-select');
        tmpSelect.innerHTML = templates.map(t => `<option value="${t.id}">${t.display_name}</option>`).join('');
        
        modals.createContainer.showModal();
    });

    document.getElementById('show-add-server-modal').addEventListener('click', () => {
        modals.addServer.showModal();
    });

    document.getElementById('show-add-template-modal').addEventListener('click', () => {
        document.getElementById('tmp-id').value = '';
        document.getElementById('tmp-id').readOnly = false;
        document.getElementById('tmp-display-name').value = '';
        document.getElementById('tmp-description').value = '';
        document.getElementById('tmp-metadata').value = '{"image": "nousresearch/hermes-agent:latest", "template": "default"}';
        document.getElementById('tmp-enabled').checked = true;
        modals.addTemplate.showModal();
    });

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => closeModals());
    });

    const closeModals = () => {
        Object.values(modals).forEach(m => m.close());
    };

    // Initial load
    checkSession();
    
    // Auto refresh containers
    setInterval(() => {
        if (!views.containers.classList.contains('hidden')) loadContainers();
    }, 5000);
});
