"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.thari = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
admin.initializeApp();
const db = admin.firestore();
function json(res, data, status = 200) {
    res.status(status).json(data);
}
exports.thari = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    // Strip the Cloud Functions function-name prefix from the path.
    // In production the URL is /<project>/<region>/thari/v/{code}/...
    // req.path already strips /<project>/<region> but still includes /thari.
    const path = req.path.replace(/^\/thari/, "");
    // GET /v/:code — video metadata
    const videoMatch = path.match(/^\/v\/([\w-]+)$/);
    if (videoMatch && req.method === "GET") {
        const code = videoMatch[1];
        const doc = await db.collection("videos").doc(code).get();
        if (!doc.exists) {
            json(res, { error: "Video not found" }, 404);
            return;
        }
        json(res, doc.data());
        return;
    }
    // POST /v/:code/view — increment view count (atomic)
    const viewMatch = path.match(/^\/v\/([\w-]+)\/view$/);
    if (viewMatch && req.method === "POST") {
        const code = viewMatch[1];
        const ref = db.collection("videos").doc(code);
        const doc = await ref.get();
        if (!doc.exists) {
            json(res, { error: "Video not found" }, 404);
            return;
        }
        await ref.update({ view_count: admin.firestore.FieldValue.increment(1) });
        json(res, { ok: true });
        return;
    }
    // GET /v/:code/reactions — list reactions
    const reactionsMatch = path.match(/^\/v\/([\w-]+)\/reactions$/);
    if (reactionsMatch && req.method === "GET") {
        const code = reactionsMatch[1];
        const snapshot = await db
            .collection("videos")
            .doc(code)
            .collection("reactions")
            .orderBy("created_at", "asc")
            .get();
        const reactions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        json(res, reactions);
        return;
    }
    // POST /v/:code/reactions — add reaction
    if (reactionsMatch && req.method === "POST") {
        const code = reactionsMatch[1];
        const { emoji, timestamp } = req.body;
        if (!emoji || typeof timestamp !== "number") {
            json(res, { error: "emoji and timestamp are required" }, 400);
            return;
        }
        const docRef = await db
            .collection("videos")
            .doc(code)
            .collection("reactions")
            .add({
            emoji,
            timestamp,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        const created = await docRef.get();
        json(res, { id: docRef.id, ...created.data() }, 201);
        return;
    }
    json(res, { error: "Not found" }, 404);
});
//# sourceMappingURL=index.js.map