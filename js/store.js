/* =========================================================
   DISTRITO 21 — Capa de datos (store.js) · Supabase + Auth
   Lectura: pública (anon key), vía políticas RLS "for select using (true)".
   Escritura: requiere sesión real de Supabase Auth (auth.uid() en RLS).
   El "apikey" (anon key) identifica el proyecto; el "Authorization"
   lleva el JWT del usuario logueado cuando existe, y si no, el anon key
   (para que las lecturas públicas sigan funcionando sin login).
   ========================================================= */
(function (window) {
  "use strict";

  const CONFIG_KEY = "d21_supabase_config_v1";
  const SESSION_KEY = "d21_auth_session_v1";
  const CURRENCY_PREFIX = "Bs. ";

  // ---------------- Configuración del proyecto ----------------
  function getConfig() {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function setConfig(url, key) {
    const clean = { url: String(url).trim().replace(/\/+$/, ""), key: String(key).trim() };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(clean));
  }
  function clearConfig() {
    localStorage.removeItem(CONFIG_KEY);
  }
  function isConfigured() {
    const c = getConfig();
    return !!(c && c.url && c.key);
  }

  // ---------------- Sesión de Auth (persistida en localStorage) ----------------
  function loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function saveSession(data) {
    if (!data) {
      localStorage.removeItem(SESSION_KEY);
      window.dispatchEvent(new CustomEvent("d21:auth-change"));
      return;
    }
    const session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in || 3600) * 1000,
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    window.dispatchEvent(new CustomEvent("d21:auth-change"));
    return session;
  }

  // ---------------- Helpers ----------------
  function money(n) {
    return CURRENCY_PREFIX + Number(n || 0).toLocaleString("es-BO", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  function slugify(str) {
    return (
      String(str)
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "categoria"
    );
  }

  class SupabaseNotConfiguredError extends Error {
    constructor() {
      super("NOT_CONFIGURED");
      this.code = "NOT_CONFIGURED";
    }
  }
  class AuthRequiredError extends Error {
    constructor(msg) {
      super(msg || "AUTH_REQUIRED");
      this.code = "AUTH_REQUIRED";
    }
  }

  // ---------------- Auth: login / logout / refresh ----------------
  async function authFetch(grantPath, body) {
    const cfg = getConfig();
    if (!cfg) throw new SupabaseNotConfiguredError();
    const res = await fetch(`${cfg.url}/auth/v1/token?grant_type=${grantPath}`, {
      method: "POST",
      headers: { apikey: cfg.key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error_description || json.msg || json.error || "No se pudo autenticar");
    }
    return json;
  }

  async function signIn(email, password) {
    const json = await authFetch("password", { email: email.trim(), password });
    return saveSession(json);
  }

  async function signOut() {
    const session = loadSession();
    const cfg = getConfig();
    if (session && cfg) {
      try {
        await fetch(`${cfg.url}/auth/v1/logout`, {
          method: "POST",
          headers: { apikey: cfg.key, Authorization: `Bearer ${session.access_token}` },
        });
      } catch (e) {
        /* si falla el logout remoto, igual limpiamos la sesión local */
      }
    }
    saveSession(null);
  }

  // Devuelve un access_token válido para el usuario logueado, refrescándolo si
  // está por expirar. Si no hay sesión, devuelve null (llamadas de lectura
  // pública seguirán usando el anon key).
  async function getValidAccessToken() {
    const session = loadSession();
    if (!session) return null;
    const aboutToExpire = session.expires_at - Date.now() < 60 * 1000;
    if (!aboutToExpire) return session.access_token;
    try {
      const json = await authFetch("refresh_token", { refresh_token: session.refresh_token });
      const fresh = saveSession(json);
      return fresh.access_token;
    } catch (e) {
      saveSession(null);
      return null;
    }
  }

  function currentUser() {
    const session = loadSession();
    return session && session.user ? session.user : null;
  }
  function isAuthenticated() {
    const session = loadSession();
    return !!session;
  }

  // ---------------- Cliente REST (PostgREST) ----------------
  async function sb(path, options = {}) {
    const cfg = getConfig();
    if (!cfg) throw new SupabaseNotConfiguredError();
    const token = (await getValidAccessToken()) || cfg.key;
    const res = await fetch(`${cfg.url}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: options.prefer || "return=representation",
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      let msg = `Error ${res.status}`;
      try {
        const j = await res.json();
        msg = j.message || msg;
      } catch (e) {}
      if (res.status === 401 || res.status === 403) throw new AuthRequiredError(msg);
      throw new Error(msg);
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  async function sbCount(path) {
    const cfg = getConfig();
    if (!cfg) throw new SupabaseNotConfiguredError();
    const token = (await getValidAccessToken()) || cfg.key;
    const res = await fetch(`${cfg.url}/rest/v1/${path}`, {
      method: "HEAD",
      headers: { apikey: cfg.key, Authorization: `Bearer ${token}`, Prefer: "count=exact" },
    });
    const range = res.headers.get("content-range");
    if (!range) return 0;
    const total = range.split("/")[1];
    return total === "*" || !total ? 0 : parseInt(total, 10);
  }

  function fireUpdate() {
    window.dispatchEvent(new CustomEvent("d21:update"));
  }

  // ---------------- Mapeo de columnas (DB → app) ----------------
  function mapCategoria(row) {
    return { id: row.id, nombre: row.nombre, slug: row.slug, icono: row.icono };
  }
  function mapProducto(row) {
    return {
      id: row.id,
      nombre: row.nombre,
      categoriaId: row.categoria_id,
      precio: row.precio,
      tallas: row.tallas,
      imagen: row.imagen_url,
      stock: row.stock,
      descripcion: row.descripcion,
      activo: row.activo,
    };
  }

  const Store = {
    money,
    slugify,
    isConfigured,
    getConfig,
    setConfig,
    clearConfig,
    SupabaseNotConfiguredError,
    AuthRequiredError,

    // ---- auth ----
    signIn,
    signOut,
    currentUser,
    isAuthenticated,

    async testConnection() {
      await sb("categorias?select=id&limit=1");
      return true;
    },

    // ---- lectura (pública) ----
    async getCategorias() {
      const rows = await sb("categorias?select=*&order=nombre.asc");
      return rows.map(mapCategoria);
    },
    async getProductos() {
      const rows = await sb("productos?select=*&order=created_at.desc");
      return rows.map(mapProducto);
    },
    async getCategoriaBySlug(slug) {
      const rows = await sb(`categorias?select=*&slug=eq.${encodeURIComponent(slug)}&limit=1`);
      return rows.length ? mapCategoria(rows[0]) : null;
    },
    async getCategoriaById(id) {
      if (!id) return null;
      const rows = await sb(`categorias?select=*&id=eq.${id}&limit=1`);
      return rows.length ? mapCategoria(rows[0]) : null;
    },
    async getProductosPorCategoriaSlug(slug) {
      const cat = await this.getCategoriaBySlug(slug);
      if (!cat) return [];
      const rows = await sb(`productos?select=*&categoria_id=eq.${cat.id}&activo=eq.true&order=created_at.desc`);
      return rows.map(mapProducto);
    },
    async contarProductosPorCategoria(catId) {
      if (!catId) return 0;
      return sbCount(`productos?select=id&categoria_id=eq.${catId}`);
    },

    // ---- categorías (requiere sesión) ----
    async addCategoria(nombre, icono) {
      const base = slugify(nombre);
      let slug = base;
      let i = 2;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const exists = await sb(`categorias?select=id&slug=eq.${encodeURIComponent(slug)}&limit=1`);
        if (!exists.length) break;
        slug = base + "-" + i;
        i++;
      }
      const rows = await sb("categorias", {
        method: "POST",
        body: JSON.stringify({ nombre: nombre.trim(), slug, icono: (icono || "🏷️").trim() }),
      });
      fireUpdate();
      return mapCategoria(rows[0]);
    },
    async updateCategoria(id, { nombre, icono }) {
      const payload = {};
      if (nombre && nombre.trim()) {
        payload.nombre = nombre.trim();
        const base = slugify(nombre);
        let slug = base;
        let i = 2;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const exists = await sb(`categorias?select=id&slug=eq.${encodeURIComponent(slug)}&id=neq.${id}&limit=1`);
          if (!exists.length) break;
          slug = base + "-" + i;
          i++;
        }
        payload.slug = slug;
      }
      if (icono !== undefined && icono.trim()) payload.icono = icono.trim();
      const rows = await sb(`categorias?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(payload) });
      fireUpdate();
      return rows.length ? mapCategoria(rows[0]) : null;
    },
    async deleteCategoria(id) {
      await sb(`productos?categoria_id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ categoria_id: null }) });
      await sb(`categorias?id=eq.${id}`, { method: "DELETE" });
      fireUpdate();
    },

    // ---- productos (requiere sesión) ----
    async addProducto(payload) {
      const body = {
        nombre: (payload.nombre || "").trim(),
        categoria_id: payload.categoriaId || null,
        precio: parseFloat(payload.precio) || 0,
        tallas: (payload.tallas || "").trim(),
        imagen_url: (payload.imagen || "").trim(),
        stock: payload.stock === "" || payload.stock === undefined || payload.stock === null ? null : parseInt(payload.stock, 10),
        descripcion: (payload.descripcion || "").trim(),
        activo: payload.activo !== false,
      };
      const rows = await sb("productos", { method: "POST", body: JSON.stringify(body) });
      fireUpdate();
      return mapProducto(rows[0]);
    },
    async updateProducto(id, payload) {
      const body = {};
      if (payload.nombre !== undefined) body.nombre = payload.nombre.trim();
      if (payload.categoriaId !== undefined) body.categoria_id = payload.categoriaId || null;
      if (payload.precio !== undefined) body.precio = parseFloat(payload.precio) || 0;
      if (payload.tallas !== undefined) body.tallas = payload.tallas.trim();
      if (payload.imagen !== undefined) body.imagen_url = payload.imagen.trim();
      if (payload.stock !== undefined) body.stock = payload.stock === "" ? null : parseInt(payload.stock, 10);
      if (payload.descripcion !== undefined) body.descripcion = payload.descripcion.trim();
      if (payload.activo !== undefined) body.activo = payload.activo;
      const rows = await sb(`productos?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(body) });
      fireUpdate();
      return rows.length ? mapProducto(rows[0]) : null;
    },
    async deleteProducto(id) {
      await sb(`productos?id=eq.${id}`, { method: "DELETE" });
      fireUpdate();
    },

    // ---- imágenes (Supabase Storage, bucket público "productos", subida requiere sesión) ----
    async subirImagen(file) {
      const cfg = getConfig();
      if (!cfg) throw new SupabaseNotConfiguredError();
      const token = (await getValidAccessToken()) || cfg.key;
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const res = await fetch(`${cfg.url}/storage/v1/object/productos/${path}`, {
        method: "POST",
        headers: {
          apikey: cfg.key,
          Authorization: `Bearer ${token}`,
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });
      if (!res.ok) {
        let msg = "No se pudo subir la imagen";
        try {
          const j = await res.json();
          msg = j.message || msg;
        } catch (e) {}
        if (res.status === 401 || res.status === 403) throw new AuthRequiredError(msg);
        throw new Error(msg);
      }
      return `${cfg.url}/storage/v1/object/public/productos/${path}`;
    },

    // ---- exportación ----
    async exportCatalogoTexto() {
      const [categorias, productos] = await Promise.all([this.getCategorias(), this.getProductos()]);
      const lines = ["*CATÁLOGO DISTRITO 21*", ""];
      categorias.forEach((cat) => {
        const items = productos.filter((p) => p.categoriaId === cat.id && p.activo !== false);
        if (items.length === 0) return;
        lines.push(`${cat.icono || "🏷️"} *${cat.nombre.toUpperCase()}*`);
        items.forEach((p) => {
          lines.push(`- ${p.nombre} — ${money(p.precio)}${p.tallas ? " (Tallas: " + p.tallas + ")" : ""}`);
        });
        lines.push("");
      });
      lines.push("📲 Pedidos por WhatsApp");
      return lines.join("\n");
    },
  };

  window.D21Store = Store;
})(window);
