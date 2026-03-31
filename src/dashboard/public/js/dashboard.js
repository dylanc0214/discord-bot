/**
 * Dashboard JavaScript
 * Handles frontend functionality and real-time updates
 */

// Global variables
let currentUser = null;
let currentGuild = null;
let socket = null;
let charts = {};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    await initializeDashboard();
    setupEventListeners();
    initializeSocket();
});

// Initialize dashboard
async function initializeDashboard() {
    showLoading(true);
    
    try {
        // Get current user
        const userResponse = await fetch('/api/user');
        if (!userResponse.ok) {
            window.location.href = '/login';
            return;
        }
        
        const userData = await userResponse.json();
        currentUser = userData.user;
        
        // Update user info
        document.getElementById('user-name').textContent = currentUser.username;
        document.getElementById('user-avatar').src = `https://cdn.discordapp.com/avatars/${currentUser.id}/${currentUser.avatar}.png`;
        
        // Get guilds
        const guildsResponse = await fetch('/api/guilds');
        const guildsData = await guildsResponse.json();
        
        // Populate guild selector
        const guildSelector = document.getElementById('guild-selector');
        guildSelector.innerHTML = '<option value="">Select a server...</option>';
        
        guildsData.guilds.forEach(guild => {
            const option = document.createElement('option');
            option.value = guild.id;
            option.textContent = guild.name;
            guildSelector.appendChild(option);
        });
        
        // Load last selected guild from localStorage
        const lastGuild = localStorage.getItem('selectedGuild');
        if (lastGuild && guildsData.guilds.some(g => g.id === lastGuild)) {
            guildSelector.value = lastGuild;
            await selectGuild(lastGuild);
        }
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showError('Failed to initialize dashboard');
    } finally {
        showLoading(false);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Guild selector
    document.getElementById('guild-selector').addEventListener('change', (e) => {
        const guildId = e.target.value;
        if (guildId) {
            localStorage.setItem('selectedGuild', guildId);
            selectGuild(guildId);
        } else {
            currentGuild = null;
            hideAllSections();
        }
    });
    
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.getAttribute('href').substring(1);
            showSection(section);
        });
    });
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', async () => {
        try {
            await fetch('/logout', { method: 'POST' });
            window.location.href = '/login';
        } catch (error) {
            console.error('Error logging out:', error);
        }
    });
    
    // Member search
    document.getElementById('member-search').addEventListener('input', debounce(() => {
        if (currentGuild) {
            loadMembers(1);
        }
    }, 300));
    
    // Member filter
    document.getElementById('member-filter').addEventListener('change', () => {
        if (currentGuild) {
            loadMembers(1);
        }
    });
}

// Initialize WebSocket
function initializeSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to dashboard WebSocket');
        updateConnectionStatus(true);
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from dashboard WebSocket');
        updateConnectionStatus(false);
    });
    
    socket.on('guild-update', (data) => {
        if (data.guildId === currentGuild?.id) {
            updateGuildStats(data);
        }
    });
    
    socket.on('member-update', (data) => {
        if (data.guildId === currentGuild?.id) {
            updateMemberStats(data);
        }
    });
}

// Select guild
async function selectGuild(guildId) {
    showLoading(true);
    
    try {
        const response = await fetch(`/api/guild/${guildId}/stats`);
        if (!response.ok) {
            throw new Error('Failed to load guild data');
        }
        
        const data = await response.json();
        currentGuild = data.guild;
        
        // Join guild room for real-time updates
        if (socket) {
            socket.emit('join-guild', guildId);
        }
        
        // Update overview
        updateOverview(data);
        
        // Initialize charts
        initializeCharts(data);
        
        // Show overview section
        showSection('overview');
        
    } catch (error) {
        console.error('Error selecting guild:', error);
        showError('Failed to load guild data');
    } finally {
        showLoading(false);
    }
}

// Update overview section
function updateOverview(data) {
    // Server info
    document.getElementById('server-name').textContent = data.guild.name;
    
    // Members
    document.getElementById('member-count').textContent = 
        `${data.members.total} (${data.members.online} online)`;
    
    // Economy
    if (data.economy) {
        document.getElementById('economy-total').textContent = 
            `${data.economy.totalBalance.toLocaleString()} coins`;
    } else {
        document.getElementById('economy-total').textContent = 'Economy disabled';
    }
    
    // Moderation
    if (data.moderation) {
        const totalCases = Object.values(data.moderation).reduce((sum, stat) => sum + (stat.count || 0), 0);
        document.getElementById('moderation-cases').textContent = `${totalCases} cases`;
    } else {
        document.getElementById('moderation-cases').textContent = 'No data';
    }
}

// Initialize charts
function initializeCharts(data) {
    // Activity chart
    const activityCtx = document.getElementById('activity-chart').getContext('2d');
    
    if (charts.activity) {
        charts.activity.destroy();
    }
    
    charts.activity = new Chart(activityCtx, {
        type: 'doughnut',
        data: {
            labels: ['Online', 'Idle', 'DND', 'Offline'],
            datasets: [{
                data: [
                    data.members.online,
                    0, // Idle - would need more detailed data
                    0, // DND - would need more detailed data
                    data.members.total - data.members.online
                ],
                backgroundColor: [
                    '#10b981',
                    '#f59e0b',
                    '#ef4444',
                    '#6b7280'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: 'white'
                    }
                }
            }
        }
    });
    
    // Economy chart
    const economyCtx = document.getElementById('economy-chart').getContext('2d');
    
    if (charts.economy) {
        charts.economy.destroy();
    }
    
    if (data.economy) {
        charts.economy = new Chart(economyCtx, {
            type: 'bar',
            data: {
                labels: ['Total Balance', 'Total Earned', 'Total Spent'],
                datasets: [{
                    label: 'Coins',
                    data: [
                        data.economy.totalBalance,
                        data.economy.totalEarned,
                        data.economy.totalSpent
                    ],
                    backgroundColor: '#f59e0b'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: 'white'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: 'white'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: 'white'
                        }
                    }
                }
            }
        });
    }
}

// Load members
async function loadMembers(page = 1) {
    if (!currentGuild) return;
    
    try {
        const search = document.getElementById('member-search').value;
        const filter = document.getElementById('member-filter').value;
        
        const params = new URLSearchParams({
            page,
            limit: 20,
            search,
            bots: filter === 'bots' ? 'true' : 'false'
        });
        
        const response = await fetch(`/api/guild/${currentGuild.id}/members?${params}`);
        const data = await response.json();
        
        renderMembersTable(data.members);
        renderPagination(data.pagination);
        
    } catch (error) {
        console.error('Error loading members:', error);
        showError('Failed to load members');
    }
}

// Render members table
function renderMembersTable(members) {
    const tbody = document.getElementById('members-table');
    
    if (members.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8">No members found</td></tr>';
        return;
    }
    
    tbody.innerHTML = members.map(member => `
        <tr class="border-b border-white border-opacity-10">
            <td class="py-3 px-4">
                <div class="flex items-center">
                    <img src="${member.avatar}" alt="${member.username}" class="w-8 h-8 rounded-full mr-3">
                    <div>
                        <div class="text-white font-medium">${member.displayName}</div>
                        <div class="text-gray-300 text-sm">${member.username}#${member.discriminator}</div>
                    </div>
                </div>
            </td>
            <td class="py-3 px-4">
                <i class="fas fa-circle status-${member.status}"></i>
            </td>
            <td class="py-3 px-4">
                <div class="text-gray-300 text-sm">${formatDate(member.joinedAt)}</div>
            </td>
            <td class="py-3 px-4">
                <div class="flex flex-wrap gap-1">
                    ${member.roles.slice(0, 3).map(role => 
                        `<span class="px-2 py-1 rounded-full text-xs" style="background-color: ${role.color ? '#' + role.color.toString(16) : '#6b7280'}">${role.name}</span>`
                    ).join('')}
                    ${member.roles.length > 3 ? `<span class="text-gray-400 text-xs">+${member.roles.length - 3} more</span>` : ''}
                </div>
            </td>
            <td class="py-3 px-4">
                <div class="flex space-x-2">
                    <button class="text-blue-400 hover:text-blue-300" onclick="viewMember('${member.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="text-green-400 hover:text-green-300" onclick="manageMember('${member.id}')">
                        <i class="fas fa-cog"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Render pagination
function renderPagination(pagination) {
    const container = document.getElementById('members-pagination');
    
    if (pagination.pages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    if (pagination.hasPrev) {
        html += `<button onclick="loadMembers(${pagination.page - 1})" class="px-3 py-1 bg-white bg-opacity-20 text-white rounded hover:bg-opacity-30">Previous</button>`;
    }
    
    // Page numbers
    const startPage = Math.max(1, pagination.page - 2);
    const endPage = Math.min(pagination.pages, pagination.page + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === pagination.page;
        html += `<button onclick="loadMembers(${i})" class="px-3 py-1 ${isActive ? 'bg-blue-500' : 'bg-white bg-opacity-20'} text-white rounded hover:bg-opacity-30">${i}</button>`;
    }
    
    // Next button
    if (pagination.hasNext) {
        html += `<button onclick="loadMembers(${pagination.page + 1})" class="px-3 py-1 bg-white bg-opacity-20 text-white rounded hover:bg-opacity-30">Next</button>`;
    }
    
    container.innerHTML = html;
}

// Load economy data
async function loadEconomy() {
    if (!currentGuild) return;
    
    showLoading(true);
    
    try {
        const response = await fetch(`/api/guild/${currentGuild.id}/economy`);
        const data = await response.json();
        
        // Update stats
        document.getElementById('total-users').textContent = data.stats.totalUsers.toLocaleString();
        document.getElementById('total-balance').textContent = data.stats.totalBalance.toLocaleString();
        document.getElementById('avg-balance').textContent = Math.floor(data.stats.avgBalance).toLocaleString();
        document.getElementById('total-transactions').textContent = (data.stats.totalEarned + data.stats.totalSpent).toLocaleString();
        
        // Update leaderboard
        renderLeaderboard(data.leaderboard);
        
        // Update shop info
        document.getElementById('shop-total-items').textContent = data.shop.totalItems;
        document.getElementById('shop-in-stock').textContent = data.shop.inStock;
        
    } catch (error) {
        console.error('Error loading economy data:', error);
        showError('Failed to load economy data');
    } finally {
        showLoading(false);
    }
}

// Render leaderboard
function renderLeaderboard(leaderboard) {
    const container = document.getElementById('leaderboard');
    
    if (leaderboard.length === 0) {
        container.innerHTML = '<p class="text-gray-300">No data available</p>';
        return;
    }
    
    container.innerHTML = leaderboard.slice(0, 10).map((user, index) => `
        <div class="flex items-center justify-between p-3 bg-white bg-opacity-10 rounded-lg">
            <div class="flex items-center">
                <span class="text-2xl font-bold text-white mr-3">#${index + 1}</span>
                <div>
                    <div class="text-white font-medium">${user.username}</div>
                    <div class="text-gray-300 text-sm">${user.totalBalance.toLocaleString()} coins</div>
                </div>
            </div>
            <div class="text-right">
                <div class="text-white font-bold">${user.totalBalance.toLocaleString()}</div>
                <div class="text-gray-300 text-xs">Wallet: ${user.balance.toLocaleString()}</div>
            </div>
        </div>
    `).join('');
}

// Load moderation data
async function loadModeration() {
    if (!currentGuild) return;
    
    showLoading(true);
    
    try {
        const response = await fetch(`/api/guild/${currentGuild.id}/moderation`);
        const data = await response.json();
        
        // Update stats
        document.getElementById('mod-total-cases').textContent = Object.values(data.stats).reduce((sum, stat) => sum + (stat.count || 0), 0);
        document.getElementById('mod-warnings').textContent = data.stats.WARN?.count || 0;
        document.getElementById('mod-kicks').textContent = data.stats.KICK?.count || 0;
        document.getElementById('mod-bans').textContent = data.stats.BAN?.count || 0;
        
        // Update settings
        document.getElementById('automod-status').textContent = data.settings.automodEnabled ? 'Enabled' : 'Disabled';
        document.getElementById('active-rules').textContent = data.settings.activeRules;
        document.getElementById('logging-status').textContent = data.settings.loggingEnabled ? 'Enabled' : 'Disabled';
        
        // Update recent cases
        renderRecentCases(data.recentCases);
        
    } catch (error) {
        console.error('Error loading moderation data:', error);
        showError('Failed to load moderation data');
    } finally {
        showLoading(false);
    }
}

// Render recent cases
function renderRecentCases(cases) {
    const container = document.getElementById('recent-cases');
    
    if (cases.length === 0) {
        container.innerHTML = '<p class="text-gray-300">No recent cases</p>';
        return;
    }
    
    container.innerHTML = cases.slice(0, 10).map(case_ => `
        <div class="p-3 bg-white bg-opacity-10 rounded-lg">
            <div class="flex justify-between items-start">
                <div>
                    <div class="text-white font-medium">Case #${case_.caseID} - ${case_.caseType}</div>
                    <div class="text-gray-300 text-sm">${case_.reason}</div>
                    <div class="text-gray-400 text-xs mt-1">
                        ${case_.userTag} • ${formatDate(case_.createdAt)} • ${case_.moderatorTag}
                    </div>
                </div>
                <div class="text-right">
                    <span class="px-2 py-1 rounded-full text-xs ${
                        case_.status === 'ACTIVE' ? 'bg-green-500' : 
                        case_.status === 'EXPIRED' ? 'bg-yellow-500' : 
                        'bg-red-500'
                    } text-white">
                        ${case_.status}
                    </span>
                </div>
            </div>
        </div>
    `).join('');
}

// Show section
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show selected section
    const section = document.getElementById(sectionName);
    if (section) {
        section.classList.remove('hidden');
        
        // Load section-specific data
        switch (sectionName) {
            case 'members':
                loadMembers(1);
                break;
            case 'economy':
                loadEconomy();
                break;
            case 'moderation':
                loadModeration();
                break;
        }
    }
}

// Hide all sections
function hideAllSections() {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
}

// Update connection status
function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connection-status');
    if (connected) {
        statusElement.innerHTML = '<i class="fas fa-circle text-green-400 pulse"></i> Connected';
    } else {
        statusElement.innerHTML = '<i class="fas fa-circle text-red-400"></i> Disconnected';
    }
}

// Show/hide loading overlay
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = show ? 'flex' : 'none';
}

// Show error message
function showError(message) {
    // Create error notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-exclamation-circle mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Placeholder functions for member actions
function viewMember(memberId) {
    console.log('View member:', memberId);
    // TODO: Implement member view modal
}

function manageMember(memberId) {
    console.log('Manage member:', memberId);
    // TODO: Implement member management modal
}
