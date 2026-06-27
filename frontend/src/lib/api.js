function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }


export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Helper for fetching
async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  options.credentials = "include"; // Send HTTP-only cookies

  if (!options.headers) {
    options.headers = {};
  }

  if (!(options.body instanceof FormData) && !((options.headers)["Content-Type"])) {
    (options.headers)["Content-Type"] = "application/json";
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    let message = "Request failed";
    try {
      const errData = await response.json();
      message = errData.message || message;
    } catch (e) { }
    throw new Error(message);
  }

  return response.json();
}

// Map backend fields to frontend expected fields (_id -> id, isActive -> active)
function mapUser(backendUser) {
  return {
    id: backendUser._id || backendUser.id,
    username: backendUser.username,
    email: backendUser.email,
    role: backendUser.role,
    active: backendUser.isActive !== undefined ? backendUser.isActive : backendUser.active,
    clientId: backendUser.clientId,
  };
}

function mapClient(backendClient) {
  return {
    id: backendClient._id || backendClient.id,
    name: backendClient.name,
    slug: backendClient.slug,
    website: backendClient.website || "",
    description: backendClient.description || "",
    email: backendClient.email || "",
    createdAt: backendClient.createdAt ? backendClient.createdAt.slice(0, 10) : "",
  };
}

function mapApiKey(backendKey) {
  const canReadAnalytics = Boolean(
    backendKey?.permissions?.canReadAnalytics ??
    _optionalChain([backendKey, 'access', _ => _.permissions, 'optionalAccess', _2 => _2.canReadAnalytics])
  );

  let type = "ingest";
  if (canReadAnalytics) {
    type = "read";
  }
  return {
    id: backendKey.keyId || backendKey.id || backendKey._id,
    keyValue: backendKey.keyValue,
    clientId: backendKey.clientId,
    name: backendKey.name,
    preview: backendKey.keyValue || backendKey.keyId || "apim_****",
    type,
    createdAt: backendKey.createdAt ? backendKey.createdAt.slice(0, 10) : "",
    active: backendKey.isActive !== undefined ? backendKey.isActive : true,
  };
}

function mapDlqMessage(backendMsg) {
  const content = backendMsg.messageContent || {};
  const data = content.data || {};
  return {
    id: backendMsg._id || backendMsg.id,
    service: data.serviceName || content.serviceName || backendMsg.service || "Ingestion Queue",
    endpoint: data.endpoint || content.endpoint || backendMsg.endpoint || "N/A",
    reason: backendMsg.failureReason || backendMsg.reason || "Max retries exceeded",
    status: backendMsg.status || "pending",
    notes: backendMsg.notes || "",
    payload: content,
    createdAt: backendMsg.receivedAt || backendMsg.createdAt || new Date().toISOString(),
  };
}

// 1. Authentication API Namespace
export const authAPI = {
  async onboardSuperAdmin(data) {
    const res = await request("/auth/onboard-super-admin", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return {
      user: mapUser(res.data),
      token: res.token || "",
    };
  },

  async login(data) {
    const res = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: data.username || data.email, // Backend maps 'username' field to lookup
        password: data.password,
      }),
    });
    return mapUser(res.data);
  },

  async getProfile() {
    const res = await request("/auth/profile");
    return mapUser(res.data);
  },

  async logout() {
    await request("/auth/logout", { method: "POST" });
  },

  async getAllUsers() {
    const res = await request("/auth/users");
    return (res.data || []).map(mapUser);
  },

  async deactivateUser(userId) {
    const res = await request(`/auth/users/${userId}/deactivate`, { method: "PATCH" });
    return mapUser(res.data);
  },

  async changePassword(data) {
    await request("/auth/change-password", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
};

// 2. Client Management API Namespace
export const clientAPI = {
  async getAllClients() {
    const res = await request("/admin/clients");
    return (res.data || []).map(mapClient);
  },

  async getClient(clientId) {
    const res = await request(`/admin/clients/${clientId}`);
    return mapClient(res.data);
  },

  async onboardClient(data) {
    const res = await request("/admin/clients/onboard", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return mapClient(res.data);
  },

  async updateClient(clientId, data) {
    const res = await request(`/admin/clients/${clientId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return mapClient(res.data);
  },

  async getClientUsers(clientId) {
    const res = await request(`/admin/clients/${clientId}/users`);
    return (res.data || []).map(mapUser);
  },

  async createClientUser(clientId, data) {
    const res = await request(`/admin/clients/${clientId}/users`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return mapUser(res.data);
  },

  async deactivateClientUser(clientId, userId) {
    const res = await request(`/admin/clients/${clientId}/users/${userId}/deactivate`, {
      method: "PATCH",
    });
    return mapUser(res.data);
  },

  async updatePermissions(clientId, userId, permissions) {
    const res = await request(`/admin/clients/${clientId}/users/${userId}/permissions`, {
      method: "PATCH",
      body: JSON.stringify(permissions),
    });
    return mapUser(res.data);
  },

  async updateUserRole(clientId, userId, role) {
    const res = await request(`/admin/clients/${clientId}/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
    return mapUser(res.data);
  },

  async getApiKeys(clientId) {
    const res = await request(`/admin/clients/${clientId}/api/keys`);
    return (res.data || []).map(mapApiKey);
  },

  async createApiKey(clientId, data) {
    const res = await request(`/admin/clients/${clientId}/api/keys`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return mapApiKey(res.data);
  },

  async revokeApiKey(clientId, keyId) {
    const res = await request(`/admin/clients/${clientId}/api/keys/${keyId}/revoke`, {
      method: "PATCH",
    });
    return mapApiKey(res.data);
  },
};

// 3. Analytics API Namespace (Authed via x-api-key header)
export const analyticsAPI = {
  async getDashboard(apiKey, start, end) {
    const res = await request(`/analytics/dashboard?startTime=${encodeURIComponent(start)}&endTime=${encodeURIComponent(end)}`, {
      headers: { "x-api-key": apiKey },
    });
    return res.data;
  },

  async getTopEndpoints(apiKey, start, end, limit = 5) {
    const res = await request(`/analytics/top-endpoints?startTime=${encodeURIComponent(start)}&endTime=${encodeURIComponent(end)}&limit=${limit}`, {
      headers: { "x-api-key": apiKey },
    });
    return res.data;
  },

  async getStatusDistribution(apiKey, start, end) {
    const res = await request(`/analytics/status-distribution?startTime=${encodeURIComponent(start)}&endTime=${encodeURIComponent(end)}`, {
      headers: { "x-api-key": apiKey },
    });
    return res.data;
  },

  async getResponseTimeDistribution(apiKey, start, end) {
    const res = await request(`/analytics/response-time-distribution?startTime=${encodeURIComponent(start)}&endTime=${encodeURIComponent(end)}`, {
      headers: { "x-api-key": apiKey },
    });
    return res.data;
  },

  async getServiceBreakdown(apiKey, start, end) {
    const res = await request(`/analytics/service-breakdown?startTime=${encodeURIComponent(start)}&endTime=${encodeURIComponent(end)}`, {
      headers: { "x-api-key": apiKey },
    });
    return res.data;
  },

  async getErrorRateTrend(apiKey, start, end) {
    const res = await request(`/analytics/error-rate-trend?startTime=${encodeURIComponent(start)}&endTime=${encodeURIComponent(end)}`, {
      headers: { "x-api-key": apiKey },
    });
    return res.data;
  },

  async getSlowestEndpoints(apiKey, start, end, limit = 5) {
    const res = await request(`/analytics/slowest-endpoints?startTime=${encodeURIComponent(start)}&endTime=${encodeURIComponent(end)}&limit=${limit}`, {
      headers: { "x-api-key": apiKey },
    });
    return res.data;
  },

  async exportAnalytics(data) {
    const res = await request("/analytics/export", {
      method: "POST",
      body: JSON.stringify(data),
    });
    const result = res.data;
    let expiresInSec = 3600;
    if (typeof result.expiresIn === 'number') {
      expiresInSec = result.expiresIn;
    } else if (typeof result.expiresIn === 'string') {
      if (result.expiresIn.includes('hour')) {
        expiresInSec = parseFloat(result.expiresIn) * 3600;
      } else if (result.expiresIn.includes('min')) {
        expiresInSec = parseFloat(result.expiresIn) * 60;
      } else {
        const parsed = parseFloat(result.expiresIn);
        if (!isNaN(parsed)) expiresInSec = parsed;
      }
    }
    return {
      id: result.exportId || uid("exp"),
      clientId: data.clientId,
      records: result.totalRecords || 0,
      status: "Success",
      expiresAt: Date.now() + expiresInSec * 1000,
    };
  },

  async getExportDownloadUrl(exportId) {
    const res = await request(`/analytics/exports/${exportId}/url`);
    return _optionalChain([res, 'access', _3 => _3.data, 'optionalAccess', _4 => _4.downloadUrl]) || "";
  },

  async getExports() {
    const res = await request("/analytics/exports");
    return (res.data || []).map((e) => ({
      id: e.exportId || e._id || e.id,
      clientId: e.clientId,
      records: e.totalRecords || e.records || 0,
      status: "Success",
      expiresAt: new Date(e.createdAt).getTime() + (e.expiresIn || 3600) * 1000,
      downloadUrl: e.downloadUrl || e.url || "",
    }));
  },
};

// 4. DLQ Management API Namespace
export const dlqAPI = {
  async getStats() {
    const res = await request("/dlq/stats");
    return res.data;
  },

  async getMessages(status, limit = 20, skip = 0) {
    const statusQuery = status ? `&status=${status}` : "";
    const res = await request(`/dlq/messages?limit=${limit}&skip=${skip}${statusQuery}`);
    return (res.data || []).map(mapDlqMessage);
  },

  async getMessage(messageId) {
    const res = await request(`/dlq/messages/${messageId}`);
    return mapDlqMessage(res.data);
  },

  async replayMessage(messageId) {
    await request(`/dlq/messages/${messageId}/replay`, { method: "POST" });
  },

  async updateMessage(messageId, status, notes) {
    const res = await request(`/dlq/messages/${messageId}`, {
      method: "PUT",
      body: JSON.stringify({ status, notes }),
    });
    return mapDlqMessage(res.data);
  },

  async deleteMessage(messageId) {
    await request(`/dlq/messages/${messageId}`, { method: "DELETE" });
  },
};

// 5. Ingestion Processor Metrics Namespace
export const processorAPI = {
  async getMetrics() {
    const res = await request("/processor/metrics");
    return res.data;
  },
};

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}