// Spheronix Technology — MongoDB Database client
// Stores applications submitted through the website and provides
// query / aggregation helpers for the admin dashboard.
import { MongoClient, ObjectId } from 'mongodb';

let client = null;
let db = null;
let connectionPromise = null;

const connectionState = {
  connected: false,
  uriType: 'Unknown',
  dbName: '',
  error: null,
  lastChecked: null,
};

export async function connectDb() {
  if (db && connectionState.connected) return db;
  if (connectionPromise) return connectionPromise;

  const rawUri = (process.env.MONGODB_URI || '').trim();
  const uri = rawUri || 'mongodb://127.0.0.1:27017/spheronix';
  const defaultDbName = process.env.MONGODB_DB || 'spheronix';

  connectionState.uriType = uri.startsWith('mongodb+srv://') ? 'MongoDB Atlas' : 'Local / Custom';

  connectionPromise = (async () => {
    try {
      client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
      });
      await client.connect();

      let dbName = defaultDbName;
      try {
        const parsed = new URL(uri.replace(/^mongodb(\+srv)?:\/\//, 'http://'));
        const pathName = parsed.pathname.replace(/^\//, '');
        if (pathName) dbName = pathName;
      } catch {}

      db = client.db(dbName);
      connectionState.connected = true;
      connectionState.dbName = dbName;
      connectionState.error = null;
      connectionState.lastChecked = new Date();

      // Ensure indexes for fast lookups
      const coll = db.collection('applications');
      await coll.createIndex({ created_at: -1 }).catch(() => {});
      await coll.createIndex({ status: 1, program: 1 }).catch(() => {});
      await coll.createIndex({ name: 1, email: 1, phone: 1 }).catch(() => {});

      return db;
    } catch (err) {
      connectionState.connected = false;
      connectionState.error = err.message;
      connectionState.lastChecked = new Date();
      connectionPromise = null;
      throw err;
    }
  })();

  return connectionPromise;
}

export function getDbStatus() {
  return {
    ...connectionState,
    geminiConfigured: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  };
}

function toFilterId(id) {
  if (typeof id === 'string' && ObjectId.isValid(id) && String(new ObjectId(id)) === id) {
    return { $or: [{ _id: new ObjectId(id) }, { id: String(id) }] };
  }
  return { id: String(id) };
}

function formatDoc(d) {
  if (!d) return null;
  return {
    id: d._id.toString(),
    created_at: d.created_at instanceof Date ? d.created_at.toISOString() : (d.created_at || new Date().toISOString()),
    name: d.name || '',
    email: d.email || '',
    phone: d.phone || '',
    program: d.program || '',
    background: d.background || '',
    status: d.status || 'new',
    notes: d.notes || '',
    message: d.message || '',
    source: d.source || '',
  };
}

export async function insertApplication(data) {
  const database = await connectDb();
  const coll = database.collection('applications');
  const now = new Date();

  const doc = {
    name: data.name,
    email: data.email,
    phone: data.phone,
    program: data.program,
    background: data.background || '',
    message: data.message || '',
    source: data.source || '',
    status: 'new',
    notes: '',
    created_at: now,
  };

  const res = await coll.insertOne(doc);
  return { id: res.insertedId.toString() };
}

export async function listApplications({ status = '', program = '', q = '' } = {}) {
  const database = await connectDb();
  const coll = database.collection('applications');

  const filter = {};
  if (status) filter.status = status;
  if (program) filter.program = program;
  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }

  const docs = await coll.find(filter).sort({ created_at: -1, _id: -1 }).limit(1000).toArray();
  return docs.map(formatDoc);
}

export async function getApplication(id) {
  const database = await connectDb();
  const coll = database.collection('applications');
  const doc = await coll.findOne(toFilterId(id));
  return formatDoc(doc);
}

export async function updateApplication(id, { status, notes }) {
  const database = await connectDb();
  const coll = database.collection('applications');
  const update = {};
  if (status !== undefined) update.status = status;
  if (notes !== undefined) update.notes = notes;

  await coll.updateOne(toFilterId(id), { $set: update });
  return getApplication(id);
}

export async function deleteApplication(id) {
  const database = await connectDb();
  const coll = database.collection('applications');
  const res = await coll.deleteOne(toFilterId(id));
  return res.deletedCount > 0;
}

export async function getOverview() {
  const database = await connectDb();
  const coll = database.collection('applications');

  const total = await coll.countDocuments();

  const byStatusRaw = await coll.aggregate([
    { $group: { _id: '$status', n: { $sum: 1 } } },
  ]).toArray();
  const byStatus = byStatusRaw.map((r) => ({ status: r._id || 'new', n: r.n }));

  const byProgramRaw = await coll.aggregate([
    { $group: { _id: '$program', n: { $sum: 1 } } },
  ]).toArray();
  const byProgram = byProgramRaw.map((r) => ({ program: r._id || '', n: r.n }));

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const byDayRaw = await coll.aggregate([
    { $match: { created_at: { $gte: fourteenDaysAgo } } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: { $toDate: '$created_at' },
          },
        },
        n: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]).toArray();
  const byDay = byDayRaw.map((r) => ({ day: r._id, n: r.n }));

  return { total, byStatus, byProgram, byDay };
}

function csvCell(v) {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function getApplicationsCsv() {
  const rows = await listApplications();
  const head = ['id', 'created_at', 'name', 'email', 'phone', 'program', 'background', 'status', 'notes', 'message', 'source'];
  return [head.join(','), ...rows.map((r) => head.map((h) => csvCell(r[h])).join(','))].join('\r\n');
}

