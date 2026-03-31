# 🔌 API Endpoints - Complete Integration Guide

## 🚀 Quick Start

Your **Only-NONE** bot now has a comprehensive REST API for external service integrations with secure authentication, rate limiting, and full CRUD operations!

## 📋 API Features

### 🔐 Authentication System
- **API Key Management** with secure generation
- **Permission-based access** control
- **Rate limiting** per key and globally
- **Guild-specific access** restrictions
- **Usage tracking** and analytics

### 📊 Data Endpoints
- **User information** and guild memberships
- **Guild statistics** and member data
- **Economy management** with balance operations
- **Moderation cases** and case creation
- **Real-time updates** with WebSocket support

### 🛡️ Security Features
- **Helmet.js** security headers
- **CORS configuration** for origins
- **Rate limiting** and abuse prevention
- **IP whitelisting** options
- **Key rotation** and revocation

## 🔧 Setup Instructions

### 1. Install Dependencies

```bash
npm install helmet cors compression uuid
```

### 2. Environment Configuration

Add these variables to your `.env` file:

```bash
# API Configuration
API_ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com
API_URL=http://localhost:3001
NODE_ENV=development
```

### 3. Create API Keys

Use the Discord command to generate API keys:

```bash
/api create name:"My Integration" permissions:"read,economy" rate-limit:100
```

### 4. Start the Bot

```bash
npm start
```

The API will be available at: `http://localhost:3001/api/v1`

## 🔑 API Key Management

### Creating Keys

```bash
# Basic read-only key
/api create name:"Website Integration" permissions:"read"

# Economy access key
/api create name:"Economy Dashboard" permissions:"read,economy" rate-limit:120

# Full admin key
/api create name:"Admin Panel" permissions:"read,write,economy,moderation,admin" global:true
```

### Managing Keys

```bash
# List your keys
/api list

# Get key details
/api info key:"Website Integration"

# Revoke a key
/api revoke key:"Old Integration"

# Rotate a key (generate new key)
/api rotate key:"Website Integration"

# View usage statistics
/api stats
```

### Key Permissions

- **`read`** - Access to read-only endpoints
- **`write`** - Modify data where applicable
- **`economy`** - Access economy endpoints
- **`moderation`** - Access moderation endpoints
- **`admin`** - Full administrative access

## 🌐 API Endpoints

### Base URL
```
http://localhost:3001/api/v1
```

### Authentication
Include API key in header or parameter:
```bash
# Header (recommended)
curl -H "X-API-Key: your-api-key-here" http://localhost:3001/api/v1/info

# Parameter
curl "http://localhost:3001/api/v1/info?api_key=your-api-key-here"
```

### Core Endpoints

#### Health Check
```bash
GET /health
```
Check API health status.

#### API Information
```bash
GET /info
```
Get API and key information.

#### User Information
```bash
GET /users/{userId}
```
Get user information and guild memberships.

#### Guild List
```bash
GET /guilds
```
Get list of guilds (filtered by API key permissions).

#### Guild Details
```bash
GET /guilds/{guildId}
```
Get detailed guild information including channels, roles, and emojis.

#### Guild Members
```bash
GET /guilds/{guildId}/members?page=1&limit=100&search=username&filter=online
```
Get guild members with pagination and filtering.

### Economy Endpoints

#### Economy Users
```bash
GET /guilds/{guildId}/economy/users?page=1&limit=50&sort=balance&order=desc
```
Get economy users with pagination.

#### User Economy Data
```bash
GET /guilds/{guildId}/economy/user/{userId}
```
Get specific user economy data.

#### Update Balance
```bash
POST /guilds/{guildId}/economy/user/{userId}/balance
Content-Type: application/json

{
  "amount": 1000,
  "type": "add",
  "reason": "Bonus payment"
}
```
Update user balance (requires `economy` permission).

### Moderation Endpoints

#### Moderation Cases
```bash
GET /guilds/{guildId}/moderation/cases?page=1&limit=50&type=WARN&status=ACTIVE
```
Get moderation cases (requires `moderation` permission).

#### Create Case
```bash
POST /guilds/{guildId}/moderation/cases
Content-Type: application/json

{
  "caseType": "WARN",
  "userID": "123456789",
  "userTag": "username#1234",
  "moderatorID": "987654321",
  "moderatorTag": "moderator#5678",
  "reason": "Spamming in general chat",
  "severity": 2,
  "evidence": ["Screenshot of spam messages"]
}
```
Create a new moderation case (requires `moderation` permission).

## 📚 Code Examples

### JavaScript (Node.js)

```javascript
const axios = require('axios');

class BotAPI {
    constructor(baseUrl, apiKey) {
        this.client = axios.create({
            baseURL: baseUrl,
            headers: { 'X-API-Key': apiKey }
        });
    }

    // Get guild information
    async getGuild(guildId) {
        try {
            const response = await this.client.get(`/guilds/${guildId}`);
            return response.data;
        } catch (error) {
            throw new Error(`API Error: ${error.response.data.message}`);
        }
    }

    // Get guild members
    async getMembers(guildId, options = {}) {
        try {
            const response = await this.client.get(`/guilds/${guildId}/members`, {
                params: options
            });
            return response.data;
        } catch (error) {
            throw new Error(`API Error: ${error.response.data.message}`);
        }
    }

    // Update user balance
    async updateBalance(guildId, userId, amount, type, reason) {
        try {
            const response = await this.client.post(
                `/guilds/${guildId}/economy/user/${userId}/balance`,
                { amount, type, reason }
            );
            return response.data;
        } catch (error) {
            throw new Error(`API Error: ${error.response.data.message}`);
        }
    }

    // Create moderation case
    async createCase(guildId, caseData) {
        try {
            const response = await this.client.post(
                `/guilds/${guildId}/moderation/cases`,
                caseData
            );
            return response.data;
        } catch (error) {
            throw new Error(`API Error: ${error.response.data.message}`);
        }
    }
}

// Usage
const api = new BotAPI('http://localhost:3001/api/v1', 'your-api-key');

(async () => {
    try {
        const guild = await api.getGuild('123456789');
        console.log('Guild:', guild.guild.name);
        
        const members = await api.getMembers('123456789', { limit: 10 });
        console.log('Members:', members.members.length);
        
        const result = await api.updateBalance('123456789', '987654321', 1000, 'add', 'Daily bonus');
        console.log('Balance updated:', result.newBalance);
    } catch (error) {
        console.error(error);
    }
})();
```

### Python

```python
import requests
from typing import Dict, List, Optional

class BotAPI:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip('/')
        self.headers = {'X-API-Key': api_key}
    
    def _request(self, method: str, endpoint: str, **kwargs) -> Dict:
        url = f"{self.base_url}{endpoint}"
        response = requests.request(method, url, headers=self.headers, **kwargs)
        
        if response.status_code >= 400:
            error_data = response.json()
            raise Exception(f"API Error: {error_data.get('message', 'Unknown error')}")
        
        return response.json()
    
    def get_guild(self, guild_id: str) -> Dict:
        """Get guild information"""
        return self._request('GET', f'/guilds/{guild_id}')
    
    def get_members(self, guild_id: str, **params) -> Dict:
        """Get guild members"""
        return self._request('GET', f'/guilds/{guild_id}/members', params=params)
    
    def update_balance(self, guild_id: str, user_id: str, amount: int, 
                     type_: str, reason: Optional[str] = None) -> Dict:
        """Update user balance"""
        data = {
            'amount': amount,
            'type': type_
        }
        if reason:
            data['reason'] = reason
        
        return self._request('POST', f'/guilds/{guild_id}/economy/user/{user_id}/balance', json=data)
    
    def create_case(self, guild_id: str, case_data: Dict) -> Dict:
        """Create moderation case"""
        return self._request('POST', f'/guilds/{guild_id}/moderation/cases', json=case_data)

# Usage
api = BotAPI('http://localhost:3001/api/v1', 'your-api-key')

try:
    guild = api.get_guild('123456789')
    print(f"Guild: {guild['guild']['name']}")
    
    members = api.get_members('123456789', limit=10)
    print(f"Members: {len(members['members'])}")
    
    result = api.update_balance('123456789', '987654321', 1000, 'add', 'Daily bonus')
    print(f"Balance updated: {result['newBalance']}")
    
except Exception as e:
    print(f"Error: {e}")
```

### PHP

```php
<?php

class BotAPI {
    private $baseUrl;
    private $apiKey;
    
    public function __construct($baseUrl, $apiKey) {
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->apiKey = $apiKey;
    }
    
    private function request($method, $endpoint, $data = null) {
        $url = $this->baseUrl . $endpoint;
        
        $options = [
            'http' => [
                'method' => $method,
                'header' => "X-API-Key: " . $this->apiKey . "\r\n" .
                           "Content-Type: application/json\r\n",
                'ignore_errors' => true
            ]
        ];
        
        if ($data && in_array($method, ['POST', 'PUT', 'PATCH'])) {
            $options['http']['content'] = json_encode($data);
        }
        
        $context = stream_context_create($options);
        $response = file_get_contents($url, false, $context);
        
        if ($response === false) {
            throw new Exception("API request failed");
        }
        
        $data = json_decode($response, true);
        
        if (isset($data['error'])) {
            throw new Exception("API Error: " . $data['message']);
        }
        
        return $data;
    }
    
    public function getGuild($guildId) {
        return $this->request('GET', "/guilds/$guildId");
    }
    
    public function getMembers($guildId, $params = []) {
        $query = http_build_query($params);
        return $this->request('GET', "/guilds/$guildId/members?$query");
    }
    
    public function updateBalance($guildId, $userId, $amount, $type, $reason = null) {
        $data = [
            'amount' => $amount,
            'type' => $type
        ];
        
        if ($reason) {
            $data['reason'] = $reason;
        }
        
        return $this->request('POST', "/guilds/$guildId/economy/user/$userId/balance", $data);
    }
}

// Usage
$api = new BotAPI('http://localhost:3001/api/v1', 'your-api-key');

try {
    $guild = $api->getGuild('123456789');
    echo "Guild: " . $guild['guild']['name'] . "\n";
    
    $members = $api->getMembers('123456789', ['limit' => 10]);
    echo "Members: " . count($members['members']) . "\n";
    
    $result = $api->updateBalance('123456789', '987654321', 1000, 'add', 'Daily bonus');
    echo "Balance updated: " . $result['newBalance'] . "\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
```

## 📊 Rate Limiting

### Default Limits
- **Per-minute**: 60 requests per API key
- **Per-day**: 10,000 requests per API key
- **Global**: 100 requests per IP per 15 minutes

### Rate Limit Headers
```bash
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1638360000
X-RateLimit-Retry-After: 60
```

### Handling Rate Limits
```javascript
try {
    const response = await api.get('/guilds/123456789');
} catch (error) {
    if (error.response?.status === 429) {
        const retryAfter = error.response.headers['x-rate-limit-retry-after'];
        console.log(`Rate limited. Retry after ${retryAfter} seconds`);
    }
}
```

## 🛡️ Security Best Practices

### API Key Security
1. **Store keys securely** - Use environment variables or secure storage
2. **Rotate keys regularly** - Use `/api rotate` command
3. **Limit permissions** - Grant only necessary permissions
4. **Monitor usage** - Check `/api stats` regularly
5. **Revoke unused keys** - Use `/api revoke` for old keys

### Request Security
1. **Use HTTPS** in production
2. **Validate inputs** before sending to API
3. **Handle errors** gracefully
4. **Implement retry logic** for rate limits
5. **Log API calls** for debugging

### Network Security
1. **IP whitelisting** - Restrict API key IPs
2. **CORS configuration** - Set allowed origins
3. **Request timeouts** - Prevent hanging requests
4. **Request size limits** - Prevent abuse

## 🔧 Advanced Configuration

### Custom Rate Limits
```javascript
// In API key creation
const keyData = {
    name: "High-Volume Integration",
    rateLimit: 1000, // 1000 requests per minute
    dailyLimit: 100000, // 100k requests per day
    allowedIPs: ["192.168.1.100", "10.0.0.50"],
    allowedOrigins: ["https://your-app.com"]
};
```

### Webhook Integration
```javascript
// Example webhook handler for API events
app.post('/webhook/economy', (req, res) => {
    const { event, data } = req.body;
    
    switch (event) {
        case 'balance_updated':
            // Handle balance update
            console.log(`Balance updated for ${data.userId}: ${data.newBalance}`);
            break;
        case 'case_created':
            // Handle new moderation case
            console.log(`New case: ${data.caseType} for ${data.userTag}`);
            break;
    }
    
    res.json({ success: true });
});
```

### Batch Operations
```javascript
// Batch update multiple users
async function batchUpdateBalance(guildId, updates) {
    const results = [];
    
    for (const update of updates) {
        try {
            const result = await api.updateBalance(
                guildId, 
                update.userId, 
                update.amount, 
                update.type, 
                update.reason
            );
            results.push({ userId: update.userId, success: true, result });
        } catch (error) {
            results.push({ userId: update.userId, success: false, error: error.message });
        }
    }
    
    return results;
}
```

## 📱 Integration Examples

### Website Integration
```javascript
// Display server stats on website
async function displayServerStats(guildId) {
    try {
        const [guild, members, economy] = await Promise.all([
            api.getGuild(guildId),
            api.getMembers(guildId, { limit: 1 }),
            api.getEconomyStats(guildId)
        ]);
        
        document.getElementById('server-name').textContent = guild.guild.name;
        document.getElementById('member-count').textContent = guild.guild.memberCount;
        document.getElementById('online-count').textContent = members.pagination.total;
        document.getElementById('total-balance').textContent = economy.stats.totalBalance.toLocaleString();
    } catch (error) {
        console.error('Failed to load server stats:', error);
    }
}
```

### Mobile App Integration
```javascript
// React Native example
import axios from 'axios';

const api = axios.create({
    baseURL: 'https://your-bot-url.com/api/v1',
    headers: { 'X-API-Key': 'your-api-key' }
});

export const BotService = {
    async getGuilds() {
        const response = await api.get('/guilds');
        return response.data.guilds;
    },
    
    async getGuildMembers(guildId, page = 1) {
        const response = await api.get(`/guilds/${guildId}/members`, {
            params: { page, limit: 20 }
        });
        return response.data;
    },
    
    async updateUserBalance(guildId, userId, amount, type, reason) {
        const response = await api.post(`/guilds/${guildId}/economy/user/${userId}/balance`, {
            amount, type, reason
        });
        return response.data;
    }
};
```

## 🔍 Troubleshooting

### Common Issues

#### **Authentication Errors**
```bash
# Check API key validity
curl -H "X-API-Key: your-key" http://localhost:3001/api/v1/info

# Key not found or invalid
{"error": "Invalid API key", "message": "The provided API key is invalid or has been deactivated"}
```

#### **Permission Errors**
```bash
# Missing required permission
{"error": "Insufficient permissions", "message": "This API key does not have economy permissions"}
```

#### **Rate Limit Errors**
```bash
# Rate limit exceeded
{"error": "Rate limit exceeded", "message": "Too many requests from this IP, please try again later.", "retryAfter": 60}
```

#### **Guild Access Errors**
```bash
# No access to guild
{"error": "Access denied", "message": "This API key does not have access to the specified guild"}
```

### Debug Mode
```javascript
// Enable debug logging
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
    console.log('API Request:', method, url, data);
    console.log('API Response:', response.data);
}
```

### Error Handling
```javascript
class APIError extends Error {
    constructor(message, status, data) {
        super(message);
        this.status = status;
        this.data = data;
    }
}

function handleAPIError(error) {
    if (error.response) {
        throw new APIError(
            error.response.data.message,
            error.response.status,
            error.response.data
        );
    } else if (error.request) {
        throw new APIError('Network error', 0, { message: 'No response received' });
    } else {
        throw new APIError('Request error', 0, { message: error.message });
    }
}
```

## 📈 Monitoring & Analytics

### Usage Tracking
```javascript
// Track API usage
const usageStats = {
    requests: 0,
    errors: 0,
    rateLimits: 0,
    endpoints: {}
};

function trackRequest(endpoint, status) {
    usageStats.requests++;
    
    if (status >= 400) {
        usageStats.errors++;
    }
    
    if (status === 429) {
        usageStats.rateLimits++;
    }
    
    usageStats.endpoints[endpoint] = (usageStats.endpoints[endpoint] || 0) + 1;
}
```

### Performance Monitoring
```javascript
// Measure response times
function measureRequestTime(fn) {
    return async (...args) => {
        const start = Date.now();
        try {
            const result = await fn(...args);
            const duration = Date.now() - start;
            console.log(`Request completed in ${duration}ms`);
            return result;
        } catch (error) {
            const duration = Date.now() - start;
            console.error(`Request failed after ${duration}ms:`, error.message);
            throw error;
        }
    };
}
```

---

**Your API endpoints are now ready!** Start integrating external services with your bot's powerful REST API! 🚀
